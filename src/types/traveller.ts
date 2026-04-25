export interface Traveller {
  id: string;
  full_legal_name: string;
  preferred_name?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  marital_status?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  passport_number?: string;
  passport_issuing_country?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  passport_place_of_issue?: string;
  passport_front_url?: string;
  passport_back_url?: string;
  pan?: string;
  aadhaar_masked?: string;
  driving_license?: string;
  oci_card?: string;
  seat_preference?: string;
  berth_preference?: string;
  roommate_preference?: string;
  dietary?: string;
  allergies?: string[];
  alcohol?: boolean;
  medical_conditions?: string[];
  medications?: string[];
  blood_group?: string;
  insurance_provider?: string;
  insurance_number?: string;
  insurance_valid_from?: string;
  insurance_valid_to?: string;
  fitness_level?: number;
  adventure_experience?: string;
  fears?: string[];
  tshirt_size?: string;
  jacket_size?: string;
  instagram_handle?: string;
  referral_source?: string;
  referred_by_id?: string;
  nps_score?: number;
  internal_notes?: string;
  tags?: string[];
  anniversary?: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  emergency_contacts?: EmergencyContact[];
  visa_records?: VisaRecord[];
}

export interface CoTraveller {
  traveller_id: string;
  full_legal_name: string;
  preferred_name?: string;
  city?: string;
  instagram_handle?: string;
  trip_name: string;
  departure_date: string;
  departure_id: string;
}

export interface EmergencyContact {
  id: string;
  traveller_id: string;
  name: string;
  relation: string;
  phone: string;
  priority: number;
}

export interface VisaRecord {
  id: string;
  traveller_id: string;
  country: string;
  visa_type?: string;
  validity_from?: string;
  validity_to?: string;
  entry_type?: string;
  visa_scan_url?: string;
  previous_scan_urls?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}
