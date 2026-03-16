# Product Requirements Document (PRD)

## Phases
- three phases phase1 phase2 phase3
- all requiremens unless specified are for phase 1
- requirements for phase 2 and phase 3 are for future


## Generic Multitenant SaaS Template

**Version:** 1.0  
**Date:** 2026-03-16  
**Status:** Draft  

---

## 1. Overview

A production-ready, generic multitenant SaaS starter template that accelerates building any subscription-based web application. It provides tenant isolation, user management, role-based access, billing integration, and a polished UI — so teams can skip the boilerplate and focus on domain-specific features.

### 1.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS |
| Backend / Auth | PostgreSQL |
| ORM / DB | TypeORM + PostgreSQL (via Supabase) |
| Hosting | Vercel
| User Registration - User Email + Tenand ID + Password |
| middleware - Express API with basic Auth |
### 1.2 Goals

- **Zero-to-SaaS in hours**, not weeks.
- **Tenant-isolated by default** — data, config, and billing are scoped per tenant.
- **Extensible** — clean module boundaries so teams can add domain features without touching the core.
- **Production-grade** — proper auth, RBAC, audit logging, and error handling from day one.

### 1.3 Non-Goals

- Not a full vertical product (e.g., not a CRM or project-management tool). Domain features are the consumer's responsibility.
- No mobile-native apps (responsive web only).
- No self-hosted / on-premise deployment guide in V1.

---

## 2. Multitenancy Model

### 2.1 Isolation Strategy

**Shared database, shared schema, tenant-scoped rows (Row-Level Security).**

- Every tenant-owned table includes a `tenant_id` column.
- Supabase RLS policies enforce that users can only read/write rows belonging to their tenant.
- TypeORM global subscribers & entity listeners automatically inject `tenant_id` on insert and filter on read.

### 2.2 Tenant Identification

| Method | Description |
|---|---|
| Subdomain | `acme.app.com` → resolves `acme` to a tenant record |
| Custom domain | Tenants on paid plans can map a custom domain |
| Path-based (fallback) | `app.com/t/acme` for environments where wildcard DNS isn't available |

### 2.3 Tenant Lifecycle

```
User Sign up should ask Tenant ID
superadmin/admin has access to all tenants
Tenant Signup → Provision tenant and a tenant admin for the tenant

```

---

## 3. Authentication & Authorization

### 3.1 Authentication - 
- Simple Email + password sign-up / sign-in.
- initially store users in backend users.txt file
- Magic link (passwordless).
- OAuth social providers (Google, GitHub — configurable).
- MFA / TOTP (opt-in per tenant).
- Session management with JWT + refresh tokens.

### 3.2 Authorization (RBAC)

#### Default Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Super Admin** | Platform-wide | Manage all tenants, impersonate users, view global analytics |
| **Tenant Owner** | Single tenant | Full control: billing, members, settings, data |
| **Admin** | Single tenant | Manage members, settings, data (no billing) |
| **Member** | Single tenant | CRUD on tenant data as permitted |
| **Viewer** | Single tenant | Read-only access |

- Roles are stored in a `tenant_memberships` join table (`user_id`, `tenant_id`, `role`).
- Permissions are evaluated via middleware / hooks on every API call and in the frontend via a `<Can>` wrapper component.
- Roles and permissions are **extensible** — consumers can add custom roles / granular permissions.

### 3.3 Invitation Flow

1. Admin enters email → system creates an `invitation` record (token, role, expiry).
2. Invitee receives email with a magic link.
3. On accept: if new user → sign-up flow then auto-join tenant; if existing user → auto-join tenant.

---

## 4. Core Features

### 4.0 Default Features

The template ships with three built-in domain features enabled for every tenant by default:

| Feature | Description | Feature Key |
|---|---|---|
| **Tenants** | Tenant creation, settings, and lifecycle management | `tenants` |
| **Files** | File upload, browse, preview, and sharing (Supabase Storage) | `files` |
| **Items** | Revisable items with full version history & rollback | `items` |

