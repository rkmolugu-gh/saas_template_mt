import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { Plan } from "../../../backend/src/entities/Plan";
import { Subscription, SubscriptionStatus } from "../../../backend/src/entities/Subscription";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "../../../backend/src/entities/TenantMembership";
import { validate } from "../utils/validate";

const router = Router();

const subscribeSchema = z.object({
  plan_id: z.string().uuid("Invalid plan ID"),
});

// --- GET /api/plans — list all active plans (public) ---
router.get("/", async (_req, res: Response) => {
  try {
    const plans = await AppDataSource.getRepository(Plan)
      .createQueryBuilder("plan")
      .where("plan.is_active = :active", { active: true })
      .orderBy("plan.monthly_price", "ASC")
      .getMany();

    res.json(plans);
  } catch (err) {
    console.error("List plans error:", err);
    res.status(500).json({ error: "Failed to list plans" });
  }
});

// --- GET /api/plans/:id — get single plan (public) ---
router.get("/:id", async (req, res: Response) => {
  try {
    const plan = await AppDataSource.getRepository(Plan).findOne({
      where: { id: req.params.id, is_active: true },
    });

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    res.json(plan);
  } catch (err) {
    console.error("Get plan error:", err);
    res.status(500).json({ error: "Failed to get plan" });
  }
});

// --- GET /api/plans/subscription — get current tenant's subscription ---
router.get(
  "/subscription",
  authenticate,
  tenantScope,
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const sub = await AppDataSource.getRepository(Subscription).findOne({
        where: { tenant_id: req.tenantId },
        relations: ["plan"],
        order: { created_at: "DESC" },
      });

      if (!sub) {
        res.json(null);
        return;
      }

      res.json({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          monthly_price: sub.plan.monthly_price,
          annual_price: sub.plan.annual_price,
        },
      });
    } catch (err) {
      console.error("Get subscription error:", err);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  }
);

// --- POST /api/plans/subscribe — subscribe tenant to a plan (owner only) ---
router.post(
  "/subscribe",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER),
  validate(subscribeSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const { plan_id } = req.body;

      // Verify plan exists and is active
      const planRepo = AppDataSource.getRepository(Plan);
      const plan = await planRepo.findOne({
        where: { id: plan_id, is_active: true },
      });

      if (!plan) {
        res.status(404).json({ error: "Plan not found or inactive" });
        return;
      }

      const subRepo = AppDataSource.getRepository(Subscription);

      // Check for existing active subscription
      const existingSub = await subRepo.findOne({
        where: { tenant_id: req.tenantId },
        order: { created_at: "DESC" },
      });

      // Cancel existing subscription if any
      if (existingSub && existingSub.status === SubscriptionStatus.ACTIVE) {
        existingSub.status = SubscriptionStatus.CANCELED;
        await subRepo.save(existingSub);
      }

      // Create new subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const subscription = subRepo.create({
        tenant_id: req.tenantId,
        plan_id,
        status: SubscriptionStatus.ACTIVE,
        current_period_start: now,
        current_period_end: periodEnd,
      });

      const saved = await subRepo.save(subscription);

      res.status(201).json({
        id: saved.id,
        status: saved.status,
        current_period_start: saved.current_period_start,
        current_period_end: saved.current_period_end,
        plan: {
          id: plan.id,
          name: plan.name,
          monthly_price: plan.monthly_price,
        },
      });
    } catch (err) {
      console.error("Subscribe error:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  }
);

// --- POST /api/plans/cancel — cancel current subscription (owner only) ---
router.post(
  "/cancel",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const subRepo = AppDataSource.getRepository(Subscription);

      const subscription = await subRepo.findOne({
        where: { tenant_id: req.tenantId },
        order: { created_at: "DESC" },
      });

      if (!subscription) {
        res.status(404).json({ error: "No subscription found" });
        return;
      }

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        res.status(400).json({ error: "Subscription is not active" });
        return;
      }

      subscription.status = SubscriptionStatus.CANCELED;
      await subRepo.save(subscription);

      res.json({ message: "Subscription canceled", subscription });
    } catch (err) {
      console.error("Cancel subscription error:", err);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  }
);

export { router as planRoutes };
