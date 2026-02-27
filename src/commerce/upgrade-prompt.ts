/**
 * Upgrade prompts for Hanzo Bot when subscription limits are reached.
 */

export type LimitReason = "rate_limit" | "token_limit" | "credits_exhausted";

interface UpgradePromptOpts {
  reason: LimitReason;
  resetAt?: number;
  channel?: string;
}

const PRICING_URL = "https://hanzo.ai/pricing";
const TRYFREE_CODE = "TRYFREE";

const MESSAGES: Record<LimitReason, string> = {
  rate_limit:
    `You've hit your request limit for this minute. ` +
    `Upgrade your plan for higher limits: ${PRICING_URL}`,

  token_limit:
    `You've reached your token limit for this minute. ` +
    `Upgrade to Pro ($49/mo) or Team ($25/mo) for more capacity: ${PRICING_URL}`,

  credits_exhausted:
    `Your free credits have been used up. ` +
    `Use code **${TRYFREE_CODE}** for $5 more, or upgrade your plan: ${PRICING_URL}`,
};

/**
 * Get a human-readable upgrade prompt for the given limit reason.
 */
export function getUpgradePrompt(opts: UpgradePromptOpts): string {
  const base = MESSAGES[opts.reason] ?? MESSAGES.credits_exhausted;

  if (opts.reason === "rate_limit" && opts.resetAt) {
    const seconds = Math.max(1, Math.ceil((opts.resetAt - Date.now()) / 1000));
    return `${base}\n\nRate limit resets in ${seconds}s.`;
  }

  return base;
}

/**
 * Format upgrade prompt for specific channel types.
 */
export function formatForChannel(message: string, channel: string): string {
  switch (channel) {
    case "discord":
      // Discord supports markdown
      return message;
    case "slack":
      // Slack uses mrkdwn: **bold** → *bold*
      return message.replace(/\*\*(.*?)\*\*/g, "*$1*");
    case "telegram":
      // Telegram supports markdown
      return message;
    case "whatsapp":
    case "signal":
    case "imessage":
      // Plain text: strip markdown
      return message.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    default:
      return message;
  }
}
