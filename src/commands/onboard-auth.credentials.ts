import type { OAuthCredentials } from "@mariozechner/pi-ai";
import type { SecretInput } from "../config/types.secrets.js";
import { resolveBotAgentDir } from "../agents/agent-paths.js";
import { upsertAuthProfile } from "../agents/auth-profiles.js";

function secretInputToString(input: SecretInput): string {
  if (typeof input === "string") {
    return input;
  }
  return input.id;
}
export { CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF } from "../agents/cloudflare-ai-gateway.js";
export { XAI_DEFAULT_MODEL_REF } from "./onboard-auth.models.js";

/** Options for API key storage when applying auth choice credentials. */
export type ApiKeyStorageOptions = {
  /** Whether to store as a secret reference instead of inline. */
  useSecretRef?: boolean;
  /** Provider alias for secret ref storage. */
  secretRefProvider?: string;
  /** Mode for secret input. */
  secretInputMode?: string;
};

const resolveAuthAgentDir = (agentDir?: string) => agentDir ?? resolveBotAgentDir();

export async function writeOAuthCredentials(
  provider: string,
  creds: OAuthCredentials,
  agentDir?: string,
  options?: Record<string, unknown>,
): Promise<string> {
  void options;
  const email =
    typeof creds.email === "string" && creds.email.trim() ? creds.email.trim() : "default";
  const profileId = `${provider}:${email}`;
  upsertAuthProfile({
    profileId,
    credential: {
      type: "oauth",
      provider,
      ...creds,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
  return profileId;
}

export async function setAnthropicApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "anthropic:default",
    credential: {
      type: "api_key",
      provider: "anthropic",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setGeminiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "google:default",
    credential: {
      type: "api_key",
      provider: "google",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMinimaxApiKey(
  key: SecretInput,
  agentDir?: string,
  profileId: string = "minimax:default",
  options?: ApiKeyStorageOptions,
) {
  void options;
  const provider = profileId.split(":")[0] ?? "minimax";
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId,
    credential: {
      type: "api_key",
      provider,
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMoonshotApiKey(key: SecretInput, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "moonshot:default",
    credential: {
      type: "api_key",
      provider: "moonshot",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setKimiCodingApiKey(key: SecretInput, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "kimi-coding:default",
    credential: {
      type: "api_key",
      provider: "kimi-coding",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setSyntheticApiKey(key: SecretInput, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "synthetic:default",
    credential: {
      type: "api_key",
      provider: "synthetic",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVeniceApiKey(key: SecretInput, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "venice:default",
    credential: {
      type: "api_key",
      provider: "venice",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export const ZAI_DEFAULT_MODEL_REF = "zai/glm-5";
export const XIAOMI_DEFAULT_MODEL_REF = "xiaomi/mimo-v2-flash";
export const OPENROUTER_DEFAULT_MODEL_REF = "openrouter/auto";
export const HUGGINGFACE_DEFAULT_MODEL_REF = "huggingface/deepseek-ai/DeepSeek-R1";
export const TOGETHER_DEFAULT_MODEL_REF = "together/moonshotai/Kimi-K2.5";
export const LITELLM_DEFAULT_MODEL_REF = "litellm/claude-opus-4-6";
export const VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF = "vercel-ai-gateway/anthropic/claude-opus-4.6";

export async function setZaiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "zai:default",
    credential: {
      type: "api_key",
      provider: "zai",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setXiaomiApiKey(key: SecretInput, agentDir?: string) {
  upsertAuthProfile({
    profileId: "xiaomi:default",
    credential: {
      type: "api_key",
      provider: "xiaomi",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpenrouterApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  // Never persist the literal "undefined" (e.g. when prompt returns undefined and caller used String(key)).
  const rawKey = secretInputToString(key);
  const safeKey = rawKey === "undefined" ? "" : rawKey;
  upsertAuthProfile({
    profileId: "openrouter:default",
    credential: {
      type: "api_key",
      provider: "openrouter",
      key: safeKey,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setCloudflareAiGatewayConfig(
  accountId: string,
  gatewayId: string,
  apiKey: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  const normalizedAccountId = accountId.trim();
  const normalizedGatewayId = gatewayId.trim();
  const normalizedKey = secretInputToString(apiKey).trim();
  upsertAuthProfile({
    profileId: "cloudflare-ai-gateway:default",
    credential: {
      type: "api_key",
      provider: "cloudflare-ai-gateway",
      key: normalizedKey,
      metadata: {
        accountId: normalizedAccountId,
        gatewayId: normalizedGatewayId,
      },
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setLitellmApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "litellm:default",
    credential: {
      type: "api_key",
      provider: "litellm",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVercelAiGatewayApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "vercel-ai-gateway:default",
    credential: {
      type: "api_key",
      provider: "vercel-ai-gateway",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpencodeZenApiKey(key: SecretInput, agentDir?: string) {
  upsertAuthProfile({
    profileId: "opencode:default",
    credential: {
      type: "api_key",
      provider: "opencode",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setTogetherApiKey(key: SecretInput, agentDir?: string) {
  upsertAuthProfile({
    profileId: "together:default",
    credential: {
      type: "api_key",
      provider: "together",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setHuggingfaceApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "huggingface:default",
    credential: {
      type: "api_key",
      provider: "huggingface",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export function setQianfanApiKey(key: SecretInput, agentDir?: string) {
  upsertAuthProfile({
    profileId: "qianfan:default",
    credential: {
      type: "api_key",
      provider: "qianfan",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export function setXaiApiKey(key: SecretInput, agentDir?: string, options?: ApiKeyStorageOptions) {
  void options;
  upsertAuthProfile({
    profileId: "xai:default",
    credential: {
      type: "api_key",
      provider: "xai",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpenaiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "openai:default",
    credential: {
      type: "api_key",
      provider: "openai",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setByteplusApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "byteplus:default",
    credential: {
      type: "api_key",
      provider: "byteplus",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVolcengineApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "volcengine:default",
    credential: {
      type: "api_key",
      provider: "volcengine",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setKilocodeApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "kilocode:default",
    credential: {
      type: "api_key",
      provider: "kilocode",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMistralApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  void options;
  upsertAuthProfile({
    profileId: "mistral:default",
    credential: {
      type: "api_key",
      provider: "mistral",
      key: secretInputToString(key),
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export { KILOCODE_DEFAULT_MODEL_REF } from "../providers/kilocode-shared.js";
export { MISTRAL_DEFAULT_MODEL_REF } from "./onboard-auth.models.js";
