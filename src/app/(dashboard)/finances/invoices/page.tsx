'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { Invoice, InvoiceLineItem, CreateInvoiceRequest, GenerateInvoiceRequest } from '@/types/invoice';
import type { Booking } from '@/types/booking';
import {
  Plus,
  FileText,
  Send,
  Trash2,
  Eye,
  X,
  Printer,
} from 'lucide-react';

// --- Status pill config ---
const STATUS_PILL: Record<string, { color: string; label: string }> = {
  draft: { color: 'var(--crm-text-3)', label: 'Draft' },
  sent: { color: 'var(--crm-accent)', label: 'Sent' },
  paid: { color: 'var(--crm-green)', label: 'Paid' },
  cancelled: { color: 'var(--crm-red)', label: 'Cancelled' },
  overdue: { color: 'var(--crm-amber)', label: 'Overdue' },
};

const TYPE_LABEL: Record<string, string> = {
  tax_invoice: 'Tax Invoice',
  proforma: 'Proforma',
  credit_note: 'Credit Note',
  receipt: 'Receipt',
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_PILL[status] ?? { color: 'var(--crm-text-3)', label: status };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: `color-mix(in oklab, ${cfg.color} 15%, transparent)`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

// --- Create Invoice Dialog ---
function CreateInvoiceDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<'manual' | 'booking'>('manual');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', hsn_code: '9985', quantity: 1, unit_price_cents: 0, amount_cents: 0 },
  ]);
  const [taxMode, setTaxMode] = useState<'intra' | 'inter'>('intra');
  const [discountCents, setDiscountCents] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due within 15 days of invoice date.');
  const [invoiceType, setInvoiceType] = useState('tax_invoice');
  const [submitting, setSubmitting] = useState(false);

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-for-invoice'],
    queryFn: () => api.get<APIResponse<Booking[]>>('/bookings?per_page=100'),
    enabled: mode === 'booking',
  });
  const bookings = bookingsData?.data ?? [];

  const subtotal = lineItems.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
  const taxable = subtotal - discountCents;
  const cgstPct = taxMode === 'intra' ? 2.5 : 0;
  const sgstPct = taxMode === 'intra' ? 2.5 : 0;
  const igstPct = taxMode === 'inter' ? 5 : 0;
  const cgstCents = Math.round(taxable * cgstPct / 100);
  const sgstCents = Math.round(taxable * sgstPct / 100);
  const igstCents = Math.round(taxable * igstPct / 100);
  const total = taxable + cgstCents + sgstCents + igstCents;

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', hsn_code: '9985', quantity: 1, unit_price_cents: 0, amount_cents: 0 }]);
  };
  const removeLineItem = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };
  const updateLineItem = (idx: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(lineItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'booking') {
        const payload: GenerateInvoiceRequest = {
          booking_id: selectedBookingId,
          type: invoiceType,
          cgst_percent: cgstPct,
          sgst_percent: sgstPct,
          igst_percent: igstPct,
          notes: notes || undefined,
          terms: terms || undefined,
          due_date: dueDate || undefined,
        };
        await api.post('/invoices/generate', payload);
      } else {
        const payload: CreateInvoiceRequest = {
          type: invoiceType,
          customer_name: customerName,
          customer_email: customerEmail || undefined,
          customer_phone: customerPhone || undefined,
          customer_address: customerAddress || undefined,
          customer_gst: customerGST || undefined,
          line_items: lineItems.map(li => ({
            ...li,
            amount_cents: li.unit_price_cents * li.quantity,
          })),
          discount_cents: discountCents || undefined,
          cgst_percent: cgstPct,
          sgst_percent: sgstPct,
          igst_percent: igstPct,
          due_date: dueDate || undefined,
          notes: notes || undefined,
          terms: terms || undefined,
        };
        await api.post('/invoices', payload);
      }
      onCreated();
      onClose();
    } catch {
      toast.error('Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--crm-bg)',
          borderRadius: 12,
          width: 720,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Create Invoice</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-text-3)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`crm-btn sm ${mode === 'manual' ? '' : 'ghost'}`}
            onClick={() => setMode('manual')}
          >
            Manual Entry
          </button>
          <button
            className={`crm-btn sm ${mode === 'booking' ? '' : 'ghost'}`}
            onClick={() => setMode('booking')}
          >
            From Booking
          </button>
        </div>

        {mode === 'booking' && (
          <div style={{ marginBottom: 16 }}>
            <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Select Booking</label>
            <select
              className="crm-input"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- Select a booking --</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.traveller_name} - {b.trip_name} ({formatCurrency(b.final_price_cents ?? 0, b.currency)})
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'manual' && (
          <>
            {/* Customer details */}
            <div style={{ marginBottom: 16 }}>
              <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Customer Details</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="crm-input" placeholder="Customer Name *" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input className="crm-input" placeholder="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                <input className="crm-input" placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                <input className="crm-input" placeholder="GST Number" value={customerGST} onChange={e => setCustomerGST(e.target.value)} />
              </div>
              <input className="crm-input" placeholder="Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} style={{ width: '100%', marginTop: 10 }} />
            </div>

            {/* Line items */}
            <div style={{ marginBottom: 16 }}>
              <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Line Items</label>
              <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 1fr auto', gap: 6, marginBottom: 6, color: 'var(--crm-text-3)' }}>
                <span>Description</span><span>HSN Code</span><span>Qty</span><span>Unit Price</span><span></span>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 1fr auto', gap: 6, marginBottom: 6 }}>
                  <input className="crm-input" placeholder="Description" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} />
                  <input className="crm-input" placeholder="9985" value={item.hsn_code} onChange={e => updateLineItem(idx, 'hsn_code', e.target.value)} />
                  <input className="crm-input" type="number" min={1} value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                  <input className="crm-input" type="number" placeholder="0" value={item.unit_price_cents || ''} onChange={e => updateLineItem(idx, 'unit_price_cents', parseInt(e.target.value) || 0)} />
                  <button onClick={() => removeLineItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-red)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button className="crm-btn sm ghost" onClick={addLineItem}>+ Add Item</button>
            </div>

            {/* Discount */}
            <div style={{ marginBottom: 16 }}>
              <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Discount (in paise/cents)</label>
              <input className="crm-input" type="number" value={discountCents || ''} onChange={e => setDiscountCents(parseInt(e.target.value) || 0)} style={{ width: 200 }} />
            </div>
          </>
        )}

        {/* Tax mode */}
        <div style={{ marginBottom: 16 }}>
          <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>GST Type</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" checked={taxMode === 'intra'} onChange={() => setTaxMode('intra')} />
              Intra-state (CGST 2.5% + SGST 2.5%)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" checked={taxMode === 'inter'} onChange={() => setTaxMode('inter')} />
              Inter-state (IGST 5%)
            </label>
          </div>
        </div>

        {/* Invoice type */}
        <div style={{ marginBottom: 16 }}>
          <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Invoice Type</label>
          <select className="crm-input" value={invoiceType} onChange={e => setInvoiceType(e.target.value)} style={{ width: 200 }}>
            <option value="tax_invoice">Tax Invoice</option>
            <option value="proforma">Proforma</option>
            <option value="credit_note">Credit Note</option>
            <option value="receipt">Receipt</option>
          </select>
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 16 }}>
          <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Due Date</label>
          <input className="crm-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: 200 }} />
        </div>

        {/* Notes + Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Notes</label>
            <textarea className="crm-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Terms &amp; Conditions</label>
            <textarea className="crm-input" rows={3} value={terms} onChange={e => setTerms(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
          </div>
        </div>

        {/* Summary (for manual mode) */}
        {mode === 'manual' && (
          <div className="crm-card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Subtotal</span><span className="crm-tabular">{formatCurrency(subtotal, 'INR')}</span>
            </div>
            {discountCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: 'var(--crm-red)' }}>
                <span>Discount</span><span className="crm-tabular">-{formatCurrency(discountCents, 'INR')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Taxable Amount</span><span className="crm-tabular">{formatCurrency(taxable, 'INR')}</span>
            </div>
            {taxMode === 'intra' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>CGST (2.5%)</span><span className="crm-tabular">{formatCurrency(cgstCents, 'INR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>SGST (2.5%)</span><span className="crm-tabular">{formatCurrency(sgstCents, 'INR')}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>IGST (5%)</span><span className="crm-tabular">{formatCurrency(igstCents, 'INR')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, borderTop: '1px solid var(--crm-hairline)', paddingTop: 8, marginTop: 8 }}>
              <span>Total</span><span className="crm-tabular">{formatCurrency(total, 'INR')}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="crm-btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="crm-btn"
            disabled={submitting || (mode === 'manual' && !customerName) || (mode === 'booking' && !selectedBookingId)}
            onClick={handleSubmit}
          >
            {submitting ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- View Invoice Dialog (Print-ready) ---
function ViewInvoiceDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: 800,
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            borderBottom: '1px solid #eee',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Invoice Preview</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="crm-btn sm ghost" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice content - A4 style */}
        <div id="invoice-print" style={{ padding: '40px 48px', color: '#111', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111' }}>{invoice.org_name}</h1>
              {invoice.org_address && <p style={{ margin: '4px 0 0', color: '#555', fontSize: 12 }}>{invoice.org_address}</p>}
              {invoice.org_gst && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>GSTIN: {invoice.org_gst}</p>}
              {invoice.org_pan && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>PAN: {invoice.org_pan}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#333', textTransform: 'uppercase' }}>
                {TYPE_LABEL[invoice.type] || invoice.type}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#555' }}>
                <strong>Invoice #:</strong> {invoice.invoice_number}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>
                <strong>Date:</strong> {formatDate(invoice.invoice_date)}
              </p>
              {invoice.due_date && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>
                  <strong>Due:</strong> {formatDate(invoice.due_date)}
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <StatusPill status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ marginBottom: 24, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Bill To</p>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{invoice.customer_name}</p>
            {invoice.customer_address && <p style={{ margin: '2px 0 0', color: '#555' }}>{invoice.customer_address}</p>}
            {invoice.customer_email && <p style={{ margin: '2px 0 0', color: '#555' }}>{invoice.customer_email}</p>}
            {invoice.customer_phone && <p style={{ margin: '2px 0 0', color: '#555' }}>{invoice.customer_phone}</p>}
            {invoice.customer_gst && <p style={{ margin: '2px 0 0', color: '#555' }}>GSTIN: {invoice.customer_gst}</p>}
          </div>

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>#</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>Description</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>HSN</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>Qty</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>Rate</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 4px', color: '#666' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 4px' }}>{item.description}</td>
                  <td style={{ padding: '10px 4px', color: '#666' }}>{item.hsn_code || '-'}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.unit_price_cents, invoice.currency)}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount_cents, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <div style={{ width: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>Subtotal</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.subtotal_cents, invoice.currency)}</span>
              </div>
              {invoice.discount_cents > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#c00' }}>
                  <span>Discount</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>-{formatCurrency(invoice.discount_cents, invoice.currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>Taxable Amount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.taxable_amount_cents, invoice.currency)}</span>
              </div>
              {invoice.cgst_cents > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>CGST ({invoice.cgst_percent}%)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.cgst_cents, invoice.currency)}</span>
                </div>
              )}
              {invoice.sgst_cents > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>SGST ({invoice.sgst_percent}%)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.sgst_cents, invoice.currency)}</span>
                </div>
              )}
              {invoice.igst_cents > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span>IGST ({invoice.igst_percent}%)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.igst_cents, invoice.currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 15, fontWeight: 700, borderTop: '2px solid #333', marginTop: 8 }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.total_cents, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {invoice.notes && (
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888' }}>Notes</p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#555', fontSize: 12 }}>{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#888' }}>Terms &amp; Conditions</p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#555', fontSize: 12 }}>{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function InvoicesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, statusFilter],
    queryFn: () => api.get<APIResponse<Invoice[]>>(`/invoices?page=${page}&per_page=20${statusFilter ? `&status=${statusFilter}` : ''}`),
  });

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/send`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: () => toast.error('Operation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: () => toast.error('Operation failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/invoices/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: () => toast.error('Operation failed'),
  });

  return (
    <div style={{ padding: '32px 36px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="crm-page-title" style={{ marginBottom: 4 }}>Invoices</h1>
          <p className="crm-caption" style={{ fontSize: 14 }}>GST-compliant invoices for your bookings</p>
        </div>
        <button className="crm-btn" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New Invoice
        </button>
      </header>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
          <button
            key={s}
            className={`crm-btn sm ${statusFilter === s ? '' : 'ghost'}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s === '' ? 'All' : (STATUS_PILL[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <div className="crm-card">
        {isLoading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <span className="crm-caption">Loading...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <FileText size={32} style={{ color: 'var(--crm-text-4)', marginBottom: 8 }} />
            <p className="crm-caption">No invoices found. Create your first invoice to get started.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                    {['Invoice #', 'Customer', 'Type', 'Amount', 'Status', 'Date', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: 500,
                          fontSize: 11.5,
                          color: 'var(--crm-text-3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{inv.customer_name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>{TYPE_LABEL[inv.type] || inv.type}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(inv.total_cents, inv.currency)}
                      </td>
                      <td style={{ padding: '10px 12px' }}><StatusPill status={inv.status} /></td>
                      <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>{formatDate(inv.invoice_date)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="crm-btn sm ghost"
                            title="View"
                            onClick={() => setViewInvoice(inv)}
                            style={{ padding: '4px 6px' }}
                          >
                            <Eye size={14} />
                          </button>
                          {inv.status === 'draft' && (
                            <>
                              <button
                                className="crm-btn sm ghost"
                                title="Mark as Sent"
                                onClick={() => sendMutation.mutate(inv.id)}
                                style={{ padding: '4px 6px' }}
                              >
                                <Send size={14} />
                              </button>
                              <button
                                className="crm-btn sm ghost"
                                title="Delete"
                                onClick={() => {
                                  if (confirm('Delete this draft invoice?')) {
                                    deleteMutation.mutate(inv.id);
                                  }
                                }}
                                style={{ padding: '4px 6px', color: 'var(--crm-red)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {inv.status === 'sent' && (
                            <button
                              className="crm-btn sm ghost"
                              title="Mark as Paid"
                              onClick={() => statusMutation.mutate({ id: inv.id, status: 'paid' })}
                              style={{ padding: '4px 6px', color: 'var(--crm-green)' }}
                            >
                              Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.total > 20 && (
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--crm-hairline)',
                }}
              >
                <span className="crm-caption">
                  Page {page} of {Math.ceil(meta.total / 20)}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="crm-btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </button>
                  <button className="crm-btn sm ghost" disabled={page >= Math.ceil(meta.total / 20)} onClick={() => setPage(p => p + 1)}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      {showCreate && (
        <CreateInvoiceDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
        />
      )}
      {viewInvoice && (
        <ViewInvoiceDialog invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </div>
  );
}
