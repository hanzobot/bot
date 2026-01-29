/**
 * Per-tenant usage metering for HanzoBot gateway.
 *
 * Tracks LLM token usage (input/output), message counts, and tool calls.
 * Batches usage reports and flushes to the Console API periodically.
 */

export type UsageEvent = {
  orgId: string;
  projectId?: string;
  userId?: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Event type. */
  type: "llm" | "message" | "tool_call" | "file_process";
  /** Tokens consumed (for LLM events). */
  inputTokens?: number;
  outputTokens?: number;
  /** Model used. */
  model?: string;
  /** Provider (anthropic, openai, etc). */
  provider?: string;
  /** Agent ID that handled the request. */
  agentId?: string;
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
};

export type UsageMeterConfig = {
  /** Flush interval in ms (default: 60000 = 60s). */
  flushIntervalMs?: number;
  /** Max events to buffer before forced flush (default: 100). */
  maxBufferSize?: number;
  /** Callback to send batched events. */
  onFlush: (events: UsageEvent[]) => Promise<void>;
};

const DEFAULT_FLUSH_INTERVAL_MS = 60_000;
const DEFAULT_MAX_BUFFER_SIZE = 100;

export class UsageMeter {
  private buffer: UsageEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly config: Required<Omit<UsageMeterConfig, "onFlush">> & Pick<UsageMeterConfig, "onFlush">;
  private flushing = false;

  constructor(config: UsageMeterConfig) {
    this.config = {
      flushIntervalMs: config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      maxBufferSize: config.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE,
      onFlush: config.onFlush,
    };

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  /** Record a usage event. Triggers flush if buffer exceeds max size. */
  record(event: UsageEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.config.maxBufferSize) {
      void this.flush();
    }
  }

  /** Record LLM token usage. */
  recordLlmUsage(params: {
    orgId: string;
    projectId?: string;
    userId?: string;
    inputTokens: number;
    outputTokens: number;
    model?: string;
    provider?: string;
    agentId?: string;
  }): void {
    this.record({
      orgId: params.orgId,
      projectId: params.projectId,
      userId: params.userId,
      timestamp: new Date().toISOString(),
      type: "llm",
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      model: params.model,
      provider: params.provider,
      agentId: params.agentId,
    });
  }

  /** Record a message event. */
  recordMessage(params: {
    orgId: string;
    userId?: string;
    agentId?: string;
  }): void {
    this.record({
      orgId: params.orgId,
      userId: params.userId,
      timestamp: new Date().toISOString(),
      type: "message",
      agentId: params.agentId,
    });
  }

  /** Flush buffered events to the Console API. */
  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const batch = this.buffer.splice(0);
    try {
      await this.config.onFlush(batch);
    } catch {
      // Re-queue failed events (prepend so they're sent first next time)
      this.buffer.unshift(...batch);
    } finally {
      this.flushing = false;
    }
  }

  /** Stop the flush timer and flush remaining events. */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /** Current buffer size (for monitoring). */
  get pendingEvents(): number {
    return this.buffer.length;
  }
}
