export interface ChecklistTemplate {
  id: string;
  organisation_id: string;
  name: string;
  scope: 'departure' | 'traveller';
  description?: string;
  category: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  is_required: boolean;
  due_offset_days?: number;
  default_assignee_role?: string;
  sort_order: number;
  created_at: string;
}

export interface DepartureChecklistItem {
  id: string;
  departure_id: string;
  organisation_id: string;
  template_item_id?: string;
  title: string;
  description?: string;
  category: string;
  scope: 'departure' | 'traveller';
  traveller_id?: string;
  traveller_name?: string;
  is_required: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  skipped: number;
  blocked: number;
  required: number;
  required_completed: number;
}

export interface TravellerChecklistSummary {
  traveller_id: string;
  traveller_name: string;
  total: number;
  completed: number;
  required: number;
  required_completed: number;
}
