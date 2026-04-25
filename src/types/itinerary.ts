export interface ItineraryDay {
  id: string;
  trip_master_id?: string;
  departure_id?: string;
  day_number: number;
  title?: string;
  altitude_meters?: number;
  internal_notes?: string;
  traveller_notes?: string;
  created_at: string;
  updated_at: string;
  distance_km?: number;
  weather_notes?: string;
  contingency_plan?: string;
  guide_name?: string;
  guide_phone?: string;
  day_status: string;
  locations?: ItineraryLocation[];
  activities?: ItineraryActivity[];
  meals?: ItineraryMeal[];
  transport?: ItineraryTransport[];
  accommodation?: ItineraryAccommodation[];
}

export interface ItineraryLocation {
  id: string;
  itinerary_day_id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  sort_order: number;
}

export interface ItineraryActivity {
  id: string;
  itinerary_day_id: string;
  type?: string;
  description?: string;
  duration_minutes?: number;
  vendor_notes?: string;
  sort_order: number;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  cost_per_person_cents?: number;
  is_optional: boolean;
  booking_reference?: string;
  photos?: string[];
}

export interface ItineraryMeal {
  id: string;
  itinerary_day_id: string;
  meal_type: string;
  is_included: boolean;
  location?: string;
  notes?: string;
  time?: string;
  restaurant_name?: string;
  cuisine_type?: string;
  cost_per_person_cents?: number;
  dietary_options?: string[];
}

export interface ItineraryTransport {
  id: string;
  itinerary_day_id: string;
  mode?: string;
  distance_km?: number;
  duration_minutes?: number;
  vendor_notes?: string;
  from_location?: string;
  to_location?: string;
  departure_time?: string;
  arrival_time?: string;
  operator_name?: string;
  booking_reference?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
}

export interface ItineraryAccommodation {
  id: string;
  itinerary_day_id: string;
  property_name?: string;
  room_type?: string;
  internal_notes?: string;
  check_in_time?: string;
  check_out_time?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  booking_reference?: string;
  cost_per_night_cents?: number;
  amenities?: string[];
  photos?: string[];
}