These are the default entries seeded into `plan_features` for all plans. Consumers can add additional domain features following the same pattern.

### 4.1 Tenant Management

- Create / rename / delete tenant.
- Tenant settings page (name, logo, timezone, locale).
- Tenant switcher in the sidebar for users belonging to multiple tenants.

### 4.2 User & Member Management

- Profile page (avatar, name, email, password change).
- Members list with role badges, invite / remove / change role actions.
- Activity log per user.

### 4.3 Billing & Subscriptions

- Plans defined in a `plans` table (name, price, feature flags, limits).
- Simple Payment form. Default 100 for each user. 
- Simple form  for plan changes, payment method updates, invoices.
- Webhook handler for `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Phase 2 Usage-based metering support (optional — report usage via Edge Functions).
- Grace period + suspension logic on failed payment.

### 4.4 Feature Flags & Plan Limits

- `plan_features` table linking plans to feature keys + limits.
- Default feature keys seeded for all plans: `tenants`, `files`, `items`.
- Runtime check utility: `canAccess(tenantId, featureKey): boolean`.
- UI gating: disabled buttons / upgrade prompts for locked features.

### 4.5 Notifications

- In-app notification center (bell icon + dropdown).
- Email notifications for critical events (invite, billing, alerts).
- Notification preferences per user.

### 4.6 Audit Log

- Immutable `audit_logs` table: `id`, `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `ip`, `created_at`.
- Automatically populated via TypeORM subscribers on create / update / delete.
- Searchable & filterable audit log page for tenant admins.

### 4.7 Admin Dashboard (Platform Super Admin)

- Global tenant list with status, plan, member count, MRR.
- Impersonate user (login-as) for support.
- System health metrics (placeholder hooks for Prometheus / Grafana).

### 4.8 File Management

- **Upload** — drag-and-drop or file-picker upload to Supabase Storage, scoped to the tenant.
- **Browse & organize** — list files in a table/grid view with virtual folder support.
- **Preview** — inline preview for images, PDFs, and common file types.
- **Download & share** — generate signed download URLs; optionally create public share links (`is_public` flag).
- **Metadata** — auto-capture MIME type, size, and original filename; allow user-editable description.
- **Soft delete & restore** — files are soft-deleted (`deleted_at`) and can be restored within a retention period.
- **Storage quota** — plan-level limit on total storage per tenant (enforced via `plan_features` limits).
- **Audit** — all upload / delete / share actions recorded in `audit_logs`.

### 4.9 Item Management (Revisable)

- **CRUD** — create, read, update, and delete Items scoped to the tenant.
- **Revision history** — every save creates a new immutable `item_revision`; the `items` row always points to the latest via `current_revision_id`.
- **Diff & compare** — view side-by-side or inline diff between any two revisions.
- **Rollback** — restore any previous revision as the new current version (creates a new revision record).
- **Tagging & categorization** — optional `tags` (JSONB array) and `category` for filtering.
- **Status workflow** — `draft → published → archived` lifecycle with status guards.
- **File attachments** — link one or more `files` records to an Item revision.
- **Audit** — all create / update / delete / rollback actions recorded in `audit_logs`.

---

## 5. Data Model (Key Entities)

