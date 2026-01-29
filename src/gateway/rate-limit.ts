/**
 * Token bucket rate limiter for gateway HTTP requests.
 * Supports per-key (IP, token, org) rate limiting with configurable burst.
 */

export type RateLimitConfig = {
  /** Max tokens in the bucket (burst capacity). */
  maxTokens: number;
  /** Tokens refilled per second. */
  refillRate: number;
  /** Time-to-live for inactive buckets (ms). Default: 10 minutes. */
  bucketTtlMs?: number;
};

type Bucket = {
  tokens: number;
  lastRefill: number;
  lastAccess: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
};

const DEFAULT_BUCKET_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly config: Required<RateLimitConfig>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
      bucketTtlMs: config.bucketTtlMs ?? DEFAULT_BUCKET_TTL_MS,
    };
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Allow Node to exit without waiting for this timer
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  consume(key: string, tokens = 1): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.maxTokens, lastRefill: now, lastAccess: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefill;
    const refillTokens = (elapsedMs / 1000) * this.config.refillRate;
    bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
    bucket.lastAccess = now;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    // Not enough tokens; calculate retry delay
    const deficit = tokens - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / this.config.refillRate) * 1000);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastAccess > this.config.bucketTtlMs) {
        this.buckets.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }
}

/** Default rate limiters for different scopes. */
export type GatewayRateLimiters = {
  /** Per-IP limit for auth endpoints (login, callback). */
  authPerIp: RateLimiter;
  /** Per-token limit for API endpoints. */
  apiPerToken: RateLimiter;
  /** Per-org limit for API endpoints. */
  apiPerOrg: RateLimiter;
};

export function createDefaultRateLimiters(): GatewayRateLimiters {
  return {
    authPerIp: new RateLimiter({ maxTokens: 5, refillRate: 5 / 60 }), // 5 req/min
    apiPerToken: new RateLimiter({ maxTokens: 100, refillRate: 100 / 60 }), // 100 req/min
    apiPerOrg: new RateLimiter({ maxTokens: 500, refillRate: 500 / 60 }), // 500 req/min
  };
}

export function destroyRateLimiters(limiters: GatewayRateLimiters): void {
  limiters.authPerIp.destroy();
  limiters.apiPerToken.destroy();
  limiters.apiPerOrg.destroy();
}
