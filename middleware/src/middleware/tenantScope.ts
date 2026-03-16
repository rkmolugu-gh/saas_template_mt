import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

export interface TenantScopedRequest extends AuthenticatedRequest {
  tenantId?: string;
}

/**
 * Extract tenant_id from x-tenant-id header and attach to request
 */
export function tenantScope(req: TenantScopedRequest, res: Response, next: NextFunction): void {
  const tenantId = req.headers["x-tenant-id"] as string | undefined;

  if (!tenantId) {
    res.status(400).json({ error: "x-tenant-id header is required" });
    return;
  }

  req.tenantId = tenantId;
  next();
}
