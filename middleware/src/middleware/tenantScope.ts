import { Response, NextFunction, Request } from "express";
import { AuthenticatedRequest } from "./auth";

export interface TenantScopedRequest extends AuthenticatedRequest {
  tenantId?: string;
}

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Extract tenant_id from x-tenant-id header and attach to request
 * Validates that it's a proper UUID format
 */
export function tenantScope(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers["x-tenant-id"] as string | undefined;

  if (!tenantId) {
    res.status(400).json({ error: "x-tenant-id header is required" });
    return;
  }

  if (!UUID_REGEX.test(tenantId)) {
    res.status(400).json({ error: "Invalid tenant ID format" });
    return;
  }

  (req as TenantScopedRequest).tenantId = tenantId;
  next();
}
