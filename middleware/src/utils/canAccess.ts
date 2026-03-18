import { AppDataSource } from "../data-source";
import { Plan } from "../../../backend/src/entities/Plan";
import { Subscription } from "../../../backend/src/entities/Subscription";

/**
 * Check if a tenant can access a given feature based on their active subscription plan.
 * Uses the Plan.limits object instead of PlanFeature entity.
 * Returns { allowed: boolean, limit: number | null }
 */
export async function canAccess(
  tenantId: string,
  featureKey: string
): Promise<{ allowed: boolean; limit: number | null }> {
  const subRepo = AppDataSource.getRepository(Subscription);
  const planRepo = AppDataSource.getRepository(Plan);

  // Find active subscription
  const subscription = await subRepo.findOne({
    where: { tenant_id: tenantId, status: "active" as any },
    relations: ["plan"],
    order: { current_period_end: "DESC" },
  });

  if (!subscription || !subscription.plan) {
    return { allowed: false, limit: null };
  }

  // Check limits in the plan's limits object
  const limits = subscription.plan.limits as Record<string, any>;
  const limit = limits[`max_${featureKey}`] || limits[featureKey];

  // If limit is -1, it means unlimited
  // If limit is 0, it means not allowed
  // If limit is > 0, it means allowed with that limit
  const allowed = limit === undefined ? false : limit !== 0;

  return { allowed, limit: limit === -1 ? null : limit };
}
