export interface InvoiceLineItem {
  description: string;
  hsn_code?: string;
  quantity: number;
  unit_price_cents: number;
  amount_cents: number;
}

export interface Invoice {
  id: string;
  organisation_id: string;
  booking_id?: string;
  invoice_number: string;
  type: string;
  status: string;

  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gst?: string;

  org_name: string;
  org_address?: string;
  org_gst?: string;
  org_pan?: string;

  subtotal_cents: number;
  discount_cents: number;
  taxable_amount_cents: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  cgst_cents: number;
  sgst_cents: number;
  igst_cents: number;
  total_cents: number;
  currency: string;

  line_items: InvoiceLineItem[];

  invoice_date: string;
  due_date?: string;
  paid_date?: string;

  notes?: string;
  terms?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceRequest {
  booking_id?: string;
  type?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gst?: string;
  line_items: InvoiceLineItem[];
  discount_cents?: number;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
  due_date?: string;
  notes?: string;
  terms?: string;
  currency?: string;
}

export interface GenerateInvoiceRequest {
  booking_id: string;
  type?: string;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
  notes?: string;
  terms?: string;
  due_date?: string;
}

export interface UpdateInvoiceStatusRequest {
  status: string;
}
