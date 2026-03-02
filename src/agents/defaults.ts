// Defaults for agent metadata when upstream does not supply them.
// Free tier gets claude-sonnet-4-6 (routed to DO GenAI via zen-gateway).
// Paid tiers upgrade to zen4-pro (routed to Fireworks via zen-gateway).
export const DEFAULT_PROVIDER = "hanzo";
export const DEFAULT_MODEL = "claude-sonnet-4-6";

// Tier-aware model constants used by commerce middleware.
export const FREE_TIER_MODEL = "claude-sonnet-4-6";
export const PAID_TIER_MODEL = "zen4-pro";

// Conservative fallback used when model metadata is unavailable.
export const DEFAULT_CONTEXT_TOKENS = 131_000;
