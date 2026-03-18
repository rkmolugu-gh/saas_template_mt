-- Migration SQL for Migration1773809065637
-- Generated from TypeORM migration file
-- PostgreSQL Compatible Version

-- ========================================
-- UP MIGRATION
-- ========================================

-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create independent tables first (no FK dependencies)
CREATE TABLE "plans" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "name" character varying(255) NOT NULL, 
    "stripe_price_id" character varying(255), 
    "monthly_price" numeric(10,2) NOT NULL, 
    "annual_price" numeric(10,2), 
    "is_active" boolean NOT NULL DEFAULT true, 
    "limits" jsonb NOT NULL DEFAULT '{}', 
    CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id")
);

CREATE TABLE "plan_features" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "plan_id" uuid NOT NULL, 
    "feature_key" character varying(255) NOT NULL, 
    "enabled" boolean NOT NULL DEFAULT true, 
    "limit_value" integer, 
    CONSTRAINT "PK_eb2b32d1d93a8b2e96e122e3a77" PRIMARY KEY ("id")
);

-- Enums and base tables
CREATE TYPE "public"."tenants_status_enum" AS ENUM('active', 'suspended', 'deleted');

CREATE TABLE "tenants" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "name" character varying(255) NOT NULL, 
    "slug" character varying(255) NOT NULL, 
    "custom_domain" character varying(255), 
    "logo_url" character varying(500), 
    "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'active', 
    "stripe_customer_id" character varying(255), 
    "settings" jsonb NOT NULL DEFAULT '{}', 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), 
    CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id")
);

CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('trialing', 'active', 'past_due', 'canceled');

CREATE TABLE "subscriptions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "plan_id" uuid NOT NULL, 
    "stripe_sub_id" character varying(255), 
    "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active', 
    "current_period_start" TIMESTAMP NOT NULL, 
    "current_period_end" TIMESTAMP NOT NULL, 
    CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "email" character varying(255) NOT NULL, 
    "full_name" character varying(255) NOT NULL, 
    "avatar_url" character varying(500), 
    "password_hash" character varying(255) NOT NULL, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), 
    CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
);

-- Tenant-dependent tables (after tenants exist)
CREATE TYPE "public"."tenant_memberships_role_enum" AS ENUM('owner', 'admin', 'member', 'viewer');

CREATE TABLE "tenant_memberships" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "user_id" uuid NOT NULL, 
    "role" "public"."tenant_memberships_role_enum" NOT NULL DEFAULT 'member', 
    "joined_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "PK_706d16104745b32d75df5836135" PRIMARY KEY ("id")
);

-- Create items table first (without current_revision_id FK)
CREATE TYPE "public"."items_status_enum" AS ENUM('draft', 'published', 'archived');

CREATE TABLE "items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "current_revision_id" uuid, 
    "title" character varying(255) NOT NULL, 
    "status" "public"."items_status_enum" NOT NULL DEFAULT 'draft', 
    "category" character varying(255), 
    "tags" jsonb, 
    "created_by" uuid NOT NULL, 
    "deleted_at" TIMESTAMP, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id")
);

-- Create revisions table (can reference items)
CREATE TABLE "item_revisions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "item_id" uuid NOT NULL, 
    "tenant_id" uuid NOT NULL, 
    "revision_number" integer NOT NULL, 
    "title" character varying(255) NOT NULL, 
    "body" text, 
    "data" jsonb, 
    "change_summary" character varying(500), 
    "created_by" uuid NOT NULL, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "PK_0e2563fa16456183133e019ce60" PRIMARY KEY ("id")
);

-- Other tenant tables
CREATE TABLE "notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "user_id" uuid NOT NULL, 
    "type" character varying(100) NOT NULL, 
    "title" character varying(255) NOT NULL, 
    "body" text NOT NULL, 
    "read_at" TIMESTAMP, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
);

CREATE TYPE "public"."invitations_role_enum" AS ENUM('owner', 'admin', 'member', 'viewer');

CREATE TABLE "invitations" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "email" character varying(255) NOT NULL, 
    "role" "public"."invitations_role_enum" NOT NULL DEFAULT 'member', 
    "token" character varying(255) NOT NULL, 
    "expires_at" TIMESTAMP NOT NULL, 
    "accepted_at" TIMESTAMP, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "UQ_e577dcf9bb6d084373ed3998509" UNIQUE ("token"), 
    CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "user_id" uuid NOT NULL, 
    "action" character varying(255) NOT NULL, 
    "resource_type" character varying(255) NOT NULL, 
    "resource_id" uuid, 
    "metadata" jsonb NOT NULL DEFAULT '{}', 
    "ip_address" character varying(45) NOT NULL, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id")
);

