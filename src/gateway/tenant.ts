/**
 * Multi-tenant context for HanzoBot gateway.
 *
 * Resolves tenant (organization) from IAM JWT claims and threads the tenant
 * context through the request lifecycle. Each tenant gets isolated:
 * - State directories: ~/.hanzobot/tenants/{orgId}/
 * - Session storage
 * - Config overlays
 * - Auth profiles
 */

import fs from "node:fs";
import path from "node:path";
import type { IamTokenClaims } from "./auth-iam.js";
import type { GatewayAuthResult } from "./auth.js";

export type TenantContext = {
  /** Organization ID from IAM claims. Undefined for single-tenant mode. */
  orgId?: string;
  /** Organization display name. */
  orgName?: string;
  /** Authenticated user ID. */
  userId?: string;
  /** User email. */
  userEmail?: string;
  /** User role within the org. */
  role?: string;
  /** Whether this is a multi-tenant request (has orgId). */
  isMultiTenant: boolean;
};

/** Sentinel context for single-tenant (no IAM) deployments. */
export const SINGLE_TENANT_CONTEXT: TenantContext = {
  isMultiTenant: false,
};

/**
 * Extract tenant context from a gateway auth result.
 * If the auth result has IAM claims with an orgId, we're in multi-tenant mode.
 */
export function resolveTenantContext(authResult: GatewayAuthResult): TenantContext {
  if (!authResult.ok) return SINGLE_TENANT_CONTEXT;

  const claims = authResult.iamClaims;
  if (!claims?.orgId) return SINGLE_TENANT_CONTEXT;

  return {
    orgId: claims.orgId,
    orgName: claims.orgName,
    userId: claims.sub,
    userEmail: claims.email,
    role: claims.role,
    isMultiTenant: true,
  };
}

/**
 * Resolve the state directory for a given tenant.
 * Single-tenant: returns baseStateDir as-is.
 * Multi-tenant: returns baseStateDir/tenants/{orgId}/
 */
export function resolveTenantStateDir(baseStateDir: string, tenant: TenantContext): string {
  if (!tenant.isMultiTenant || !tenant.orgId) return baseStateDir;
  return path.join(baseStateDir, "tenants", sanitizeOrgId(tenant.orgId));
}

/**
 * Resolve the session store path for a tenant-scoped agent.
 */
export function resolveTenantSessionStorePath(params: {
  baseStateDir: string;
  tenant: TenantContext;
  agentId: string;
}): string {
  const tenantDir = resolveTenantStateDir(params.baseStateDir, params.tenant);
  return path.join(tenantDir, "agents", params.agentId, "sessions", "sessions.json");
}

/**
 * Resolve the config path for a tenant overlay.
 */
export function resolveTenantConfigPath(baseStateDir: string, tenant: TenantContext): string {
  if (!tenant.isMultiTenant || !tenant.orgId) {
    return path.join(baseStateDir, "config.json");
  }
  const tenantDir = resolveTenantStateDir(baseStateDir, tenant);
  return path.join(tenantDir, "config.json");
}

/**
 * Resolve auth profiles store path for a tenant.
 */
export function resolveTenantAuthProfilesPath(baseStateDir: string, tenant: TenantContext): string {
  if (!tenant.isMultiTenant || !tenant.orgId) {
    return path.join(baseStateDir, "oauth", "auth-profiles.json");
  }
  const tenantDir = resolveTenantStateDir(baseStateDir, tenant);
  return path.join(tenantDir, "oauth", "auth-profiles.json");
}

/**
 * Ensure the tenant state directory structure exists.
 */
export function ensureTenantDirs(baseStateDir: string, tenant: TenantContext): void {
  if (!tenant.isMultiTenant || !tenant.orgId) return;
  const tenantDir = resolveTenantStateDir(baseStateDir, tenant);
  fs.mkdirSync(path.join(tenantDir, "agents"), { recursive: true });
  fs.mkdirSync(path.join(tenantDir, "oauth"), { recursive: true });
}

/**
 * List all known tenant org IDs by scanning the tenants directory.
 */
export function listTenantOrgIds(baseStateDir: string): string[] {
  const tenantsDir = path.join(baseStateDir, "tenants");
  try {
    const entries = fs.readdirSync(tenantsDir, { withFileTypes: true });
    const dirs: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) dirs.push(entry.name);
    }
    return dirs;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sanitize org ID for use in filesystem paths (allow alphanumeric, dash, underscore). */
function sanitizeOrgId(orgId: string): string {
  return orgId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}
