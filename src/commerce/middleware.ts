/**
 * Subscription enforcement middleware for Hanzo Bot gateway.
 *
 * Wraps agent execution handlers to check subscription limits before
 * proceeding and report usage after completion.
 *
 * Integration point: In gateway/server-methods/agent.ts, wrap the
 * agent.message() handler:
 *
 *   import { withSubscriptionCheck } from '../commerce/middleware.js'
 *
 *   // Before:
 *   async function handleAgentMessage(ctx) { ... }
 *
 *   // After:
 *   const handleAgentMessage = withSubscriptionCheck(async (ctx) => { ... })
 */

import { reportUsage } from "./metering.js";
import { checkRateLimit, type RateLimitResult } from "./rate-limiter.js";
import { checkSubscription, type SubscriptionInfo } from "./subscription.js";
import { getUpgradePrompt, formatForChannel } from "./upgrade-prompt.js";

export interface AgentContext {
  userId: string;
  botId: string;
  channel: string;
  model: string;
  message: string;
}

export interface AgentResult {
  response: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

type AgentHandler = (ctx: AgentContext) => Promise<AgentResult>;

/**
 * Wrap an agent execution handler with subscription checking and metering.
 */
export function withSubscriptionCheck(handler: AgentHandler): AgentHandler {
  return async (ctx: AgentContext): Promise<AgentResult> => {
    // 1. Check subscription
    let sub: SubscriptionInfo;
    try {
      sub = await checkSubscription(ctx.userId);
    } catch {
      // If subscription check fails, allow execution (fail open)
      sub = {
        tier: "developer",
        limits: { requestsPerMinute: 60, tokensPerMinute: 100_000, freeCredit: 5 },
        credits: 500,
        active: true,
      };
    }

    // 2. Check if credits exhausted (free tier only)
    if (sub.tier === "developer" && sub.credits <= 0) {
      const msg = getUpgradePrompt({ reason: "credits_exhausted", channel: ctx.channel });
      return {
        response: formatForChannel(msg, ctx.channel),
        promptTokens: 0,
        completionTokens: 0,
        model: ctx.model,
      };
    }

    // 3. Check rate limit
    const rateResult: RateLimitResult = checkRateLimit(ctx.userId, sub.limits);
    if (!rateResult.allowed) {
      const reason = rateResult.reason === "token_limit" ? "token_limit" : "rate_limit";
      const msg = getUpgradePrompt({ reason, resetAt: rateResult.resetAt, channel: ctx.channel });
      return {
        response: formatForChannel(msg, ctx.channel),
        promptTokens: 0,
        completionTokens: 0,
        model: ctx.model,
      };
    }

    // 4. Execute agent
    const result = await handler(ctx);

    // 5. Report usage (non-blocking)
    reportUsage({
      userId: ctx.userId,
      botId: ctx.botId,
      channel: ctx.channel,
      model: result.model || ctx.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });

    return result;
  };
}
