import { Response, NextFunction } from "express";
import { TenantScopedRequest } from "./tenantScope";
import { AppDataSource } from "../data-source";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";

/**
 * Higher-order middleware: checks that the authenticated user has one of the allowed roles
 * in the current tenant.
 */
export function requireRole(...allowedRoles: MemberRole[]) {
  return async (req: TenantScopedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.tenantId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const memberRepo = AppDataSource.getRepository(TenantMembership);
      const membership = await memberRepo.findOneBy({
        user_id: req.user.id,
        tenant_id: req.tenantId,
      });

      if (!membership) {
        res.status(403).json({ error: "Not a member of this tenant" });
        return;
      }

      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({ error: `Requires one of: ${allowedRoles.join(", ")}` });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
}
