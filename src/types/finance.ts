export interface FinanceSummary {
  total_revenue_cents: number;
  total_collected_cents: number;
  total_outstanding_cents: number;
  total_overdue_cents: number;
  booking_count: number;
  paid_booking_count: number;
  partial_booking_count: number;
  pending_booking_count: number;
  currency: string;
}

export interface FinancePayment {
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
  notes?: string;
  recorded_by?: string;
  created_at: string;
  traveller_name?: string;
  trip_name?: string;
}

export interface OutstandingPayment {
  payment_id: string;
  booking_id: string;
  traveller_name: string;
  trip_name: string;
  amount_cents: number;
  currency: string;
  scheduled_date: string;
  status: string;
  is_overdue: boolean;
}

export interface RevenueByTrip {
  trip_id: string;
  trip_name: string;
  booking_count: number;
  revenue_cents: number;
  collected_cents: number;
  currency: string;
}
