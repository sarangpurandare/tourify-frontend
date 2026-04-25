export interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  country?: string;
  source: string;
  source_detail?: string;
  interested_trip_id?: string;
  interested_departure_id?: string;
  budget_range?: string;
  group_size?: number;
  preferred_dates?: string;
  special_requests?: string;
  stage: string;
  priority?: string;
  assigned_to?: string;
  next_follow_up?: string;
  traveller_id?: string;
  converted_at?: string;
  lost_reason?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  trip_name?: string;
  departure_name?: string;
  assigned_to_name?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: string;
  description: string;
  created_by?: string;
  created_at: string;
}

export interface LeadStageCount {
  stage: string;
  count: number;
}
