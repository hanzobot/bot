export type DeviceAuthPayloadParams = {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce?: string;
  version?: string;
};

export type DeviceAuthPayloadV3Params = DeviceAuthPayloadParams & {
  platform?: string | null;
  deviceFamily?: string | null;
};

function toLowerAscii(input: string): string {
  return input.replace(/[A-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 32));
}

export function normalizeDeviceMetadataForAuth(value?: string | null): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  // Keep cross-runtime normalization deterministic (TS/Swift/Kotlin) by only
  // lowercasing ASCII metadata fields used in auth payloads.
  return toLowerAscii(trimmed);
}

export function buildDeviceAuthPayload(params: DeviceAuthPayloadParams): string {
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";
  const version = params.version ?? "v2";
  const parts = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
  ];
  if (params.nonce !== undefined) {
    parts.push(params.nonce);
  }
  return parts.join("|");
}

export function buildDeviceAuthPayloadV3(params: DeviceAuthPayloadV3Params): string {
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";
  const platform = normalizeDeviceMetadataForAuth(params.platform);
  const deviceFamily = normalizeDeviceMetadataForAuth(params.deviceFamily);
  return [
    "v3",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce,
    platform,
    deviceFamily,
  ].join("|");
}
