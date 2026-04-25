export interface Document {
  id: string;
  organisation_id: string;
  traveller_id?: string;
  booking_id?: string;
  document_type: string;
  label: string;
  document_number?: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  country?: string;
  file_url?: string;
  file_back_url?: string;
  status: string;
  rejection_reason?: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  traveller_name?: string;
}

export const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'travel_insurance', label: 'Travel Insurance' },
  { value: 'vaccination', label: 'Vaccination Record' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'flight_ticket', label: 'Flight Ticket' },
  { value: 'hotel_voucher', label: 'Hotel Voucher' },
  { value: 'booking_confirmation', label: 'Booking Confirmation' },
  { value: 'medical_certificate', label: 'Medical Certificate' },
  { value: 'other', label: 'Other' },
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa',
  travel_insurance: 'Travel Insurance',
  vaccination: 'Vaccination',
  id_card: 'ID Card',
  flight_ticket: 'Flight Ticket',
  hotel_voucher: 'Hotel Voucher',
  booking_confirmation: 'Booking Confirmation',
  medical_certificate: 'Medical Certificate',
  other: 'Other',
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  uploaded: 'Uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
};
