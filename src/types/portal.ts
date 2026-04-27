export interface TravellerProfile {
  id?: string;
  traveller_id?: string;
  full_legal_name: string;
  preferred_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  dob?: string;
  gender?: string;
  city?: string;
  country?: string;
  dietary?: string;
  allergies?: string[];
  medical_conditions?: string[];
  medications?: string[];
  blood_group?: string;
  seat_preference?: string;
  berth_preference?: string;
  roommate_preference?: string;
  tshirt_size?: string;
  jacket_size?: string;
  organisation_id: string;
  organisation_name?: string;
  emergency_contacts?: PortalEmergencyContact[];
}

export interface PortalEmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  priority: number;
}

export interface PortalTrip {
  id: string; // booking id
  booking_id: string;
  departure_id: string;
  trip_name: string;
  destination?: string;
  destinations?: string[];
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  operator_name?: string;
  operator_logo_url?: string;
  organisation_id: string;
  hero_image_url?: string;
}

export interface PortalTripDetail {
  id: string;
  booking_id: string;
  departure_id: string;
  trip_name: string;
  destination?: string;
  destinations?: string[];
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  operator_name?: string;
  operator_logo_url?: string;
  organisation_id: string;
  hero_image_url?: string;
  itinerary?: PortalItineraryDay[];
  documents?: PortalDocument[];
  co_travellers?: PortalCoTraveller[];
  review?: PortalReview | null;
}

export interface PortalItineraryDay {
  id: string;
  day_number: number;
  title?: string;
  traveller_notes?: string;
  locations?: { id: string; name: string; sort_order: number }[];
  activities?: {
    id: string;
    type?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    location_name?: string;
    is_optional: boolean;
    sort_order: number;
  }[];
  meals?: {
    id: string;
    meal_type: string;
    is_included: boolean;
    location?: string;
    time?: string;
    restaurant_name?: string;
    cuisine_type?: string;
    dietary_options?: string[];
  }[];
  transport?: {
    id: string;
    mode?: string;
    from_location?: string;
    to_location?: string;
    departure_time?: string;
    arrival_time?: string;
    duration_minutes?: number;
  }[];
  accommodation?: {
    id: string;
    property_name?: string;
    room_type?: string;
    check_in_time?: string;
    check_out_time?: string;
    amenities?: string[];
  }[];
}

export interface PortalDocument {
  id: string;
  document_type: string;
  label: string;
  file_url?: string;
  status: string;
  expiry_date?: string;
  rejection_reason?: string;
  is_booking_doc: boolean;
}

export interface PortalCoTraveller {
  id: string;
  name: string;
  phone?: string;
}

export interface PortalReview {
  id: string;
  booking_id: string;
  rating: number;
  title?: string;
  body?: string;
  photos?: string[];
  created_at: string;
  updated_at: string;
  operator_response?: string;
  operator_responded_at?: string;
  is_published: boolean;
  trip_name?: string;
  departure_id?: string;
}

export interface PortalInvite {
  org_name: string;
  traveller_name: string;
  email: string;
}

export interface ReviewFormData {
  rating: number;
  title?: string;
  body?: string;
  photos?: string[];
}

// Staff-side review types
export interface StaffReview {
  id: string;
  traveller_id: string;
  traveller_name: string;
  organisation_id: string;
  departure_id: string;
  booking_id: string;
  trip_name?: string;
  departure_date?: string;
  rating: number;
  title?: string;
  body?: string;
  photos?: string[];
  is_published: boolean;
  operator_response?: string;
  operator_responded_at?: string;
  operator_responded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  total_count: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}