```
tenants
  id              UUID  PK
  name            VARCHAR
  slug            VARCHAR  UNIQUE
  custom_domain   VARCHAR  NULLABLE
  logo_url        VARCHAR  NULLABLE
  status          ENUM (active, suspended, deleted)
  stripe_customer_id  VARCHAR
  settings        JSONB
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

users  (managed by Supabase Auth — extended via profiles)
  id              UUID  PK  (= Supabase auth.users.id)
  email           VARCHAR
  full_name       VARCHAR
  avatar_url      VARCHAR  NULLABLE
  created_at      TIMESTAMP

tenant_memberships
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  user_id         UUID  FK → users
  role            ENUM (owner, admin, member, viewer)
  joined_at       TIMESTAMP

invitations
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  email           VARCHAR
  role            ENUM
  token           VARCHAR  UNIQUE
  expires_at      TIMESTAMP
  accepted_at     TIMESTAMP  NULLABLE

plans
  id              UUID  PK
  name            VARCHAR
  stripe_price_id VARCHAR
  monthly_price   DECIMAL
  annual_price    DECIMAL  NULLABLE
  is_active       BOOLEAN
  limits          JSONB

subscriptions
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  plan_id         UUID  FK → plans
  stripe_sub_id   VARCHAR
  status          ENUM (trialing, active, past_due, canceled)
  current_period_start  TIMESTAMP
  current_period_end    TIMESTAMP

plan_features
  id              UUID  PK
  plan_id         UUID  FK → plans
  feature_key     VARCHAR
  enabled         BOOLEAN
  limit_value     INTEGER  NULLABLE

audit_logs
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  user_id         UUID  FK → users
  action          VARCHAR
  resource_type   VARCHAR
  resource_id     UUID  NULLABLE
  metadata        JSONB
  ip_address      VARCHAR
  created_at      TIMESTAMP

notifications
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  user_id         UUID  FK → users
  type            VARCHAR
  title           VARCHAR
  body            TEXT
  read_at         TIMESTAMP  NULLABLE
  created_at      TIMESTAMP

files
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  uploaded_by     UUID  FK → users
  name            VARCHAR
  original_name   VARCHAR
  mime_type       VARCHAR
  size_bytes      BIGINT
  storage_path    VARCHAR          — path/key in Supabase Storage
  folder          VARCHAR  NULLABLE — virtual folder for organization
  description     TEXT     NULLABLE
  is_public       BOOLEAN  DEFAULT false
  metadata        JSONB    NULLABLE — extra info (dimensions, duration, etc.)
  deleted_at      TIMESTAMP NULLABLE — soft delete
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

items
  id              UUID  PK
  tenant_id       UUID  FK → tenants
  current_revision_id  UUID  FK → item_revisions  NULLABLE  — points to latest revision
  title           VARCHAR
  status          ENUM (draft, published, archived)  DEFAULT 'draft'
  category        VARCHAR  NULLABLE
  tags            JSONB    NULLABLE  — e.g. ["tag1", "tag2"]
  created_by      UUID  FK → users
  deleted_at      TIMESTAMP  NULLABLE  — soft delete
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

item_revisions
  id              UUID  PK
  item_id         UUID  FK → items
  tenant_id       UUID  FK → tenants
  revision_number INTEGER           — monotonically increasing per item
  title           VARCHAR
  body            TEXT     NULLABLE  — main content / payload
  data            JSONB    NULLABLE  — structured payload (flexible schema)
  change_summary  VARCHAR  NULLABLE  — short description of what changed
  created_by      UUID  FK → users
  created_at      TIMESTAMP          — immutable; never updated
```

---

## 6. Frontend Architecture

### 6.1 Project Structure

```
src/
├── app/                  # App shell, providers, router
├── features/             # Feature modules (each self-contained)
│   ├── auth/
│   ├── tenants/
│   ├── billing/
│   ├── members/
│   ├── settings/
│   ├── notifications/
│   ├── files/
│   ├── items/
│   └── admin/
├── components/           # Shared UI components (design system)
├── hooks/                # Shared React hooks
├── lib/                  # Supabase client, TypeORM data-source, helpers
├── types/                # Global TypeScript types & interfaces
└── styles/               # Tailwind config & global styles
```

### 6.2 Routing

| Path | Page | Auth |
|---|---|---|
| `/login` | Login | Public |
| `/signup` | Signup + tenant creation | Public |
| `/invite/:token` | Accept invitation | Public |
| `/dashboard` | Tenant dashboard | Protected |
| `/settings` | Tenant settings | Protected (Admin+) |
| `/members` | Member management | Protected (Admin+) |
| `/billing` | Billing & plans | Protected (Owner) |
| `/notifications` | Notification center | Protected |
| `/files` | File browser & upload | Protected |
| `/items` | Item list, detail & revision history | Protected |
| `/items/:id` | Item detail with revision timeline | Protected |
| `/admin` | Platform admin panel | Protected (Super Admin) |

