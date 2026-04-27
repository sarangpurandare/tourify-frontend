export interface EmailTemplate {
  id: string;
  organisation_id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  trigger_event?: string;
  is_active: boolean;
  variables?: string[];
  created_at: string;
  updated_at: string;
}

export const TRIGGER_EVENTS = [
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'departure_reminder', label: 'Departure Reminder' },
  { value: 'trip_completed', label: 'Trip Completed' },
  { value: 'review_request', label: 'Review Request' },
  { value: 'document_request', label: 'Document Request' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'custom', label: 'Custom' },
] as const;

export const TEMPLATE_VARIABLES = [
  { key: 'traveller_name', description: 'Full name of the traveller' },
  { key: 'trip_name', description: 'Name of the trip' },
  { key: 'departure_date', description: 'Departure start date' },
  { key: 'amount', description: 'Booking amount (formatted)' },
  { key: 'org_name', description: 'Organisation name' },
  { key: 'booking_id', description: 'Booking reference ID' },
  { key: 'payment_link', description: 'Link to make payment' },
  { key: 'balance_due', description: 'Remaining balance amount' },
  { key: 'traveller_email', description: 'Traveller email address' },
  { key: 'traveller_phone', description: 'Traveller phone number' },
] as const;
