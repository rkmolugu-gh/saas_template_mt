import { AppDataSource } from "../data-source";
import { Plan } from "../../../backend/src/entities/Plan";
import { Subscription, SubscriptionStatus } from "../../../backend/src/entities/Subscription";

/**
 * Check if a tenant can access a given feature based on their active subscription plan.
 * Uses the Plan.limits object to check feature access.
 * Returns { allowed: boolean, limit: number | null }
 */
export async function canAccess(
  tenantId: string,
  featureKey: string
): Promise<{ allowed: boolean; limit: number | null }> {
  const subRepo = AppDataSource.getRepository(Subscription);

  // Find active or trialing subscription
  const subscription = await subRepo.findOne({
    where: [
      { tenant_id: tenantId, status: SubscriptionStatus.ACTIVE },
      { tenant_id: tenantId, status: SubscriptionStatus.TRIALING },
    ],
    relations: ["plan"],
    order: { created_at: "DESC" },
  });

  if (!subscription || !subscription.plan) {
    // No subscription - default to basic access for new tenants
    // You can change this to return false if you want to require a subscription
    return { allowed: false, limit: null };
  }

  // Check limits in the plan's limits object
  const limits = subscription.plan.limits as Record<string, unknown>;
  const limit = limits[`max_${featureKey}`] ?? limits[featureKey];

  // If limit is undefined, feature is not in plan limits (not allowed)
  // If limit is -1, it means unlimited
  // If limit is 0, it means not allowed
  // If limit is > 0, it means allowed with that limit
  if (limit === undefined || limit === null) {
    return { allowed: false, limit: null };
  }

  const numLimit = typeof limit === "number" ? limit : parseInt(String(limit), 10);
  const allowed = numLimit !== 0;

  return { allowed, limit: numLimit === -1 ? null : numLimit };
}

/**
 * Check if a tenant has exceeded a usage-based limit
 * @param tenantId The tenant ID
 * @param featureKey The feature key (e.g., "items", "files", "members")
 * @param currentUsage Current usage count
 */
export async function checkLimit(
  tenantId: string,
  featureKey: string,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number | null; remaining: number | null }> {
  const { allowed, limit } = await canAccess(tenantId, featureKey);

  if (!allowed) {
    return { allowed: false, limit: null, remaining: 0 };
  }

  // null limit means unlimited
  if (limit === null) {
    return { allowed: true, limit: null, remaining: null };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const withinLimit = currentUsage < limit;

  return { allowed: withinLimit, limit, remaining };
}
