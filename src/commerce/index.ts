/**
 * Commerce integration for Hanzo Bot.
 *
 * Provides billing metering, subscription enforcement, tier-based model
 * routing, and upgrade prompts.
 */

export { reportUsage, reportTokenUsage, flush } from "./metering.js";
export { checkSubscription, invalidateCache, getPlanLimits } from "./subscription.js";
export type { SubscriptionInfo, PlanTier, PlanLimits } from "./subscription.js";
export { checkRateLimit } from "./rate-limiter.js";
export type { RateLimitResult } from "./rate-limiter.js";
export { withSubscriptionCheck } from "./middleware.js";
export type { AgentContext, AgentResult } from "./middleware.js";
export { resolveTierDefaultModel, shouldUpgradeModel } from "./tier-model.js";
export type { TierModelRef } from "./tier-model.js";
export { getUpgradePrompt, formatForChannel } from "./upgrade-prompt.js";
