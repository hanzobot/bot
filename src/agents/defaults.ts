// Defaults for agent metadata when upstream does not supply them.
// Free tier gets zen4, paid tiers upgrade to zen4-pro.
// The zen-gateway routes backends (DO GenAI vs Fireworks) per model.
export const DEFAULT_PROVIDER = "hanzo";
export const DEFAULT_MODEL = "zen4";

// Tier-aware model constants used by commerce middleware.
export const FREE_TIER_MODEL = "zen4";
export const PAID_TIER_MODEL = "zen4-pro";

// Conservative fallback used when model metadata is unavailable.
export const DEFAULT_CONTEXT_TOKENS = 131_000;
