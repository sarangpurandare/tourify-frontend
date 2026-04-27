export interface PromoCode {
  id: string;
  organisation_id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  current_uses: number;
  min_booking_amount_cents?: number;
  max_discount_cents?: number;
  valid_from?: string;
  valid_until?: string;
  applicable_trip_ids?: string[];
  applicable_departure_ids?: string[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  redemption_count?: number;
}

export interface PromoCodeRedemption {
  id: string;
  promo_code_id: string;
  booking_id: string;
  discount_applied_cents: number;
  redeemed_at: string;
  traveller_name?: string;
  trip_name?: string;
}

export interface ValidatePromoResponse {
  valid: boolean;
  promo_code_id?: string;
  discount_type?: string;
  discount_value?: number;
  discount_amount_cents?: number;
  message?: string;
}
