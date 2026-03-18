import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Plan } from "./entities/Plan";
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

const PLANS = [
  {
    name: "Free",
    stripe_price_id: "price_free_monthly",
    monthly_price: 0,
    annual_price: null,
    is_active: true,
    limits: { max_members: 3, max_storage_mb: 100, max_items: 50, max_tenants: 1 },
  },
  {
    name: "Pro",
    stripe_price_id: "price_pro_monthly",
    monthly_price: 29.99,
    annual_price: 299.99,
    is_active: true,
    limits: { max_members: 10, max_storage_mb: 5000, max_items: 500, max_tenants: 3 },
  },
  {
    name: "Enterprise",
    stripe_price_id: "price_enterprise_monthly",
    monthly_price: 99.99,
    annual_price: 999.99,
    is_active: true,
    limits: { max_members: -1, max_storage_mb: 50000, max_items: -1, max_tenants: -1 },
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log("Database connected. Seeding...");

  const planRepo = AppDataSource.getRepository(Plan);
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

  // --- Plans ---
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
  }
  console.log("  Plans seeded.");

  // --- Users ---
  const users: User[] = [];
  const userData = [
    { email: "admin@saas-template.com", full_name: "Super Admin", avatar_url: "https://example.com/avatar1.jpg" },
    { email: "john.doe@example.com", full_name: "John Doe", avatar_url: "https://example.com/avatar2.jpg" },
    { email: "jane.smith@example.com", full_name: "Jane Smith", avatar_url: "https://example.com/avatar3.jpg" },
    { email: "mike.wilson@example.com", full_name: "Mike Wilson", avatar_url: "https://example.com/avatar4.jpg" },
    { email: "sarah.jones@example.com", full_name: "Sarah Jones", avatar_url: "https://example.com/avatar5.jpg" },
    { email: "david.brown@example.com", full_name: "David Brown", avatar_url: "https://example.com/avatar6.jpg" },
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
    { 
      name: "Default Tenant", 
      slug: "default", 
      custom_domain: null, 
      logo_url: "https://example.com/logo1.png", 
      stripe_customer_id: "cus_default123",
      status: TenantStatus.ACTIVE,
      settings: { theme: "dark", language: "en", timezone: "UTC", notifications: true }
    },
    { 
      name: "Acme Corp", 
      slug: "acme-corp", 
      custom_domain: "acme.example.com", 
      logo_url: "https://example.com/logo2.png", 
      stripe_customer_id: "cus_acme456",
      status: TenantStatus.ACTIVE,
      settings: { theme: "light", language: "en", timezone: "America/New_York", notifications: true }
    },
    { 
      name: "Tech Startup", 
      slug: "tech-startup", 
      custom_domain: "tech.example.com", 
      logo_url: "https://example.com/logo3.png", 
      stripe_customer_id: "cus_tech789",
      status: TenantStatus.ACTIVE,
      settings: { theme: "dark", language: "en", timezone: "Europe/London", notifications: false }
    },
    { 
      name: "Digital Agency", 
      slug: "digital-agency", 
      custom_domain: "agency.example.com", 
      logo_url: "https://example.com/logo4.png", 
      stripe_customer_id: "cus_agency012",
      status: TenantStatus.SUSPENDED,
      settings: { theme: "light", language: "es", timezone: "Europe/Madrid", notifications: true }
    },
    { 
      name: "E-commerce Store", 
      slug: "ecommerce-store", 
      custom_domain: "shop.example.com", 
      logo_url: "https://example.com/logo5.png", 
      stripe_customer_id: "cus_shop345",
      status: TenantStatus.ACTIVE,
      settings: { theme: "dark", language: "en", timezone: "Asia/Tokyo", notifications: true }
    },
  ];

  for (const tenant of tenantData) {
    let existingTenant = await tenantRepo.findOneBy({ slug: tenant.slug });
    if (!existingTenant) {
      const newTenant = tenantRepo.create({
        name: tenant.name,
        slug: tenant.slug,
        custom_domain: tenant.custom_domain,
        logo_url: tenant.logo_url,
        status: tenant.status,
        stripe_customer_id: tenant.stripe_customer_id,
        settings: tenant.settings,
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
    { tenant: tenants[0], user: users[2], role: MemberRole.MEMBER },
    { tenant: tenants[1], user: users[1], role: MemberRole.OWNER },
    { tenant: tenants[1], user: users[2], role: MemberRole.ADMIN },
    { tenant: tenants[1], user: users[3], role: MemberRole.MEMBER },
    { tenant: tenants[2], user: users[3], role: MemberRole.OWNER },
    { tenant: tenants[2], user: users[4], role: MemberRole.VIEWER },
    { tenant: tenants[3], user: users[4], role: MemberRole.OWNER },
    { tenant: tenants[4], user: users[5], role: MemberRole.OWNER },
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
  const subscriptionData = [
    { tenant: tenants[0], plan: createdPlans[0], status: SubscriptionStatus.ACTIVE }, // Free
    { tenant: tenants[1], plan: createdPlans[1], status: SubscriptionStatus.ACTIVE }, // Pro
    { tenant: tenants[2], plan: createdPlans[2], status: SubscriptionStatus.TRIALING }, // Enterprise
    { tenant: tenants[3], plan: createdPlans[1], status: SubscriptionStatus.PAST_DUE }, // Pro
    { tenant: tenants[4], plan: createdPlans[2], status: SubscriptionStatus.CANCELED }, // Enterprise
  ];

  for (const sub of subscriptionData) {
    const exists = await subscriptionRepo.findOneBy({ tenant_id: sub.tenant.id });
    if (!exists) {
      const subscription = subscriptionRepo.create({
        tenant_id: sub.tenant.id,
        plan_id: sub.plan.id,
        stripe_sub_id: `sub_${uuidv4()}`,
        status: sub.status,
        current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      });
      await subscriptionRepo.save(subscription);
      console.log(`  Created subscription for: ${sub.tenant.name} (${sub.plan.name})`);
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
      metadata: { version: "1.0", category: "documentation", author: "Admin" },
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
      metadata: { width: 200, height: 200, category: "branding", format: "PNG" },
    },
    {
      name: "user-manual.docx",
      original_name: "User Manual.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size_bytes: 2048000,
      storage_path: "/uploads/user-manual.docx",
      folder: "documents",
      description: "Comprehensive user manual",
      is_public: false,
      metadata: { pages: 45, category: "documentation", version: "2.1" },
    },
    {
      name: "product-screenshot.jpg",
      original_name: "Product Screenshot.jpg",
      mime_type: "image/jpeg",
      size_bytes: 256000,
      storage_path: "/uploads/product-screenshot.jpg",
      folder: "marketing",
      description: "Product screenshot for marketing",
      is_public: true,
      metadata: { width: 1920, height: 1080, category: "marketing", quality: "high" },
    },
    {
      name: "financial-report.xlsx",
      original_name: "Financial Report Q1.xlsx",
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size_bytes: 512000,
      storage_path: "/uploads/financial-report.xlsx",
      folder: "finance",
      description: "Q1 financial report",
      is_public: false,
      metadata: { quarter: "Q1", year: 2024, category: "finance" },
    },
  ];

  for (let i = 0; i < fileData.length && i < tenants.length; i++) {
    const file = fileData[i];
    const newFile = fileRepo.create({
      tenant_id: tenants[i].id,
      uploaded_by: users[i % users.length].id,
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
      body: "Welcome to our platform! This guide will help you get started with all the features and capabilities. We'll walk you through the setup process, basic functionality, and advanced features.",
      change_summary: "Initial version",
    },
    {
      title: "Product Roadmap 2024",
      status: ItemStatus.DRAFT,
      category: "planning",
      tags: ["roadmap", "features", "planning", "2024"],
      body: "Here's our upcoming product roadmap for 2024. We're planning to release new features including advanced analytics, improved UI, and enhanced security measures.",
      change_summary: "Draft roadmap for Q1-Q4 2024",
    },
    {
      title: "API Documentation",
      status: ItemStatus.PUBLISHED,
      category: "technical",
      tags: ["api", "documentation", "developers"],
      body: "Complete API documentation with endpoints, authentication methods, request/response formats, and code examples for integration.",
      change_summary: "Updated API endpoints",
    },
    {
      title: "Security Best Practices",
      status: ItemStatus.PUBLISHED,
      category: "security",
      tags: ["security", "best-practices", "guidelines"],
      body: "Comprehensive guide to security best practices including password policies, data encryption, access control, and compliance requirements.",
      change_summary: "Added new security guidelines",
    },
    {
      title: "Troubleshooting Guide",
      status: ItemStatus.ARCHIVED,
      category: "support",
      tags: ["troubleshooting", "support", "faq"],
      body: "Common issues and their solutions. This guide covers login problems, data sync issues, and performance optimization tips.",
      change_summary: "Archived old troubleshooting content",
    },
  ];

  for (let i = 0; i < itemData.length && i < tenants.length; i++) {
    const item = itemData[i];
    const newItem = itemRepo.create({
      tenant_id: tenants[i].id,
      created_by: users[i % users.length].id,
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
      data: { content: item.body, wordCount: item.body.split(" ").length, category: item.category },
      change_summary: item.change_summary,
      created_by: users[i % users.length].id,
    });
    const savedRevision = await itemRevisionRepo.save(revision);

    // Update item with current revision
    savedItem.current_revision_id = savedRevision.id;
    await itemRepo.save(savedItem);

    console.log(`  Created item: ${item.title} for ${tenants[i].name}`);
  }

  // --- Invitations ---
  const invitationData = [
    { email: "alice.wilson@example.com", role: MemberRole.ADMIN },
    { email: "bob.johnson@example.com", role: MemberRole.MEMBER },
    { email: "carol.davis@example.com", role: MemberRole.VIEWER },
    { email: "david.miller@example.com", role: MemberRole.MEMBER },
    { email: "emma.garcia@example.com", role: MemberRole.ADMIN },
  ];

  for (let i = 0; i < invitationData.length && i < tenants.length; i++) {
    const invitation = invitationRepo.create({
      tenant_id: tenants[i].id,
      email: invitationData[i].email,
      role: invitationData[i].role,
      token: uuidv4(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    await invitationRepo.save(invitation);
    console.log(`  Created invitation for: ${invitationData[i].email} -> ${tenants[i].name}`);
  }

  // --- Notifications ---
  const notificationData = [
    {
      type: "welcome",
      title: "Welcome to the platform!",
      body: "Thank you for joining our platform. Here's how to get started with all the amazing features we offer.",
    },
    {
      type: "item_created",
      title: "New item created",
      body: "A new item has been created in your tenant. Check it out and let us know what you think!",
    },
    {
      type: "subscription_updated",
      title: "Subscription updated",
      body: "Your subscription has been successfully updated. New features are now available.",
    },
    {
      type: "team_member_joined",
      title: "New team member joined",
      body: "A new team member has joined your tenant. Help them get familiar with the platform.",
    },
    {
      type: "system_maintenance",
      title: "Scheduled maintenance",
      body: "We will be performing scheduled maintenance this weekend. Service may be temporarily unavailable.",
    },
  ];

  for (let i = 0; i < notificationData.length && i < users.length; i++) {
    const notification = notificationRepo.create({
      tenant_id: tenants[i % tenants.length].id,
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
      metadata: { ip: "192.168.1.100", userAgent: "Chrome/120.0", location: "New York" },
      ip_address: "192.168.1.100",
    },
    {
      action: "tenant.created",
      resource_type: "tenant",
      resource_id: tenants[0].id,
      metadata: { plan: "Free", createdBy: users[0].email },
      ip_address: "192.168.1.101",
    },
    {
      action: "item.created",
      resource_type: "item",
      resource_id: items[0]?.id,
      metadata: { title: items[0]?.title, category: "documentation" },
      ip_address: "192.168.1.102",
    },
    {
      action: "file.uploaded",
      resource_type: "file",
      resource_id: files[0]?.id,
      metadata: { filename: files[0]?.name, size: files[0]?.size_bytes },
      ip_address: "192.168.1.103",
    },
    {
      action: "subscription.changed",
      resource_type: "subscription",
      resource_id: null,
      metadata: { oldPlan: "Free", newPlan: "Pro", tenant: tenants[1]?.name },
      ip_address: "192.168.1.104",
    },
  ];

  for (let i = 0; i < auditLogData.length && i < users.length; i++) {
    const auditLog = auditLogRepo.create({
      tenant_id: tenants[i % tenants.length].id,
      user_id: users[i].id,
      ...auditLogData[i],
    });
    await auditLogRepo.save(auditLog);
    console.log(`  Created audit log for: ${auditLogData[i].action}`);
  }

  console.log("Seeding complete!");
  console.log(`  Created ${users.length} users`);
  console.log(`  Created ${tenants.length} tenants`);
  console.log(`  Created ${memberships.length} memberships`);
  console.log(`  Created ${files.length} files`);
  console.log(`  Created ${items.length} items`);
  console.log(`  Created ${Math.min(invitationData.length, tenants.length)} invitations`);
  console.log(`  Created ${Math.min(notificationData.length, users.length)} notifications`);
  console.log(`  Created ${Math.min(auditLogData.length, users.length)} audit logs`);
  
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
