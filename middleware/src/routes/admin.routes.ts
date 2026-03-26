import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { Tenant, TenantStatus } from "../../../backend/src/entities/Tenant";
import { User } from "../../../backend/src/entities/User";
import { TenantMembership } from "../../../backend/src/entities/TenantMembership";
import { Subscription, SubscriptionStatus } from "../../../backend/src/entities/Subscription";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { requireSuperAdmin } from "../middleware/requireRole";

const router = Router();

// All admin routes require super admin access
router.use(authenticate);
router.use(requireSuperAdmin);

// --- GET /api/admin/tenants — list all tenants with stats ---
router.get("/tenants", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await AppDataSource.getRepository(Tenant).find({
      order: { created_at: "DESC" },
    });

    const tenantsWithStats = await Promise.all(
      tenants.map(async (t) => {
        const memberCount = await AppDataSource.getRepository(TenantMembership).count({
          where: { tenant_id: t.id },
        });
        const subscription = await AppDataSource.getRepository(Subscription).findOne({
          where: { tenant_id: t.id },
          relations: ["plan"],
          order: { created_at: "DESC" },
        });
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          logo_url: t.logo_url,
          created_at: t.created_at,
          member_count: memberCount,
          plan_name: subscription?.plan?.name || "No plan",
          subscription_status: subscription?.status || "none",
        };
      })
    );

    res.json(tenantsWithStats);
  } catch (err) {
    console.error("List tenants error:", err);
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

// --- GET /api/admin/users — list all users ---
router.get("/users", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await AppDataSource.getRepository(User).find({
      order: { created_at: "DESC" },
      select: ["id", "email", "full_name", "avatar_url", "created_at"],
    });

    // Get tenant count for each user
    const usersWithTenantCount = await Promise.all(
      users.map(async (u) => {
        const tenantCount = await AppDataSource.getRepository(TenantMembership).count({
          where: { user_id: u.id },
        });
        return { ...u, tenant_count: tenantCount };
      })
    );

    res.json(usersWithTenantCount);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// --- GET /api/admin/stats — platform statistics ---
router.get("/stats", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(User);
    const subRepo = AppDataSource.getRepository(Subscription);

    const [totalTenants, activeTenants, suspendedTenants] = await Promise.all([
      tenantRepo.count(),
      tenantRepo.count({ where: { status: TenantStatus.ACTIVE } }),
      tenantRepo.count({ where: { status: TenantStatus.SUSPENDED } }),
    ]);

    const totalUsers = await userRepo.count();

    const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
      subRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      subRepo.count({ where: { status: SubscriptionStatus.TRIALING } }),
    ]);

    res.json({
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      users: {
        total: totalUsers,
      },
      subscriptions: {
        active: activeSubscriptions,
        trialing: trialingSubscriptions,
      },
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// --- GET /api/admin/tenants/:id — get tenant details ---
router.get("/tenants/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.params.id as string;
    const tenant = await AppDataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Get members
    const members = await AppDataSource.getRepository(TenantMembership)
      .createQueryBuilder("tm")
      .innerJoinAndSelect("tm.user", "user")
      .where("tm.tenant_id = :tenantId", { tenantId: tenant.id })
      .getMany();

    // Get subscription
    const subscription = await AppDataSource.getRepository(Subscription).findOne({
      where: { tenant_id: tenantId },
      relations: ["plan"],
      order: { created_at: "DESC" },
    });

    res.json({
      ...tenant,
      members: members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        email: m.user.email,
        full_name: m.user.full_name,
        role: m.role,
        joined_at: m.joined_at,
      })),
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.plan,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          }
        : null,
    });
  } catch (err) {
    console.error("Get tenant error:", err);
    res.status(500).json({ error: "Failed to get tenant" });
  }
});

// --- PUT /api/admin/tenants/:id/suspend — suspend a tenant ---
router.put("/tenants/:id/suspend", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.params.id as string;
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOneBy({ id: tenantId });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    if (tenant.status === TenantStatus.DELETED) {
      res.status(400).json({ error: "Cannot suspend a deleted tenant" });
      return;
    }

    tenant.status = TenantStatus.SUSPENDED;
    await tenantRepo.save(tenant);

    res.json({ message: "Tenant suspended", tenant });
  } catch (err) {
    console.error("Suspend tenant error:", err);
    res.status(500).json({ error: "Failed to suspend tenant" });
  }
});

// --- PUT /api/admin/tenants/:id/activate — activate a tenant ---
router.put("/tenants/:id/activate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.params.id as string;
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOneBy({ id: tenantId });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    if (tenant.status === TenantStatus.DELETED) {
      res.status(400).json({ error: "Cannot activate a deleted tenant" });
      return;
    }

    tenant.status = TenantStatus.ACTIVE;
    await tenantRepo.save(tenant);

    res.json({ message: "Tenant activated", tenant });
  } catch (err) {
    console.error("Activate tenant error:", err);
    res.status(500).json({ error: "Failed to activate tenant" });
  }
});

export { router as adminRoutes };
