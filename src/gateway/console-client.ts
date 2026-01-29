/**
 * Hanzo Console API client for billing and usage reporting.
 *
 * Sends usage events to Console's public API for per-org billing attribution.
 * Checks spending limits before processing requests.
 */

import type { UsageEvent } from "./usage-meter.js";

export type ConsoleClientConfig = {
  /** Console API base URL (e.g. https://cloud.hanzo.ai). */
  apiUrl: string;
  /** Console API key for authentication. */
  apiKey: string;
  /** Request timeout in ms (default: 10000). */
  timeoutMs?: number;
};

export type SpendingLimitResult = {
  /** Whether the org is within their spending limit. */
  allowed: boolean;
  /** Current usage in the billing period (USD). */
  currentUsageUsd?: number;
  /** Spending limit (USD). */
  limitUsd?: number;
  /** URL for the org to upgrade their plan. */
  upgradeUrl?: string;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export class ConsoleClient {
  private readonly config: Required<ConsoleClientConfig>;

  constructor(config: ConsoleClientConfig) {
    this.config = {
      apiUrl: config.apiUrl.replace(/\/$/, ""),
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
  }

  /**
   * Send batched usage events to Console for billing attribution.
   * Maps events to Console's trace ingestion format.
   */
  async reportUsage(events: UsageEvent[]): Promise<void> {
    if (events.length === 0) return;

    const traces = events.map((event) => ({
      id: `hanzobot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `hanzobot.${event.type}`,
      timestamp: event.timestamp,
      metadata: {
        source: "hanzobot",
        orgId: event.orgId,
        projectId: event.projectId,
        userId: event.userId,
        agentId: event.agentId,
        model: event.model,
        provider: event.provider,
        ...event.metadata,
      },
      input: event.type === "llm"
        ? { inputTokens: event.inputTokens, outputTokens: event.outputTokens }
        : undefined,
      output: event.type === "llm"
        ? { totalTokens: (event.inputTokens ?? 0) + (event.outputTokens ?? 0) }
        : undefined,
    }));

    const body = JSON.stringify({ batch: traces });

    const res = await fetch(`${this.config.apiUrl}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        "X-Source": "hanzobot",
      },
      body,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Console API error: ${res.status} ${res.statusText}: ${text}`);
    }
  }

  /**
   * Check whether an org is within their spending limit.
   * Returns allowed=true if the check cannot be performed (fail-open).
   */
  async checkSpendingLimit(orgId: string): Promise<SpendingLimitResult> {
    try {
      const res = await fetch(
        `${this.config.apiUrl}/api/public/organizations/${encodeURIComponent(orgId)}/spending`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "X-Source": "hanzobot",
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        },
      );

      if (!res.ok) {
        // Fail open: if we can't check, allow the request
        return { allowed: true };
      }

      const data = (await res.json()) as {
        currentUsageUsd?: number;
        limitUsd?: number;
        exceeded?: boolean;
        upgradeUrl?: string;
      };

      return {
        allowed: !data.exceeded,
        currentUsageUsd: data.currentUsageUsd,
        limitUsd: data.limitUsd,
        upgradeUrl: data.upgradeUrl ?? `${this.config.apiUrl}/settings/billing`,
      };
    } catch {
      // Fail open
      return { allowed: true };
    }
  }
}

/**
 * Create a ConsoleClient from environment variables.
 * Returns null if not configured.
 */
export function createConsoleClientFromEnv(env?: NodeJS.ProcessEnv): ConsoleClient | null {
  const e = env ?? process.env;
  const apiUrl = e.HANZO_CONSOLE_API_URL ?? e.HANZO_CLOUD_API_URL;
  const apiKey = e.HANZO_CONSOLE_API_KEY ?? e.HANZO_CLOUD_API_KEY;
  if (!apiUrl || !apiKey) return null;
  return new ConsoleClient({ apiUrl, apiKey });
}