CREATE TABLE "files" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(), 
    "tenant_id" uuid NOT NULL, 
    "uploaded_by" uuid NOT NULL, 
    "name" character varying(255) NOT NULL, 
    "original_name" character varying(255) NOT NULL, 
    "mime_type" character varying(255) NOT NULL, 
    "size_bytes" bigint NOT NULL, 
    "storage_path" character varying(1000) NOT NULL, 
    "folder" character varying(500), 
    "description" text, 
    "is_public" boolean NOT NULL DEFAULT false, 
    "metadata" jsonb, 
    "deleted_at" TIMESTAMP, 
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id")
);

-- Add Foreign Key constraints (tables now exist)
ALTER TABLE "plan_features" ADD CONSTRAINT "FK_b51952483b18fa15334d714a838" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_f6ac03431c311ccb8bbd7d3af18" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "FK_d22937ebccd641b5090849e51f7" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "FK_7427b391abdef33b40124c15822" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "notifications" ADD CONSTRAINT "FK_d93ddd7e1b890535ecafbb334ec" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "items" ADD CONSTRAINT "FK_d7d027b642add7f0e77c36b874f" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "items" ADD CONSTRAINT "FK_25a958155bb9a9d741210749e07" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "items" ADD CONSTRAINT "FK_eaab8d80729c4c35433967cd02e" FOREIGN KEY ("current_revision_id") REFERENCES "item_revisions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "item_revisions" ADD CONSTRAINT "FK_1d424cf4729356d8dbdb690ecf7" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "item_revisions" ADD CONSTRAINT "FK_e4a03b780cb1e3bbce72f731cac" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "item_revisions" ADD CONSTRAINT "FK_794e274f57e95402c006e0a6c5f" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "invitations" ADD CONSTRAINT "FK_290e75d606ba89eb421b8b5ec49" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_6f18d459490bb48923b1f40bdb7" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "files" ADD CONSTRAINT "FK_484acb2ff8f3e134dfac8f01e8a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "files" ADD CONSTRAINT "FK_63c92c51cd7fd95c2d79d709b61" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add performance indexes
CREATE INDEX "IDX_tenant_slug" ON "tenants" ("slug");
CREATE INDEX "IDX_items_tenant_status" ON "items" ("tenant_id", "status");
CREATE INDEX "IDX_item_revisions_item" ON "item_revisions" ("item_id");
CREATE INDEX "IDX_files_tenant" ON "files" ("tenant_id");

-- ========================================
-- DOWN MIGRATION
-- ========================================

-- Drop FK constraints first (reverse order of creation)
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "FK_63c92c51cd7fd95c2d79d709b61";
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "FK_484acb2ff8f3e134dfac8f01e8a";
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_bd2726fd31b35443f2245b93ba0";
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_6f18d459490bb48923b1f40bdb7";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "FK_290e75d606ba89eb421b8b5ec49";
ALTER TABLE "item_revisions" DROP CONSTRAINT IF EXISTS "FK_794e274f57e95402c006e0a6c5f";
ALTER TABLE "item_revisions" DROP CONSTRAINT IF EXISTS "FK_e4a03b780cb1e3bbce72f731cac";
ALTER TABLE "item_revisions" DROP CONSTRAINT IF EXISTS "FK_1d424cf4729356d8dbdb690ecf7";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "FK_eaab8d80729c4c35433967cd02e";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "FK_25a958155bb9a9d741210749e07";
ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "FK_d7d027b642add7f0e77c36b874f";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_9a8a82462cab47c73d25f49261f";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_d93ddd7e1b890535ecafbb334ec";
ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "FK_7427b391abdef33b40124c15822";
ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "FK_d22937ebccd641b5090849e51f7";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_e45fca5d912c3a2fab512ac25dc";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_f6ac03431c311ccb8bbd7d3af18";
ALTER TABLE "plan_features" DROP CONSTRAINT IF EXISTS "FK_b51952483b18fa15334d714a838";

-- Drop indexes
DROP INDEX IF EXISTS "IDX_tenant_slug";
DROP INDEX IF EXISTS "IDX_items_tenant_status";
DROP INDEX IF EXISTS "IDX_item_revisions_item";
DROP INDEX IF EXISTS "IDX_files_tenant";

-- Drop tables (dependency order: dependents first)
DROP TABLE IF EXISTS "files";
DROP TABLE IF EXISTS "audit_logs";
DROP TABLE IF EXISTS "invitations";
DROP TABLE IF EXISTS "item_revisions";
DROP TABLE IF EXISTS "items";
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "tenant_memberships";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "tenants";
DROP TABLE IF EXISTS "plans";
DROP TABLE IF EXISTS "plan_features";

-- Drop enums (after all dependent tables)
DROP TYPE IF EXISTS "public"."invitations_role_enum";
DROP TYPE IF EXISTS "public"."items_status_enum";
DROP TYPE IF EXISTS "public"."tenant_memberships_role_enum";
DROP TYPE IF EXISTS "public"."tenants_status_enum";
DROP TYPE IF EXISTS "public"."subscriptions_status_enum";

-- Drop extensions
DROP EXTENSION IF EXISTS "pgcrypto";
DROP EXTENSION IF EXISTS "uuid-ossp";
