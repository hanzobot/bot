export type KmsMachineIdentityConfig = {
  /** Machine identity client id for universal auth login. */
  clientId?: string;
  /** Machine identity client secret for universal auth login. */
  clientSecret?: string;
};

export type KmsSecretsConfig = {
  /** KMS base URL (defaults to https://kms.hanzo.ai). */
  siteUrl?: string;
  /** Tenant org slug metadata (optional, for policy/audit context). */
  orgSlug?: string;
  /** Project/workspace id. */
  projectId?: string;
  /** Project/workspace slug. */
  projectSlug?: string;
  /** Environment slug (for example: dev, staging, prod). */
  environment?: string;
  /** Secret folder path (defaults to /). */
  secretPath?: string;
  /** Optional pre-issued KMS access token. */
  accessToken?: string;
  /** Machine identity credentials for universal auth. */
  machineIdentity?: KmsMachineIdentityConfig;
  /** Cache TTL for resolved secret values. Default: 15000 ms. */
  cacheTtlMs?: number;
  /** Network timeout for KMS API calls. Default: 10000 ms. */
  requestTimeoutMs?: number;
};

/** Source type for a secret reference provider. */
export type SecretRefSource = "env" | "file" | "exec";

/** A reference to a secret value stored in an external provider. */
export type SecretRef = {
  source: SecretRefSource;
  provider: string;
  id: string;
};

/**
 * A secret input value: either a plain string (inline secret) or a SecretRef
 * pointing to an external provider.
 */
export type SecretInput = string | SecretRef;

/** Configuration for an environment-variable-based secret provider. */
export type EnvSecretProviderConfig = {
  source: "env";
  /** Optional allowlist of env var names accessible via this provider. */
  allowlist?: string[];
};

/** Configuration for a file-based secret provider (JSON pointer path). */
export type FileSecretProviderConfig = {
  source: "file";
  /** Path to the secrets file (JSON or text). */
  path?: string;
  /** Optional maximum file size in bytes. */
  maxBytes?: number;
  /** Parse mode: "json" (default) or "singleValue" for plain-text files. */
  mode?: "json" | "singleValue";
  /** Timeout in milliseconds for file read. */
  timeoutMs?: number;
};

/** Configuration for an exec-based secret provider (subprocess). */
export type ExecSecretProviderConfig = {
  source: "exec";
  /** Command (binary path) to run. */
  command?: string;
  /** Additional arguments passed to the command. */
  args?: string[];
  /** Timeout in milliseconds for the subprocess. */
  timeoutMs?: number;
  /** Timeout (ms) before output is expected. */
  noOutputTimeoutMs?: number;
  /** Maximum output bytes. */
  maxOutputBytes?: number;
  /** If false, accept text output in addition to JSON. Default: true. */
  jsonOnly?: boolean;
  /** Environment variables to pass from the current process. */
  passEnv?: string[];
  /** Additional environment variable overrides. */
  env?: Record<string, string>;
  /** Allow symlinks to the command path. */
  allowSymlinkCommand?: boolean;
  /** Trusted directories for command path resolution. */
  trustedDirs?: string[];
  /** Allow insecure (non-absolute) command path. */
  allowInsecurePath?: boolean;
};

/** Union of all supported secret provider configs. */
export type SecretProviderConfig =
  | EnvSecretProviderConfig
  | FileSecretProviderConfig
  | ExecSecretProviderConfig;

/**
 * Defaults context for coercing a secret ref.
 * Accepts either a direct {source, provider} pair or a SecretsDefaultsConfig
 * shape with env/file/exec provider aliases.
 */
export type SecretRefCoerceDefaults =
  | { source?: SecretRefSource; provider?: string }
  | SecretsDefaultsConfig
  | null
  | undefined;

/** Coerce a raw value (string | SecretRef | undefined) to a SecretRef or null. */
export function coerceSecretRef(
  value: unknown,
  defaults?: SecretRefCoerceDefaults,
): SecretRef | null {
  if (!value) {
    return null;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.source === "string" &&
      typeof candidate.provider === "string" &&
      typeof candidate.id === "string"
    ) {
      return {
        source: candidate.source as SecretRefSource,
        provider: candidate.provider,
        id: candidate.id,
      };
    }
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const d = defaults as Record<string, unknown> | null | undefined;
    const source: SecretRefSource = (d?.source as SecretRefSource | undefined) ?? "env";
    const provider =
      (d?.provider as string | undefined) ??
      (source === "env" ? (d?.env as string | undefined) : undefined) ??
      (source === "file" ? (d?.file as string | undefined) : undefined) ??
      (source === "exec" ? (d?.exec as string | undefined) : undefined) ??
      DEFAULT_SECRET_PROVIDER_ALIAS;
    return { source, provider, id: value };
  }
  return null;
}

/** Default alias used for the implicit secret provider. */
export const DEFAULT_SECRET_PROVIDER_ALIAS = "default";

export type SecretsResolutionConfig = {
  /** Max number of concurrent provider resolutions. */
  maxProviderConcurrency?: number;
  /** Max number of refs per provider. */
  maxRefsPerProvider?: number;
  /** Max total bytes per batch. */
  maxBatchBytes?: number;
};

export type SecretsDefaultsConfig = {
  /** Default provider alias for env-source refs. */
  env?: string;
  /** Default provider alias for file-source refs. */
  file?: string;
  /** Default provider alias for exec-source refs. */
  exec?: string;
};

export type SecretsConfig = {
  /** Secret backend mode. "kms" enables KMS reference resolution. */
  backend?: "local" | "kms";
  kms?: KmsSecretsConfig;
  /** Named secret providers keyed by alias. */
  providers?: Record<string, SecretProviderConfig>;
  /** Default provider aliases per source type. */
  defaults?: SecretsDefaultsConfig;
  /** Resolution limits. */
  resolution?: SecretsResolutionConfig;
};
