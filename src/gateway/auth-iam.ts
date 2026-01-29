/**
 * Hanzo IAM OAuth2/OIDC integration for gateway authentication.
 *
 * Validates JWT tokens issued by hanzo.id, extracts org/user/role claims,
 * and caches JWKS keys for verification.
 */

import { createVerify } from "node:crypto";

export type IamConfig = {
  /** IAM endpoint URL (e.g. https://hanzo.id). */
  endpoint: string;
  /** OAuth client ID for this application. */
  clientId: string;
  /** OAuth client secret (for server-to-server flows). */
  clientSecret?: string;
  /** Restrict authentication to specific org IDs. */
  allowedOrgs?: string[];
};

export type IamTokenClaims = {
  /** Subject (user ID). */
  sub: string;
  /** User email. */
  email?: string;
  /** User display name. */
  name?: string;
  /** Organization ID. */
  orgId?: string;
  /** Organization name. */
  orgName?: string;
  /** User role within the org. */
  role?: string;
  /** Token scopes. */
  scope?: string;
  /** Issued at (epoch seconds). */
  iat?: number;
  /** Expiration (epoch seconds). */
  exp?: number;
  /** Issuer. */
  iss?: string;
  /** Audience. */
  aud?: string | string[];
};

export type IamAuthResult = {
  ok: boolean;
  claims?: IamTokenClaims;
  reason?: string;
};

// JWKS cache (key ID → public key PEM)
type JwksCache = {
  keys: Map<string, string>;
  fetchedAt: number;
};

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let jwksCache: JwksCache | null = null;

// -----------------------------------------------------------------------
// JWT helpers (minimal, no external deps)
// -----------------------------------------------------------------------

function base64UrlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]!).toString("utf-8"));
  } catch {
    return null;
  }
}

function decodeJwtHeader(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[0]!).toString("utf-8"));
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------
// JWKS fetching
// -----------------------------------------------------------------------

async function fetchJwks(endpoint: string): Promise<Map<string, string>> {
  // Discover OIDC configuration
  const oidcUrl = `${endpoint.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const oidcRes = await fetch(oidcUrl, { signal: AbortSignal.timeout(10_000) });
  if (!oidcRes.ok) {
    throw new Error(`OIDC discovery failed: ${oidcRes.status} ${oidcRes.statusText}`);
  }
  const oidcConfig = (await oidcRes.json()) as { jwks_uri?: string };
  const jwksUri = oidcConfig.jwks_uri;
  if (!jwksUri) {
    throw new Error("OIDC configuration missing jwks_uri");
  }

  const jwksRes = await fetch(jwksUri, { signal: AbortSignal.timeout(10_000) });
  if (!jwksRes.ok) {
    throw new Error(`JWKS fetch failed: ${jwksRes.status} ${jwksRes.statusText}`);
  }
  const jwksBody = (await jwksRes.json()) as { keys?: Array<Record<string, unknown>> };
  const keys = new Map<string, string>();

  for (const key of jwksBody.keys ?? []) {
    const kid = key.kid as string | undefined;
    // Support both x5c certificate chains and raw RSA/EC parameters
    if (kid && Array.isArray(key.x5c) && key.x5c.length > 0) {
      const cert = key.x5c[0] as string;
      const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
      keys.set(kid, pem);
    }
  }

  return keys;
}

async function getJwksKeys(endpoint: string): Promise<Map<string, string>> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  const keys = await fetchJwks(endpoint);
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

/** Invalidate the JWKS cache (e.g. on key rotation). */
export function invalidateJwksCache(): void {
  jwksCache = null;
}

// -----------------------------------------------------------------------
// Token validation
// -----------------------------------------------------------------------

function verifyJwtSignature(token: string, publicKeyPem: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const signatureInput = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlDecode(parts[2]!);

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(signatureInput);
    return verifier.verify(publicKeyPem, signature);
  } catch {
    return false;
  }
}

/**
 * Validate a JWT token against Hanzo IAM.
 *
 * Performs:
 * 1. JWT decode and structural validation
 * 2. Signature verification via JWKS
 * 3. Expiration check
 * 4. Org allowlist check (if configured)
 */
export async function validateIamToken(
  token: string,
  config: IamConfig,
): Promise<IamAuthResult> {
  // Decode header and payload
  const header = decodeJwtHeader(token);
  if (!header) return { ok: false, reason: "invalid_jwt_header" };

  const payload = decodeJwtPayload(token);
  if (!payload) return { ok: false, reason: "invalid_jwt_payload" };

  const kid = header.kid as string | undefined;
  const alg = header.alg as string | undefined;

  // Only RS256 supported for now
  if (alg !== "RS256") {
    return { ok: false, reason: `unsupported_algorithm:${alg ?? "none"}` };
  }

  // Verify signature
  if (kid) {
    try {
      const keys = await getJwksKeys(config.endpoint);
      const publicKey = keys.get(kid);
      if (!publicKey) {
        // Key rotation may have happened; invalidate and retry once
        invalidateJwksCache();
        const freshKeys = await getJwksKeys(config.endpoint);
        const freshKey = freshKeys.get(kid);
        if (!freshKey) return { ok: false, reason: "unknown_key_id" };
        if (!verifyJwtSignature(token, freshKey)) {
          return { ok: false, reason: "invalid_signature" };
        }
      } else if (!verifyJwtSignature(token, publicKey)) {
        return { ok: false, reason: "invalid_signature" };
      }
    } catch (err) {
      return { ok: false, reason: `jwks_error:${String(err)}` };
    }
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp as number | undefined;
  if (exp && exp < now) {
    return { ok: false, reason: "token_expired" };
  }

  // Extract claims
  const claims: IamTokenClaims = {
    sub: String(payload.sub ?? ""),
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    orgId: (payload.orgId ?? payload.org_id ?? payload.owner) as string | undefined,
    orgName: (payload.orgName ?? payload.org_name) as string | undefined,
    role: (payload.role ?? payload.typ) as string | undefined,
    scope: payload.scope as string | undefined,
    iat: payload.iat as number | undefined,
    exp: payload.exp as number | undefined,
    iss: payload.iss as string | undefined,
    aud: payload.aud as string | string[] | undefined,
  };

  // Check org allowlist
  if (config.allowedOrgs && config.allowedOrgs.length > 0) {
    if (!claims.orgId || !config.allowedOrgs.includes(claims.orgId)) {
      return { ok: false, reason: "org_not_allowed" };
    }
  }

  return { ok: true, claims };
}
