/**
 * Commerce subscription tier checking for Hanzo Bot.
 *
 * Fetches and caches user subscription status from Commerce API.
 */

const API_BASE = process.env.HANZO_API_URL || "https://api.hanzo.ai";
const API_KEY = process.env.HANZO_API_KEY || "";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type PlanTier = "developer" | "pro" | "team" | "enterprise";

export interface PlanLimits {
  requestsPerMinute: number | null;
  tokensPerMinute: number | null;
  freeCredit: number;
}

export interface SubscriptionInfo {
  tier: PlanTier;
  limits: PlanLimits;
  credits: number; // remaining cents
  active: boolean;
}

// Embedded plan defaults (from @hanzo/plans/subscription.json)
const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  developer: { requestsPerMinute: 60, tokensPerMinute: 100_000, freeCredit: 5 },
  pro: { requestsPerMinute: 500, tokensPerMinute: 1_000_000, freeCredit: 0 },
  team: { requestsPerMinute: 2_000, tokensPerMinute: 5_000_000, freeCredit: 0 },
  enterprise: { requestsPerMinute: null, tokensPerMinute: null, freeCredit: 0 },
};

interface CacheEntry {
  info: SubscriptionInfo;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.developer;
}

/**
 * Fetch user subscription from Commerce API (with 5-min cache).
 */
export async function checkSubscription(userId: string): Promise<SubscriptionInfo> {
  // Check cache
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.info;
  }

  // Default fallback
  const fallback: SubscriptionInfo = {
    tier: "developer",
    limits: PLAN_LIMITS.developer,
    credits: 500, // $5 free credit in cents
    active: true,
  };

  if (!API_KEY) {
    return fallback;
  }

  try {
    const [subRes, creditsRes] = await Promise.all([
      fetch(`${API_BASE}/v1/user/${userId}/subscription`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`${API_BASE}/v1/billing/credit-grants?userId=${userId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        signal: AbortSignal.timeout(3000),
      }),
    ]);

    let tier: PlanTier = "developer";
    if (subRes.ok) {
      const sub = await subRes.json();
      tier = (sub.planId || sub.plan || "developer") as PlanTier;
    }

    let credits = 0;
    if (creditsRes.ok) {
      const grants = await creditsRes.json();
      if (Array.isArray(grants)) {
        credits = grants.reduce(
          (sum: number, g: { remainingCents?: number; voided?: boolean }) =>
            sum + (g.voided ? 0 : (g.remainingCents ?? 0)),
          0,
        );
      }
    }

    const info: SubscriptionInfo = {
      tier,
      limits: getPlanLimits(tier),
      credits,
      active: tier !== "developer" || credits > 0,
    };

    cache.set(userId, { info, fetchedAt: Date.now() });
    return info;
  } catch (err) {
    console.error("[commerce/subscription] fetch error:", err);
    return fallback;
  }
}

/**
 * Invalidate cached subscription for a user (e.g., after upgrade).
 */
export function invalidateCache(userId: string): void {
  cache.delete(userId);
}
