import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Plan } from "./entities/Plan";
import { PlanFeature } from "./entities/PlanFeature";
import { User } from "./entities/User";
import { Tenant, TenantStatus } from "./entities/Tenant";
import { TenantMembership, MemberRole } from "./entities/TenantMembership";
import * as bcrypt from "bcryptjs";

const DEFAULT_FEATURES = ["tenants", "files", "items"];

const PLANS = [
  {
    name: "Free",
    monthly_price: 0,
    annual_price: null,
    is_active: true,
    limits: { max_members: 3, max_storage_mb: 100, max_items: 50 },
    featureLimits: { tenants: 1, files: 100, items: 50 },
  },
  {
    name: "Pro",
    monthly_price: 29,
    annual_price: 290,
    is_active: true,
    limits: { max_members: 20, max_storage_mb: 5000, max_items: 1000 },
    featureLimits: { tenants: 5, files: 5000, items: 1000 },
  },
  {
    name: "Enterprise",
    monthly_price: 99,
    annual_price: 990,
    is_active: true,
    limits: { max_members: -1, max_storage_mb: 50000, max_items: -1 },
    featureLimits: { tenants: -1, files: -1, items: -1 }, // -1 = unlimited
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log("Database connected. Seeding...");

  const planRepo = AppDataSource.getRepository(Plan);
  const pfRepo = AppDataSource.getRepository(PlanFeature);
  const userRepo = AppDataSource.getRepository(User);
  const tenantRepo = AppDataSource.getRepository(Tenant);
  const memberRepo = AppDataSource.getRepository(TenantMembership);

  // --- Plans & Features ---
  for (const p of PLANS) {
    let plan = await planRepo.findOneBy({ name: p.name });
    if (!plan) {
      plan = planRepo.create({
        name: p.name,
        monthly_price: p.monthly_price,
        annual_price: p.annual_price,
        is_active: p.is_active,
        limits: p.limits,
      });
      plan = await planRepo.save(plan);
      console.log(`  Created plan: ${plan.name}`);
    }

    for (const fk of DEFAULT_FEATURES) {
      const exists = await pfRepo.findOneBy({ plan_id: plan.id, feature_key: fk });
      if (!exists) {
        await pfRepo.save(
          pfRepo.create({
            plan_id: plan.id,
            feature_key: fk,
            enabled: true,
            limit_value: (p.featureLimits as Record<string, number>)[fk] ?? null,
          })
        );
      }
    }
  }
  console.log("  Plans & features seeded.");

  // --- Super Admin user ---
  const superEmail = "admin@saas-template.com";
  let superUser = await userRepo.findOneBy({ email: superEmail });
  if (!superUser) {
    superUser = userRepo.create({
      email: superEmail,
      full_name: "Super Admin",
      password_hash: await bcrypt.hash("admin123", 10),
    });
    superUser = await userRepo.save(superUser);
    console.log(`  Created super admin: ${superEmail}`);
  }

  // --- Default tenant ---
  const defaultSlug = "default";
  let defaultTenant = await tenantRepo.findOneBy({ slug: defaultSlug });
  if (!defaultTenant) {
    defaultTenant = tenantRepo.create({
      name: "Default Tenant",
      slug: defaultSlug,
      status: TenantStatus.ACTIVE,
      settings: {},
    });
    defaultTenant = await tenantRepo.save(defaultTenant);
    console.log(`  Created default tenant: ${defaultTenant.name}`);
  }

  // --- Super admin membership ---
  const existingMembership = await memberRepo.findOneBy({
    tenant_id: defaultTenant.id,
    user_id: superUser.id,
  });
  if (!existingMembership) {
    await memberRepo.save(
      memberRepo.create({
        tenant_id: defaultTenant.id,
        user_id: superUser.id,
        role: MemberRole.OWNER,
      })
    );
    console.log("  Super admin added as owner of default tenant.");
  }

  console.log("Seeding complete!");
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
