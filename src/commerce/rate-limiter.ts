/**
 * Sliding window rate limiter for Hanzo Bot subscription enforcement.
 */

import type { PlanLimits } from "./subscription.js";

interface Window {
  count: number;
  tokens: number;
  windowStart: number;
}

const windows = new Map<string, Window>();
const WINDOW_MS = 60_000; // 1 minute

// Clean up expired entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [key, w] of windows) {
    if (w.windowStart < cutoff) {
      windows.delete(key);
    }
  }
}, 5 * 60_000).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  reason?: string;
}

/**
 * Check if a request is within rate limits for the user's plan.
 */
export function checkRateLimit(
  userId: string,
  limits: PlanLimits,
  tokenCount: number = 0,
): RateLimitResult {
  const now = Date.now();
  const key = userId;

  let window = windows.get(key);
  if (!window || now - window.windowStart >= WINDOW_MS) {
    window = { count: 0, tokens: 0, windowStart: now };
    windows.set(key, window);
  }

  // Enterprise = unlimited
  if (limits.requestsPerMinute === null) {
    window.count++;
    window.tokens += tokenCount;
    return { allowed: true, remaining: Infinity, resetAt: window.windowStart + WINDOW_MS };
  }

  // Check request count
  if (window.count >= limits.requestsPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: window.windowStart + WINDOW_MS,
      reason: "rate_limit",
    };
  }

  // Check token count
  if (limits.tokensPerMinute !== null && window.tokens + tokenCount > limits.tokensPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: window.windowStart + WINDOW_MS,
      reason: "token_limit",
    };
  }

  window.count++;
  window.tokens += tokenCount;

  return {
    allowed: true,
    remaining: limits.requestsPerMinute - window.count,
    resetAt: window.windowStart + WINDOW_MS,
  };
}
