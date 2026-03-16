// --- Tenant ---
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  logo_url: string | null;
  status: 'active' | 'suspended' | 'deleted';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- User ---
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

// --- Auth ---
export interface AuthResponse {
  token: string;
  user: User;
  tenants?: TenantWithRole[];
  tenant?: Tenant;
}

export interface TenantWithRole {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
}

// --- Members ---
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Member {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: MemberRole;
  joined_at: string;
}

// --- Items ---
export type ItemStatus = 'draft' | 'published' | 'archived';

export interface Item {
  id: string;
  tenant_id: string;
  current_revision_id: string | null;
  title: string;
  status: ItemStatus;
  category: string | null;
  tags: string[] | null;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  current_revision?: ItemRevision | null;
}

export interface ItemRevision {
  id: string;
  item_id: string;
  tenant_id: string;
  revision_number: number;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  change_summary: string | null;
  created_by: string;
  created_at: string;
}

// --- Files ---
export interface FileRecord {
  id: string;
  tenant_id: string;
  uploaded_by: string;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  folder: string | null;
  description: string | null;
  is_public: boolean;
  metadata: Record<string, unknown> | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Plans ---
export interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number | null;
  is_active: boolean;
  limits: Record<string, unknown>;
  features?: PlanFeature[];
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  current_period_start: string;
  current_period_end: string;
  plan?: Plan;
}

// --- Notifications ---
export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// --- Audit ---
export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}
