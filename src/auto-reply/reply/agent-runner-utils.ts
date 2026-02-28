import type { NormalizedUsage } from "../../agents/usage.js";
import type { ChannelId, ChannelThreadingToolContext } from "../../channels/plugins/types.js";
import type { BotConfig } from "../../config/config.js";
import type { TemplateContext } from "../templating.js";
import type { ReplyPayload } from "../types.js";
import type { FollowupRun } from "./queue.js";

// ---------------------------------------------------------------------------
// Helpers extracted from agent-runner (exposed for agent-runner-execution and
// followup-runner to avoid circular dependencies).
// ---------------------------------------------------------------------------

/** Resolve auth profile overrides from a run object for a given provider. */
export function resolveRunAuthProfile(
  run: FollowupRun["run"],
  provider: string,
): { authProfileId?: string; authProfileIdSource?: "auto" | "user" } {
  if (!run.authProfileId) {
    return {};
  }
  // Only apply the stored profile id when it matches the provider prefix.
  const profileProvider = run.authProfileId.split(":")[0];
  if (profileProvider && profileProvider !== provider && run.authProfileId.includes(":")) {
    return {};
  }
  return {
    authProfileId: run.authProfileId,
    authProfileIdSource: run.authProfileIdSource,
  };
}

/** Resolve model fallback options from a run object for runWithModelFallback. */
export function resolveModelFallbackOptions(run: FollowupRun["run"]): {
  cfg: BotConfig | undefined;
  provider: string;
  model: string;
  agentDir?: string;
} {
  return {
    cfg: run.config,
    provider: run.provider,
    model: run.model,
    agentDir: run.agentDir,
  };
}

/** Build embedded run context objects from a run and session context. */
export function buildEmbeddedRunContexts(params: {
  run: FollowupRun["run"];
  sessionCtx: TemplateContext;
  hasRepliedRef?: { value: boolean };
  provider: string;
}): {
  authProfile: { authProfileId?: string; authProfileIdSource?: "auto" | "user" };
  embeddedContext: {
    sessionId: string;
    sessionKey?: string;
    agentId?: string;
    sessionFile: string;
    workspaceDir: string;
    agentDir?: string;
    config?: BotConfig;
    skillsSnapshot?: FollowupRun["run"]["skillsSnapshot"];
    messageProvider?: string;
    agentAccountId?: string;
    hasRepliedRef?: { value: boolean };
  };
  senderContext: {
    senderId?: string;
    senderName?: string;
    senderUsername?: string;
    senderE164?: string;
    senderIsOwner?: boolean;
  };
} {
  const authProfile = resolveRunAuthProfile(params.run, params.provider);
  const embeddedContext = {
    sessionId: params.run.sessionId,
    sessionKey: params.run.sessionKey,
    agentId: params.run.agentId,
    sessionFile: params.run.sessionFile,
    workspaceDir: params.run.workspaceDir,
    agentDir: params.run.agentDir,
    config: params.run.config,
    skillsSnapshot: params.run.skillsSnapshot,
    messageProvider: params.run.messageProvider,
    agentAccountId: params.run.agentAccountId,
    hasRepliedRef: params.hasRepliedRef,
  };
  const senderContext = {
    senderId: params.run.senderId,
    senderName: params.run.senderName,
    senderUsername: params.run.senderUsername,
    senderE164: params.run.senderE164,
    senderIsOwner: params.run.senderIsOwner,
  };
  return { authProfile, embeddedContext, senderContext };
}

/** Build base run params for runEmbeddedPiAgent. */
export function buildEmbeddedRunBaseParams(params: {
  run: FollowupRun["run"];
  provider: string;
  model: string;
  runId: string;
  authProfile: { authProfileId?: string; authProfileIdSource?: "auto" | "user" };
}): {
  provider: string;
  model: string;
  runId: string;
  authProfileId?: string;
  authProfileIdSource?: "auto" | "user";
  thinkLevel?: FollowupRun["run"]["thinkLevel"];
  verboseLevel?: FollowupRun["run"]["verboseLevel"];
  reasoningLevel?: FollowupRun["run"]["reasoningLevel"];
  timeoutMs: number;
  blockReplyBreak: FollowupRun["run"]["blockReplyBreak"];
  ownerNumbers?: string[];
  execOverrides?: FollowupRun["run"]["execOverrides"];
  bashElevated?: FollowupRun["run"]["bashElevated"];
  enforceFinalTag?: boolean;
} {
  return {
    provider: params.provider,
    model: params.model,
    runId: params.runId,
    ...params.authProfile,
    thinkLevel: params.run.thinkLevel,
    verboseLevel: params.run.verboseLevel,
    reasoningLevel: params.run.reasoningLevel,
    timeoutMs: params.run.timeoutMs,
    blockReplyBreak: params.run.blockReplyBreak,
    ownerNumbers: params.run.ownerNumbers,
    execOverrides: params.run.execOverrides,
    bashElevated: params.run.bashElevated,
    enforceFinalTag: params.run.enforceFinalTag,
  };
}
import { getChannelDock } from "../../channels/dock.js";
import { normalizeAnyChannelId, normalizeChannelId } from "../../channels/registry.js";
import { isReasoningTagProvider } from "../../utils/provider-utils.js";
import { estimateUsageCost, formatTokenCount, formatUsd } from "../../utils/usage-format.js";

