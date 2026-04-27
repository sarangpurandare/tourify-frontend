export interface Vendor {
  id: string;
  organisation_id: string;
  name: string;
  type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  gst_number?: string;
  pan_number?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  rating?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface DepartureVendorBooking {
  id: string;
  departure_id: string;
  vendor_id: string;
  service_type: string;
  description?: string;
  cost_cents?: number;
  currency: string;
  status: string;
  booking_reference?: string;
  confirmation_number?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
}
