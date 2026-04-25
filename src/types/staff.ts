export type Role = 'owner' | 'admin' | 'ops' | 'sales' | 'viewer';

export interface StaffUser {
  id: string;
  supabase_auth_id: string;
  organisation_id: string;
  organisation_name?: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
