import type { Role } from './staff';

export type Plan = 'free' | 'starter' | 'pro' | 'business';

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  is_active: boolean;
  user_count: number;
  traveller_count: number;
  created_at: string;
}

export interface AdminOrgUsage {
  staff_count: number;
  traveller_count: number;
  trip_count: number;
  departure_month_count: number;
  storage_bytes: number;
}

export interface AdminOrgDetail extends AdminOrg {
  usage?: AdminOrgUsage;
}

export interface AdminStaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface ImpersonationResponse {
  token?: string;
  jwt?: string;
  expires_at?: string;
  login_url: string;
}

export type UpgradeRequestStatus = 'pending' | 'approved' | 'denied';

export interface AdminUpgradeRequest {
  id: string;
  organisation_id: string;
  requested_by_staff_id: string;
  current_plan: Plan;
  target_plan: Plan;
  message?: string | null;
  status: UpgradeRequestStatus;
  handled_by_staff_id?: string | null;
  handled_at?: string | null;
  created_at: string;
  // Joined meta
  org_name: string;
  org_slug: string;
  requester_name: string;
  requester_email: string;
  handled_by_name?: string | null;
  handled_by_email?: string | null;
}
