import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { Plan } from "../../../backend/src/entities/Plan";
import { Subscription, SubscriptionStatus } from "../../../backend/src/entities/Subscription";
import { authenticate } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";

const router = Router();

// GET /api/plans — list all active plans
router.get("/", async (_req, res: Response) => {
  try {
    const plans = await AppDataSource.getRepository(Plan).find({
      where: { is_active: true },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Failed to list plans" });
  }
});

// GET /api/plans/subscription — get current tenant's subscription
router.get("/subscription", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const sub = await AppDataSource.getRepository(Subscription).findOne({
      where: { tenant_id: req.tenantId },
      relations: ["plan"],
      order: { current_period_end: "DESC" },
    });
    res.json(sub || null);
  } catch (err) {
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

// POST /api/plans/subscribe — subscribe tenant to a plan
router.post("/subscribe", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const { plan_id } = req.body;
    const subRepo = AppDataSource.getRepository(Subscription);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = subRepo.create({
      tenant_id: req.tenantId!,
      plan_id,
      status: SubscriptionStatus.ACTIVE,
      current_period_start: now,
      current_period_end: periodEnd,
    });
    const saved = await subRepo.save(subscription);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

export { router as planRoutes };
