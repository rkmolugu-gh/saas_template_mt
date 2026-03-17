import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Plan } from "./entities/Plan";
import { PlanFeature } from "./entities/PlanFeature";
import { User } from "./entities/User";
import { Tenant, TenantStatus } from "./entities/Tenant";
import { TenantMembership, MemberRole } from "./entities/TenantMembership";
import { Subscription, SubscriptionStatus } from "./entities/Subscription";
import { File } from "./entities/File";
import { Item, ItemStatus } from "./entities/Item";
import { ItemRevision } from "./entities/ItemRevision";
import { Invitation } from "./entities/Invitation";
import { Notification } from "./entities/Notification";
import { AuditLog } from "./entities/AuditLog";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_FEATURES = ["tenants", "files", "items"];

const PLANS = [
  {
    name: "Free",
    stripe_price_id: "price_free_monthly",
    monthly_price: 0,
    annual_price: null,
    is_active: true,
    limits: { max_members: 3, max_storage_mb: 100, max_items: 50 },
    featureLimits: { tenants: 1, files: 100, items: 50 },
  },
  {
    name: "Pro",
    stripe_price_id: "price_pro_monthly",
    monthly_price: 29,
    annual_price: 290,
    is_active: true,
    limits: { max_members: 20, max_storage_mb: 5000, max_items: 1000 },
    featureLimits: { tenants: 5, files: 5000, items: 1000 },
  },
  {
    name: "Enterprise",
    stripe_price_id: "price_enterprise_monthly",
    monthly_price: 99,
    annual_price: 990,
    is_active: true,
    limits: { max_members: -1, max_storage_mb: 50000, max_items: -1 },
    featureLimits: { tenants: -1, files: -1, items: -1 },
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
  const subscriptionRepo = AppDataSource.getRepository(Subscription);
  const fileRepo = AppDataSource.getRepository(File);
  const itemRepo = AppDataSource.getRepository(Item);
  const itemRevisionRepo = AppDataSource.getRepository(ItemRevision);
  const invitationRepo = AppDataSource.getRepository(Invitation);
  const notificationRepo = AppDataSource.getRepository(Notification);
  const auditLogRepo = AppDataSource.getRepository(AuditLog);

  // --- Plans & Features ---
  const createdPlans: Plan[] = [];
  for (const p of PLANS) {
    let plan = await planRepo.findOneBy({ name: p.name });
    if (!plan) {
      plan = planRepo.create({
        name: p.name,
        stripe_price_id: p.stripe_price_id,
        monthly_price: p.monthly_price,
        annual_price: p.annual_price,
        is_active: p.is_active,
        limits: p.limits,
      });
      plan = await planRepo.save(plan);
      console.log(`  Created plan: ${plan.name}`);
    }
    createdPlans.push(plan);

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

  // --- Users ---
  const users: User[] = [];
  const userData = [
    { email: "admin@saas-template.com", full_name: "Super Admin", avatar_url: "https://example.com/avatar1.jpg" },
    { email: "john.doe@example.com", full_name: "John Doe", avatar_url: "https://example.com/avatar2.jpg" },
    { email: "jane.smith@example.com", full_name: "Jane Smith", avatar_url: "https://example.com/avatar3.jpg" },
  ];

  for (const user of userData) {
    let existingUser = await userRepo.findOneBy({ email: user.email });
    if (!existingUser) {
      const newUser = userRepo.create({
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        password_hash: await bcrypt.hash("password123", 10),
      });
      const savedUser = await userRepo.save(newUser);
      users.push(savedUser);
      console.log(`  Created user: ${user.email}`);
    } else {
      users.push(existingUser);
    }
  }

  // --- Tenants ---
  const tenants: Tenant[] = [];
  const tenantData = [
    { name: "Default Tenant", slug: "default", custom_domain: null, logo_url: "https://example.com/logo1.png", stripe_customer_id: "cus_default123" },
    { name: "Acme Corp", slug: "acme-corp", custom_domain: "acme.example.com", logo_url: "https://example.com/logo2.png", stripe_customer_id: "cus_acme456" },
  ];

  for (const tenant of tenantData) {
    let existingTenant = await tenantRepo.findOneBy({ slug: tenant.slug });
    if (!existingTenant) {
      const newTenant = tenantRepo.create({
        name: tenant.name,
        slug: tenant.slug,
        custom_domain: tenant.custom_domain,
        logo_url: tenant.logo_url,
        status: TenantStatus.ACTIVE,
        stripe_customer_id: tenant.stripe_customer_id,
        settings: { theme: "dark", language: "en", timezone: "UTC" },
      });
      const savedTenant = await tenantRepo.save(newTenant);
      tenants.push(savedTenant);
      console.log(`  Created tenant: ${tenant.name}`);
    } else {
      tenants.push(existingTenant);
    }
  }

  // --- Tenant Memberships ---
  const memberships: TenantMembership[] = [];
  const membershipData = [
    { tenant: tenants[0], user: users[0], role: MemberRole.OWNER },
    { tenant: tenants[0], user: users[1], role: MemberRole.ADMIN },
    { tenant: tenants[1], user: users[1], role: MemberRole.OWNER },
    { tenant: tenants[1], user: users[2], role: MemberRole.MEMBER },
  ];

  for (const membership of membershipData) {
    if (membership.tenant && membership.user) {
      const exists = await memberRepo.findOneBy({
        tenant_id: membership.tenant.id,
        user_id: membership.user.id,
      });
      if (!exists) {
        const newMembership = memberRepo.create({
          tenant_id: membership.tenant.id,
          user_id: membership.user.id,
          role: membership.role,
        });
        const savedMembership = await memberRepo.save(newMembership);
        memberships.push(savedMembership);
        console.log(`  Created membership: ${membership.user.email} -> ${membership.tenant.name}`);
      }
    }
  }

  // --- Subscriptions ---
  for (const tenant of tenants) {
    const exists = await subscriptionRepo.findOneBy({ tenant_id: tenant.id });
    if (!exists) {
      const subscription = subscriptionRepo.create({
        tenant_id: tenant.id,
        plan_id: createdPlans[0].id, // Free plan
        stripe_sub_id: `sub_${uuidv4()}`,
        status: SubscriptionStatus.ACTIVE,
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
      await subscriptionRepo.save(subscription);
      console.log(`  Created subscription for: ${tenant.name}`);
    }
  }

  // --- Files ---
  const files: File[] = [];
  const fileData = [
    {
      name: "welcome-document.pdf",
      original_name: "Welcome Document.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024000,
      storage_path: "/uploads/welcome-document.pdf",
      folder: "documents",
      description: "Welcome document for new users",
      is_public: false,
      metadata: { version: "1.0", category: "documentation" },
    },
    {
      name: "company-logo.png",
      original_name: "Company Logo.png",
      mime_type: "image/png",
      size_bytes: 51200,
      storage_path: "/uploads/company-logo.png",
      folder: "images",
      description: "Company logo",
      is_public: true,
      metadata: { width: 200, height: 200, category: "branding" },
    },
  ];

  for (let i = 0; i < fileData.length && i < tenants.length; i++) {
    const file = fileData[i];
    const newFile = fileRepo.create({
      tenant_id: tenants[i].id,
      uploaded_by: users[i].id,
      ...file,
    });
    const savedFile = await fileRepo.save(newFile);
    files.push(savedFile);
    console.log(`  Created file: ${file.name} for ${tenants[i].name}`);
  }

  // --- Items & Item Revisions ---
  const items: Item[] = [];
  const itemData = [
    {
      title: "Getting Started Guide",
      status: ItemStatus.PUBLISHED,
      category: "documentation",
      tags: ["guide", "tutorial", "beginner"],
      body: "Welcome to our platform! This guide will help you get started...",
      change_summary: "Initial version",
    },
    {
      title: "Product Roadmap",
      status: ItemStatus.DRAFT,
      category: "planning",
      tags: ["roadmap", "features", "planning"],
      body: "Here's our upcoming product roadmap...",
      change_summary: "Draft roadmap",
    },
  ];

  for (let i = 0; i < itemData.length && i < tenants.length; i++) {
    const item = itemData[i];
    const newItem = itemRepo.create({
      tenant_id: tenants[i].id,
      created_by: users[i].id,
      title: item.title,
      status: item.status,
      category: item.category,
      tags: item.tags,
    });
    const savedItem = await itemRepo.save(newItem);
    items.push(savedItem);

    // Create revision for the item
    const revision = itemRevisionRepo.create({
      item_id: savedItem.id,
      tenant_id: tenants[i].id,
      revision_number: 1,
      title: item.title,
      body: item.body,
      data: { content: item.body, wordCount: item.body.split(" ").length },
      change_summary: item.change_summary,
      created_by: users[i].id,
    });
    const savedRevision = await itemRevisionRepo.save(revision);

    // Update item with current revision
    savedItem.current_revision_id = savedRevision.id;
    await itemRepo.save(savedItem);

    console.log(`  Created item: ${item.title} for ${tenants[i].name}`);
  }

  // --- Invitations ---
  for (let i = 0; i < tenants.length; i++) {
    const invitation = invitationRepo.create({
      tenant_id: tenants[i].id,
      email: `invite${i + 1}@example.com`,
      role: MemberRole.MEMBER,
      token: uuidv4(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    await invitationRepo.save(invitation);
    console.log(`  Created invitation for: ${tenants[i].name}`);
  }

  // --- Notifications ---
  const notificationData = [
    {
      type: "welcome",
      title: "Welcome to the platform!",
      body: "Thank you for joining. Here's how to get started...",
    },
    {
      type: "item_created",
      title: "New item created",
      body: "A new item has been created in your tenant.",
    },
  ];

  for (let i = 0; i < notificationData.length && i < users.length; i++) {
    const notification = notificationRepo.create({
      tenant_id: tenants[0].id,
      user_id: users[i].id,
      ...notificationData[i],
    });
    await notificationRepo.save(notification);
    console.log(`  Created notification for: ${users[i].email}`);
  }

  // --- Audit Logs ---
  const auditLogData = [
    {
      action: "user.login",
      resource_type: "user",
      resource_id: users[0].id,
      metadata: { browser: "Chrome", os: "Windows" },
      ip_address: "192.168.1.100",
    },
    {
      action: "tenant.create",
      resource_type: "tenant",
      resource_id: tenants[0].id,
      metadata: { name: tenants[0].name },
      ip_address: "192.168.1.100",
    },
  ];

  for (let i = 0; i < auditLogData.length; i++) {
    const auditLog = auditLogRepo.create({
      tenant_id: tenants[0].id,
      user_id: users[0].id,
      ...auditLogData[i],
    });
    await auditLogRepo.save(auditLog);
    console.log(`  Created audit log: ${auditLogData[i].action}`);
  }

  console.log("Seeding complete!");
  console.log(`  Created ${users.length} users`);
  console.log(`  Created ${tenants.length} tenants`);
  console.log(`  Created ${memberships.length} memberships`);
  console.log(`  Created ${files.length} files`);
  console.log(`  Created ${items.length} items`);
  console.log(`  Created ${tenants.length} invitations`);
  console.log(`  Created ${notificationData.length} notifications`);
  console.log(`  Created ${auditLogData.length} audit logs`);
  
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
