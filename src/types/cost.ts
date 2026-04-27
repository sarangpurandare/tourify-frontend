export interface DepartureCost {
  id: string;
  departure_id: string;
  category: string;
  description: string;
  amount_cents: number;
  currency: string;
  vendor_id?: string;
  is_per_person: boolean;
  quantity: number;
  status: string;
  paid_date?: string;
  invoice_reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
}

export interface CostSummary {
  total_costs_cents: number;
  total_revenue_cents: number;
  profit_cents: number;
  margin_percent: number;
  currency: string;
  costs_by_category: CategoryCost[];
}

export interface CategoryCost {
  category: string;
  total_cents: number;
  count: number;
}

export const COST_CATEGORIES = [
  'accommodation', 'transport', 'meals', 'activities', 'guide_fees',
  'permits', 'insurance', 'equipment', 'marketing', 'staff',
  'commission', 'taxes', 'miscellaneous',
] as const;

export const COST_CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  transport: 'Transport',
  meals: 'Meals',
  activities: 'Activities',
  guide_fees: 'Guide Fees',
  permits: 'Permits',
  insurance: 'Insurance',
  equipment: 'Equipment',
  marketing: 'Marketing',
  staff: 'Staff',
  commission: 'Commission',
  taxes: 'Taxes',
  miscellaneous: 'Miscellaneous',
};

export const COST_STATUSES = ['estimated', 'confirmed', 'paid', 'cancelled'] as const;

export const COST_STATUS_LABELS: Record<string, string> = {
  estimated: 'Estimated',
  confirmed: 'Confirmed',
  paid: 'Paid',
  cancelled: 'Cancelled',
};
