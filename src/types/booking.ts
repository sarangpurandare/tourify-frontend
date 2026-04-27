export interface Booking {
  id: string;
  departure_id: string;
  traveller_id: string;
  group_id?: string;
  status: string;
  booking_date: string;
  final_price_cents?: number;
  currency: string;
  payment_status: string;
  room_type_preference?: string;
  special_requests?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  internal_notes?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  source?: string;
  source_details?: string;
  referral_code?: string;
  agent_name?: string;
  promo_code_id?: string;
  created_by?: string;
  portal_token: string;
  created_at: string;
  updated_at: string;
  traveller_name?: string;
  trip_name?: string;
  departure_date?: string;
  total_paid: number;
}

export const BOOKING_SOURCES = [
  { value: 'direct', label: 'Direct' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'agent', label: 'Agent' },
  { value: 'repeat', label: 'Repeat Customer' },
  { value: 'partner', label: 'Partner' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'other', label: 'Other' },
] as const;

export interface Payment {
  id: string;
  booking_id: string;
  amount_cents: number;
  currency: string;
  type: string;
  status: string;
  scheduled_date?: string;
  paid_date?: string;
  payment_method?: string;
  reference_number?: string;
  gateway_transaction_id?: string;
  receipt_url?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface BookingDocument {
  id: string;
  booking_id: string;
  document_type: string;
  label: string;
  is_required: boolean;
  status: string;
  file_url?: string;
  rejection_reason?: string;
  uploaded_at?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface TripStatusUpdate {
  id: string;
  departure_id: string;
  day_number?: number;
  update_type: string;
  title: string;
  message?: string;
  photo_urls?: string[];
  latitude?: number;
  longitude?: number;
  is_public: boolean;
  posted_by?: string;
  created_at: string;
  posted_by_name?: string;
}