const BUN_FETCH_SOCKET_ERROR_RE = /socket connection was closed unexpectedly/i;

/**
 * Build provider-specific threading context for tool auto-injection.
 */
export function buildThreadingToolContext(params: {
  sessionCtx: TemplateContext;
  config: BotConfig | undefined;
  hasRepliedRef: { value: boolean } | undefined;
}): ChannelThreadingToolContext {
  const { sessionCtx, config, hasRepliedRef } = params;
  if (!config) {
    return {};
  }
  const rawProvider = sessionCtx.Provider?.trim().toLowerCase();
  if (!rawProvider) {
    return {};
  }
  const provider = normalizeChannelId(rawProvider) ?? normalizeAnyChannelId(rawProvider);
  // Fallback for unrecognized/plugin channels (e.g., BlueBubbles before plugin registry init)
  const dock = provider ? getChannelDock(provider) : undefined;
  if (!dock?.threading?.buildToolContext) {
    return {
      currentChannelId: sessionCtx.To?.trim() || undefined,
      currentChannelProvider: provider ?? (rawProvider as ChannelId),
      hasRepliedRef,
    };
  }
  const context =
    dock.threading.buildToolContext({
      cfg: config,
      accountId: sessionCtx.AccountId,
      context: {
        Channel: sessionCtx.Provider,
        From: sessionCtx.From,
        To: sessionCtx.To,
        ChatType: sessionCtx.ChatType,
        ReplyToId: sessionCtx.ReplyToId,
        ThreadLabel: sessionCtx.ThreadLabel,
        MessageThreadId: sessionCtx.MessageThreadId,
      },
      hasRepliedRef,
    }) ?? {};
  return {
    ...context,
    currentChannelProvider: provider!, // guaranteed non-null since dock exists
  };
}

export const isBunFetchSocketError = (message?: string) =>
  Boolean(message && BUN_FETCH_SOCKET_ERROR_RE.test(message));

export const formatBunFetchSocketError = (message: string) => {
  const trimmed = message.trim();
  return [
    "⚠️ LLM connection failed. This could be due to server issues, network problems, or context length exceeded (e.g., with local LLMs like LM Studio). Original error:",
    "```",
    trimmed || "Unknown error",
    "```",
  ].join("\n");
};

export const formatResponseUsageLine = (params: {
  usage?: NormalizedUsage;
  showCost: boolean;
  costConfig?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
}): string | null => {
  const usage = params.usage;
  if (!usage) {
    return null;
  }
  const input = usage.input;
  const output = usage.output;
  if (typeof input !== "number" && typeof output !== "number") {
    return null;
  }
  const inputLabel = typeof input === "number" ? formatTokenCount(input) : "?";
  const outputLabel = typeof output === "number" ? formatTokenCount(output) : "?";
  const cost =
    params.showCost && typeof input === "number" && typeof output === "number"
      ? estimateUsageCost({
          usage: {
            input,
            output,
            cacheRead: usage.cacheRead,
            cacheWrite: usage.cacheWrite,
          },
          cost: params.costConfig,
        })
      : undefined;
  const costLabel = params.showCost ? formatUsd(cost) : undefined;
  const suffix = costLabel ? ` · est ${costLabel}` : "";
  return `Usage: ${inputLabel} in / ${outputLabel} out${suffix}`;
};

export const appendUsageLine = (payloads: ReplyPayload[], line: string): ReplyPayload[] => {
  let index = -1;
  for (let i = payloads.length - 1; i >= 0; i -= 1) {
    if (payloads[i]?.text) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    return [...payloads, { text: line }];
  }
  const existing = payloads[index];
  const existingText = existing.text ?? "";
  const separator = existingText.endsWith("\n") ? "" : "\n";
  const next = {
    ...existing,
    text: `${existingText}${separator}${line}`,
  };
  const updated = payloads.slice();
  updated[index] = next;
  return updated;
};

export const resolveEnforceFinalTag = (run: FollowupRun["run"], provider: string) =>
  Boolean(run.enforceFinalTag || isReasoningTagProvider(provider));
