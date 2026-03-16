import { AppDataSource } from "../data-source";
import { PlanFeature } from "../../../backend/src/entities/PlanFeature";
import { Subscription } from "../../../backend/src/entities/Subscription";

/**
 * Check if a tenant can access a given feature based on their active subscription plan.
 * Returns { allowed: boolean, limit: number | null }
 */
export async function canAccess(
  tenantId: string,
  featureKey: string
): Promise<{ allowed: boolean; limit: number | null }> {
  const subRepo = AppDataSource.getRepository(Subscription);
  const pfRepo = AppDataSource.getRepository(PlanFeature);

  // Find active subscription
  const subscription = await subRepo.findOne({
    where: { tenant_id: tenantId, status: "active" as any },
    order: { current_period_end: "DESC" },
  });

  if (!subscription) {
    return { allowed: false, limit: null };
  }

  // Find feature for the plan
  const feature = await pfRepo.findOneBy({
    plan_id: subscription.plan_id,
    feature_key: featureKey,
  });

  if (!feature) {
    return { allowed: false, limit: null };
  }

  return { allowed: feature.enabled, limit: feature.limit_value };
}
