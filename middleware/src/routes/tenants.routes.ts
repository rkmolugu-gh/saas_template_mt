import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { Tenant, TenantStatus } from "../../../backend/src/entities/Tenant";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../utils/validate";
import { getParamOrFail } from "../utils/params";
import { IsNull } from "typeorm";

const router = Router();

const createTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

// --- GET /api/tenants — list tenants for authenticated user ---
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const memberships = await AppDataSource.getRepository(TenantMembership)
      .createQueryBuilder("tm")
      .innerJoinAndSelect("tm.tenant", "tenant")
      .where("tm.user_id = :userId", { userId })
      .andWhere("tenant.status != :deleted", { deleted: TenantStatus.DELETED })
      .orderBy("tenant.created_at", "DESC")
      .getMany();

    const tenants = memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      logo_url: m.tenant.logo_url,
      status: m.tenant.status,
      role: m.role,
      created_at: m.tenant.created_at,
    }));

    res.json(tenants);
  } catch (err) {
    console.error("List tenants error:", err);
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

// --- GET /api/tenants/:id — get single tenant (must be member) ---
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getParamOrFail(req, "id");
    const userId = req.user!.id;

    // Verify user is a member of this tenant
    const membership = await AppDataSource.getRepository(TenantMembership).findOne({
      where: { tenant_id: tenantId, user_id: userId },
      relations: ["tenant"],
    });

    if (!membership) {
      res.status(404).json({ error: "Tenant not found or you don't have access" });
      return;
    }

    const tenant = membership.tenant;

    if (tenant.status === TenantStatus.DELETED) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.json({
      ...tenant,
      role: membership.role,
    });
  } catch (err) {
    console.error("Get tenant error:", err);
    res.status(500).json({ error: "Failed to get tenant" });
  }
});

// --- POST /api/tenants — create new tenant for authenticated user ---
router.post(
  "/",
  authenticate,
  validate(createTenantSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, slug } = req.body;
      const userId = req.user!.id;

      const tenantRepo = AppDataSource.getRepository(Tenant);
      const memberRepo = AppDataSource.getRepository(TenantMembership);

      // Check slug uniqueness
      const existing = await tenantRepo.findOneBy({ slug });
      if (existing) {
        res.status(409).json({ error: "Tenant slug already taken" });
        return;
      }

      // Create tenant
      const tenant = tenantRepo.create({
        name,
        slug,
        status: TenantStatus.ACTIVE,
        settings: {},
      });
      const savedTenant = await tenantRepo.save(tenant);

      // Create membership as owner
      const membership = memberRepo.create({
        tenant_id: savedTenant.id,
        user_id: userId,
        role: MemberRole.OWNER,
      });
      await memberRepo.save(membership);

      res.status(201).json({
        id: savedTenant.id,
        name: savedTenant.name,
        slug: savedTenant.slug,
        status: savedTenant.status,
        role: MemberRole.OWNER,
      });
    } catch (err) {
      console.error("Create tenant error:", err);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  }
);

// --- PUT /api/tenants/:id — update tenant ---
router.put(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  validate(updateTenantSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const tenantId = getParamOrFail(req, "id");
      const tenantRepo = AppDataSource.getRepository(Tenant);

      const tenant = await tenantRepo.findOneBy({ id: tenantId });
      if (!tenant || tenant.status === TenantStatus.DELETED) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      // Only allow updating specific fields
      if (req.body.name !== undefined) {
        tenant.name = req.body.name;
      }
      if (req.body.logo_url !== undefined) {
        tenant.logo_url = req.body.logo_url;
      }
      if (req.body.settings !== undefined) {
        tenant.settings = req.body.settings;
      }

      await tenantRepo.save(tenant);

      res.json(tenant);
    } catch (err) {
      console.error("Update tenant error:", err);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  }
);

// --- DELETE /api/tenants/:id — soft delete tenant (owner only) ---
router.delete(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const tenantId = getParamOrFail(req, "id");
      const tenantRepo = AppDataSource.getRepository(Tenant);

      const tenant = await tenantRepo.findOneBy({ id: tenantId });
      if (!tenant || tenant.status === TenantStatus.DELETED) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      // Check this is the last owner
      const memberRepo = AppDataSource.getRepository(TenantMembership);
      const owners = await memberRepo.count({
        where: { tenant_id: tenantId, role: MemberRole.OWNER },
      });

      // Verify the requesting user is an owner
      const membership = await memberRepo.findOne({
        where: { tenant_id: tenantId, user_id: req.user!.id },
      });

      if (!membership || membership.role !== MemberRole.OWNER) {
        res.status(403).json({ error: "Only owner can delete tenant" });
        return;
      }

      // Soft delete
      tenant.status = TenantStatus.DELETED;
      await tenantRepo.save(tenant);

      res.json({ message: "Tenant deleted" });
    } catch (err) {
      console.error("Delete tenant error:", err);
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  }
);

export { router as tenantRoutes };
