import { Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";
import { AuthenticatedRequest } from "./auth";

// Role hierarchy: higher index = more permissions
const ROLE_HIERARCHY: MemberRole[] = [
  MemberRole.VIEWER,
  MemberRole.MEMBER,
  MemberRole.ADMIN,
  MemberRole.OWNER,
];

/**
 * Check if a role has at least the required level
 */
function hasRoleLevel(userRole: MemberRole, requiredRole: MemberRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Middleware factory — requires user to have one of the specified roles in the tenant
 * Uses role hierarchy: Admin can access Member routes, Owner can access Admin routes, etc.
 */
export function requireRole(...allowedRoles: MemberRole[]) {
  return async (
    req: AuthenticatedRequest & { tenantId?: string },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = req.user?.id;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Super admins bypass role checks
    if (req.user?.is_super_admin) {
      next();
      return;
    }

    try {
      const memberRepo = AppDataSource.getRepository(TenantMembership);
      const membership = await memberRepo.findOne({
        where: { tenant_id: tenantId, user_id: userId },
      });

      if (!membership) {
        res.status(403).json({ error: "You are not a member of this tenant" });
        return;
      }

      // Check if user's role meets any of the required levels
      const hasPermission = allowedRoles.some((requiredRole) =>
        hasRoleLevel(membership.role, requiredRole)
      );

      if (!hasPermission) {
        res.status(403).json({ error: `Requires one of: ${allowedRoles.join(", ")}` });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Middleware — requires super admin role
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.is_super_admin) {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}
