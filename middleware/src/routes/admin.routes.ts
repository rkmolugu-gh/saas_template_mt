import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { Tenant } from "../../../backend/src/entities/Tenant";
import { User } from "../../../backend/src/entities/User";
import { TenantMembership } from "../../../backend/src/entities/TenantMembership";
import { Subscription } from "../../../backend/src/entities/Subscription";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// NOTE: In production, restrict these to super_admin users only.
// For now, they are behind authenticate middleware.

// GET /api/admin/tenants — list all tenants with stats
router.get("/tenants", authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await AppDataSource.getRepository(Tenant).find({ order: { created_at: "DESC" } });

    const tenantsWithStats = await Promise.all(
      tenants.map(async (t) => {
        const memberCount = await AppDataSource.getRepository(TenantMembership).count({
          where: { tenant_id: t.id },
        });
        const subscription = await AppDataSource.getRepository(Subscription).findOne({
          where: { tenant_id: t.id },
          relations: ["plan"],
          order: { current_period_end: "DESC" },
        });
        return {
          ...t,
          member_count: memberCount,
          plan_name: subscription?.plan?.name || "No plan",
          subscription_status: subscription?.status || "none",
        };
      })
    );

    res.json(tenantsWithStats);
  } catch (err) {
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

// GET /api/admin/users — list all users
router.get("/users", authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await AppDataSource.getRepository(User).find({
      order: { created_at: "DESC" },
      select: ["id", "email", "full_name", "avatar_url", "created_at"],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to list users" });
  }
});

// GET /api/admin/stats — platform statistics
router.get("/stats", authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const totalTenants = await AppDataSource.getRepository(Tenant).count();
    const totalUsers = await AppDataSource.getRepository(User).count();
    const activeSubscriptions = await AppDataSource.getRepository(Subscription).count({
      where: { status: "active" as any },
    });

    res.json({ totalTenants, totalUsers, activeSubscriptions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export { router as adminRoutes };