### 6.3 UI / UX Principles

- **Dark mode** by default with light mode toggle.
- **Sidebar navigation** for features
- **Responsive** — fully usable on tablet & mobile.
- **Accessible** — WCAG 2.1 AA compliance target.
- **Loading states** — skeleton loaders, optimistic updates.
- **Toast notifications** for async feedback.

---

## 7. Backend Architecture

### 7.1 Supabase Services Used

| Service | Purpose |
|---|---|
| **Auth** | User authentication, session management |
| **Database** | PostgreSQL with RLS for tenant isolation |
| **Edge Functions** | Webhook handlers, custom API logic, usage metering |
| **Storage** | Tenant logos, user avatars, file uploads |
| **Realtime** | Live notification delivery, collaborative features |

### 7.2 TypeORM Integration

- TypeORM runs in the **frontend build context** (or a lightweight Node sidecar/Edge Function) to provide:
  - Entity definitions with decorators.
  - Migrations for schema evolution.
  - Subscribers for audit logging and `tenant_id` injection.
- Connection configured via Supabase's direct PostgreSQL connection string.

### 7.3 API Layer

- **Supabase client SDK** for standard CRUD (auto-scoped by RLS).
- **Edge Functions** for complex operations:
  - `POST /functions/v1/create-tenant`
  - `POST /functions/v1/stripe-webhook`
  - `POST /functions/v1/impersonate`
  - `POST /functions/v1/report-usage`

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Lighthouse score ≥ 90 on all metrics.
- API responses < 200 ms (p95) for typical CRUD.
- Bundle size < 200 KB gzipped (initial load).

### 8.2 Security

- All data access enforced via RLS — no bypass paths.
- CSRF protection on all mutations.
- Rate limiting on auth endpoints (Supabase built-in + Edge Function guards).
- Input validation (Zod schemas shared between frontend & backend).
- Secrets stored in environment variables, never committed.
- Dependency vulnerability scanning (Dependabot / `npm audit`).

### 8.3 Observability

- Structured logging (JSON) in Edge Functions.
- Error tracking integration hook (Sentry / LogRocket placeholder).
- Health-check endpoint.

### 8.4 Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Utilities, hooks, helpers |
| Component | Vitest + Testing Library | UI components |
| Integration | Vitest + Supabase local | API flows, RLS policies |
| E2E | Playwright | Critical user journeys |

### 8.5 CI/CD

- GitHub Actions pipeline:
  1. Lint (ESLint + Prettier).
  2. Type check (`tsc --noEmit`).
  3. Unit & integration tests.
  4. E2E tests (against Supabase local).
  5. Build.
  6. Deploy preview (on PR), deploy production (on merge to `main`).

---

## 9. Milestones

| Phase | Scope | Target |
|---|---|---|
| **M1 — Foundation** | Project scaffold, Supabase setup, auth flows, tenant CRUD, RLS | Week 1–2 |
| **M2 — Core SaaS** | RBAC, member management, invitations, settings, tenant switcher | Week 3–4 |
| **M3 — Billing** | Stripe integration, plans, subscriptions, webhooks, feature gating | Week 5–6 |
| **M4 — Polish** | Notifications, audit log, admin dashboard, dark mode, a11y pass | Week 7–8 |
| **M5 — Production** | CI/CD, E2E tests, documentation, deployment guide | Week 9–10 |


---

## 10. Open Questions

1. **Custom roles** — Should V1 support fully custom roles with granular permissions, or just the five fixed roles above?
only five fixed roles
2. **Multi-region** — Any requirement for data residency / multi-region Supabase projects?
no 
3. **White-labeling** — Beyond logo/domain, should tenants be able to customize colors / themes?
no
4. **API access** — Should tenants get API keys for programmatic access in V1?
no only basic auth
5. **Localization** — i18n support in V1 or deferred?
deferred

---

*End of PRD.*
