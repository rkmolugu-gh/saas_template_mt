import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { AuditLog } from "../../../backend/src/entities/AuditLog";
import { authenticate } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "../../../backend/src/entities/TenantMembership";

const router = Router();

// GET /api/audit-logs — list audit logs for tenant
router.get(
  "/",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const { action, resource_type, user_id, limit = "50", offset = "0" } = req.query;

      const qb = AppDataSource.getRepository(AuditLog)
        .createQueryBuilder("log")
        .where("log.tenant_id = :tenantId", { tenantId: req.tenantId });

      if (action) qb.andWhere("log.action = :action", { action });
      if (resource_type) qb.andWhere("log.resource_type = :resource_type", { resource_type });
      if (user_id) qb.andWhere("log.user_id = :user_id", { user_id });

      qb.orderBy("log.created_at", "DESC")
        .take(parseInt(limit as string, 10))
        .skip(parseInt(offset as string, 10));

      const [logs, total] = await qb.getManyAndCount();
      res.json({ logs, total });
    } catch (err) {
      res.status(500).json({ error: "Failed to list audit logs" });
    }
  }
);

export { router as auditRoutes };
