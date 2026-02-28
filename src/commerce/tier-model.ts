/**
 * Tier-to-model mapping for Hanzo Bot.
 *
 * Free tier gets zen4 (routed to DO GenAI / Sonnet 4.6).
 * Paid tiers get zen4-pro (routed to Fireworks / Kimi K2.5).
 *
 * Users see the model name difference — clear reason to upgrade.
 * The zen-gateway handles actual backend routing.
 */

import type { PlanTier } from "./subscription.js";
import { DEFAULT_PROVIDER, FREE_TIER_MODEL, PAID_TIER_MODEL } from "../agents/defaults.js";

export interface TierModelRef {
  provider: string;
  model: string;
}

const TIER_MODEL_MAP: Record<PlanTier, TierModelRef> = {
  developer: { provider: DEFAULT_PROVIDER, model: FREE_TIER_MODEL },
  pro: { provider: DEFAULT_PROVIDER, model: PAID_TIER_MODEL },
  team: { provider: DEFAULT_PROVIDER, model: PAID_TIER_MODEL },
  enterprise: { provider: DEFAULT_PROVIDER, model: PAID_TIER_MODEL },
};

/**
 * Return the default model ref for a given subscription tier.
 */
export function resolveTierDefaultModel(tier: PlanTier): TierModelRef {
  return TIER_MODEL_MAP[tier] ?? TIER_MODEL_MAP.developer;
}

/**
 * Determine if the current model should be upgraded based on tier.
 *
 * Only upgrades when the user is on a paid tier AND still on the
 * free-tier default (zen4). If they explicitly picked a model, respect that.
 */
export function shouldUpgradeModel(params: {
  tier: PlanTier;
  currentModel: string;
}): TierModelRef | null {
  if (params.tier === "developer") {
    return null;
  }

  // Extract model id from "provider/model" or bare "model".
  const parts = params.currentModel.split("/");
  const modelId = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  // Only upgrade if still on the free-tier default.
  if (modelId !== FREE_TIER_MODEL) {
    return null;
  }

  return TIER_MODEL_MAP[params.tier] ?? null;
}
