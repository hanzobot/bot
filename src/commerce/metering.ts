/**
 * Commerce API usage metering for Hanzo Bot.
 *
 * Batches meter events and flushes to Commerce /api/v1/billing/meter-events
 * every 10s or when 100 events accumulate. Never blocks agent execution.
 */

const API_BASE = process.env.HANZO_API_URL || "https://api.hanzo.ai";
const API_KEY = process.env.HANZO_API_KEY || "";
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_BATCH_SIZE = 100;

interface MeterEvent {
  meterId: string;
  userId: string;
  value: number;
  timestamp: string;
  idempotency: string;
  dimensions: Record<string, string>;
}

const buffer: MeterEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureTimer() {
  if (flushTimer) {
    return;
  }
  flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
  // Don't keep process alive just for metering
  if (flushTimer && typeof flushTimer === "object" && "unref" in flushTimer) {
    flushTimer.unref();
  }
}

export async function flush(): Promise<void> {
  if (buffer.length === 0) {
    return;
  }

  const events = buffer.splice(0, buffer.length);

  try {
    const res = await fetch(`${API_BASE}/v1/billing/meter-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[commerce/metering] flush failed: ${res.status}`);
    }
  } catch (err) {
    // Best effort — never crash the bot for billing
    console.error("[commerce/metering] flush error:", err);
  }
}

/**
 * Report a bot agent execution to Commerce billing.
 */
export function reportUsage(opts: {
  userId: string;
  botId: string;
  channel: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}): void {
  if (!API_KEY) {
    return;
  } // No API key = metering disabled

  const event: MeterEvent = {
    meterId: "bot-execution",
    userId: opts.userId,
    value: 1,
    timestamp: new Date().toISOString(),
    idempotency: `${opts.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dimensions: {
      bot_id: opts.botId,
      channel: opts.channel,
      model: opts.model,
      prompt_tokens: String(opts.promptTokens),
      completion_tokens: String(opts.completionTokens),
      total_tokens: String(opts.promptTokens + opts.completionTokens),
    },
  };

  buffer.push(event);
  ensureTimer();

  if (buffer.length >= FLUSH_BATCH_SIZE) {
    void flush();
  }
}

/**
 * Report token usage cost to Commerce billing.
 */
export function reportTokenUsage(opts: {
  userId: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
}): void {
  if (!API_KEY) {
    return;
  }

  const event: MeterEvent = {
    meterId: "api-usage",
    userId: opts.userId,
    value: opts.costCents,
    timestamp: new Date().toISOString(),
    idempotency: `${opts.userId}-tok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dimensions: {
      model: opts.model,
      provider: opts.provider,
      prompt_tokens: String(opts.promptTokens),
      completion_tokens: String(opts.completionTokens),
    },
  };

  buffer.push(event);
  ensureTimer();

  if (buffer.length >= FLUSH_BATCH_SIZE) {
    void flush();
  }
}

// Flush on process exit
process.on("beforeExit", () => flush());
