import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { Tenant, TenantStatus } from "../../../backend/src/entities/Tenant";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "../../../backend/src/entities/TenantMembership";
import { validate } from "../utils/validate";

const router = Router();

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

// GET /api/tenants — list tenants for authenticated user
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await AppDataSource.getRepository(Tenant)
      .createQueryBuilder("t")
      .innerJoin("tenant_memberships", "tm", "tm.tenant_id = t.id")
      .where("tm.user_id = :userId", { userId: req.user!.id })
      .andWhere("t.status != :deleted", { deleted: TenantStatus.DELETED })
      .getMany();

    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

// GET /api/tenants/:id — get single tenant
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenant = await AppDataSource.getRepository(Tenant).findOneBy({ id: req.params.id });
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: "Failed to get tenant" });
  }
});

// PUT /api/tenants/:id — update tenant
router.put(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  validate(updateTenantSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Tenant);
      const tenant = await repo.findOneBy({ id: req.params.id });
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }
      Object.assign(tenant, req.body);
      await repo.save(tenant);
      res.json(tenant);
    } catch (err) {
      res.status(500).json({ error: "Failed to update tenant" });
    }
  }
);

// DELETE /api/tenants/:id — soft delete tenant
router.delete(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(Tenant);
      const tenant = await repo.findOneBy({ id: req.params.id });
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }
      tenant.status = TenantStatus.DELETED;
      await repo.save(tenant);
      res.json({ message: "Tenant deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  }
);

export { router as tenantRoutes };
