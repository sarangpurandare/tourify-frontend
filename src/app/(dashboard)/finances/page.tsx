'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { FinanceSummary, FinancePayment, OutstandingPayment, RevenueByTrip } from '@/types/finance';
import {
  IndianRupee,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';

const PAYMENT_STATUS_PILL: Record<string, { color: string; label: string }> = {
  completed: { color: 'var(--crm-green)', label: 'Completed' },
  pending: { color: 'var(--crm-amber)', label: 'Pending' },
  scheduled: { color: 'var(--crm-text-3)', label: 'Scheduled' },
  failed: { color: 'var(--crm-red)', label: 'Failed' },
  refunded: { color: 'var(--crm-text-3)', label: 'Refunded' },
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  installment: 'Installment',
  balance: 'Balance',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  cash: 'Cash',
  cheque: 'Cheque',
  razorpay: 'Razorpay',
  stripe: 'Stripe',
  other: 'Other',
};

function StatusPill({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_PILL[status] ?? { color: 'var(--crm-text-3)', label: status };
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

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof IndianRupee;
  color: string;
  bg: string;
}) {
  return (
    <div className="crm-card crm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="crm-eyebrow">{label}</span>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: bg,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon size={14} style={{ color }} />
        </span>
      </div>
      <span className="crm-title-1 crm-tabular" style={{ fontSize: 22 }}>{value}</span>
      <span className="crm-caption">{sub}</span>
    </div>
  );
}

type Tab = 'overview' | 'payments' | 'outstanding';

export default function FinancesPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [paymentPage, setPaymentPage] = useState(1);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get<APIResponse<FinanceSummary>>('/finances/summary'),
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['finance-payments', paymentPage],
    queryFn: () =>
      api.get<APIResponse<FinancePayment[]>>(
        `/finances/payments?page=${paymentPage}&per_page=20&sort=created_at&order=desc`,
      ),
  });

  const { data: outstandingData, isLoading: outstandingLoading } = useQuery({
    queryKey: ['finance-outstanding'],
    queryFn: () => api.get<APIResponse<OutstandingPayment[]>>('/finances/outstanding'),
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['finance-revenue-by-trip'],
    queryFn: () => api.get<APIResponse<RevenueByTrip[]>>('/finances/revenue-by-trip'),
  });

  const summary = summaryData?.data;
  const payments = paymentsData?.data ?? [];
  const paymentMeta = paymentsData?.meta;
  const outstanding = outstandingData?.data ?? [];
  const revenueByTrip = revenueData?.data ?? [];
  const cur = summary?.currency ?? 'INR';

  const overdueCount = outstanding.filter(o => o.is_overdue).length;
  const upcomingCount = outstanding.filter(o => !o.is_overdue).length;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'payments', label: 'All Payments', count: paymentMeta?.total },
    { key: 'outstanding', label: 'Outstanding', count: outstanding.length },
  ];

  return (
    <div style={{ padding: '32px 36px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 className="crm-page-title" style={{ marginBottom: 4 }}>Finances</h1>
        <p className="crm-caption" style={{ fontSize: 14 }}>Revenue, payments, and outstanding balances</p>
      </header>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KPICard
          label="Total Revenue"
          value={summaryLoading ? '...' : formatCurrency(summary?.total_revenue_cents ?? 0, cur)}
          sub={`${summary?.booking_count ?? 0} bookings`}
          icon={IndianRupee}
          color="var(--crm-accent)"
          bg="var(--crm-accent-bg)"
        />
        <KPICard
          label="Collected"
          value={summaryLoading ? '...' : formatCurrency(summary?.total_collected_cents ?? 0, cur)}
          sub={`${summary?.paid_booking_count ?? 0} fully paid`}
          icon={TrendingUp}
          color="var(--crm-green)"
          bg="var(--crm-green-bg)"
        />
        <KPICard
          label="Outstanding"
          value={summaryLoading ? '...' : formatCurrency(summary?.total_outstanding_cents ?? 0, cur)}
          sub={`${summary?.partial_booking_count ?? 0} partial + ${summary?.pending_booking_count ?? 0} pending`}
          icon={Clock}
          color="var(--crm-amber)"
          bg="var(--crm-amber-bg, color-mix(in oklab, var(--crm-amber) 12%, transparent))"
        />
        <KPICard
          label="Overdue"
          value={summaryLoading ? '...' : formatCurrency(summary?.total_overdue_cents ?? 0, cur)}
          sub={`${overdueCount} payment${overdueCount !== 1 ? 's' : ''} past due`}
          icon={AlertTriangle}
          color="var(--crm-red)"
          bg="var(--crm-red-bg)"
        />
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--crm-hairline)',
          marginBottom: 20,
        }}
      >
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--crm-accent)' : 'var(--crm-text-3)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--crm-accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
            {t.count != null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 8,
                  background: tab === t.key ? 'var(--crm-accent-bg)' : 'var(--crm-bg-elev)',
                  color: tab === t.key ? 'var(--crm-accent)' : 'var(--crm-text-3)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Revenue by trip */}
          <div className="crm-card">
            <div className="crm-card-hd">
              <h3>Revenue by Trip</h3>
            </div>
            {revenueLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">Loading…</span>
              </div>
            ) : revenueByTrip.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">No revenue data yet</span>
              </div>
            ) : (
              <div>
                {revenueByTrip.map((rt, i) => {
                  const pct =
                    rt.revenue_cents > 0
                      ? Math.round((rt.collected_cents / rt.revenue_cents) * 100)
                      : 0;
                  return (
                    <div
                      key={rt.trip_id}
                      style={{
                        padding: '12px 20px',
                        borderBottom:
                          i < revenueByTrip.length - 1
                            ? '1px solid var(--crm-hairline)'
                            : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{rt.trip_name}</span>
                        <span className="crm-tabular" style={{ fontSize: 13, fontWeight: 600 }}>
                          {formatCurrency(rt.revenue_cents, rt.currency)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: 'var(--crm-bg-elev)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 2,
                              background:
                                pct >= 80
                                  ? 'var(--crm-green)'
                                  : pct >= 50
                                    ? 'var(--crm-amber)'
                                    : 'var(--crm-accent)',
                            }}
                          />
                        </div>
                        <span className="crm-caption crm-tabular" style={{ minWidth: 36, textAlign: 'right' }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="crm-caption" style={{ display: 'flex', gap: 12 }}>
                        <span>{rt.booking_count} booking{rt.booking_count !== 1 ? 's' : ''}</span>
                        <span>Collected: {formatCurrency(rt.collected_cents, rt.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming / Overdue */}
          <div className="crm-card">
            <div className="crm-card-hd">
              <h3>Upcoming Payments</h3>
              {outstanding.length > 0 && (
                <button
                  className="crm-btn ghost sm"
                  onClick={() => setTab('outstanding')}
                >
                  View all
                </button>
              )}
            </div>
            {outstandingLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">Loading…</span>
              </div>
            ) : outstanding.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">No outstanding payments</span>
              </div>
            ) : (
              <div>
                {outstanding.slice(0, 8).map((o, i) => (
                  <Link
                    key={o.payment_id}
                    href={`/bookings?highlight=${o.booking_id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      borderBottom:
                        i < Math.min(outstanding.length, 8) - 1
                          ? '1px solid var(--crm-hairline)'
                          : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {o.traveller_name}
                      </div>
                      <div className="crm-caption" style={{ fontSize: 11.5 }}>
                        {o.trip_name} · {formatDate(o.scheduled_date)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="crm-tabular" style={{ fontSize: 13, fontWeight: 600 }}>
                        {formatCurrency(o.amount_cents, o.currency)}
                      </div>
                      {o.is_overdue ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-red)' }}>
                          Overdue
                        </span>
                      ) : (
                        <span className="crm-caption" style={{ fontSize: 11 }}>
                          Due
                        </span>
                      )}
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--crm-text-4)', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent payments */}
          <div className="crm-card" style={{ gridColumn: '1 / -1' }}>
            <div className="crm-card-hd">
              <h3>Recent Payments</h3>
              <button className="crm-btn ghost sm" onClick={() => setTab('payments')}>
                View all <ArrowUpRight size={12} />
              </button>
            </div>
            {paymentsLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">Loading…</span>
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">No payments recorded yet</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                      {['Traveller', 'Trip', 'Type', 'Method', 'Amount', 'Status', 'Date'].map(h => (
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
                    {payments.slice(0, 10).map(p => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid var(--crm-hairline)' }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                          {p.traveller_name ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                          {p.trip_name ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {PAYMENT_TYPE_LABEL[p.type] ?? p.type}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                          {METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(p.amount_cents, p.currency)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusPill status={p.status} />
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                          {formatDate(p.paid_date ?? p.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3>All Payments</h3>
          </div>
          {paymentsLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <span className="crm-caption">Loading…</span>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <span className="crm-caption">No payments recorded yet</span>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                      {['Traveller', 'Trip', 'Type', 'Method', 'Amount', 'Status', 'Ref', 'Date'].map(h => (
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
                    {payments.map(p => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid var(--crm-hairline)' }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                          {p.traveller_name ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                          {p.trip_name ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {PAYMENT_TYPE_LABEL[p.type] ?? p.type}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                          {METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {p.type === 'refund'
                            ? `−${formatCurrency(p.amount_cents, p.currency)}`
                            : formatCurrency(p.amount_cents, p.currency)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusPill status={p.status} />
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            color: 'var(--crm-text-3)',
                            fontSize: 12,
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          {p.reference_number ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                          {formatDate(p.paid_date ?? p.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paymentMeta && paymentMeta.total > 20 && (
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
                    Page {paymentPage} of {Math.ceil(paymentMeta.total / 20)}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="crm-btn sm ghost"
                      disabled={paymentPage <= 1}
                      onClick={() => setPaymentPage(p => p - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="crm-btn sm ghost"
                      disabled={paymentPage >= Math.ceil(paymentMeta.total / 20)}
                      onClick={() => setPaymentPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'outstanding' && (
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3>Outstanding Payments</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--crm-text-3)' }}>
              <span style={{ color: 'var(--crm-red)', fontWeight: 600 }}>{overdueCount} overdue</span>
              <span>{upcomingCount} upcoming</span>
            </div>
          </div>
          {outstandingLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <span className="crm-caption">Loading…</span>
            </div>
          ) : outstanding.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <span className="crm-caption">All payments are up to date</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                    {['Traveller', 'Trip', 'Amount', 'Due Date', 'Status'].map(h => (
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
                  {outstanding.map(o => (
                    <tr
                      key={o.payment_id}
                      style={{
                        borderBottom: '1px solid var(--crm-hairline)',
                        background: o.is_overdue
                          ? 'color-mix(in oklab, var(--crm-red) 4%, transparent)'
                          : undefined,
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                        {o.traveller_name}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                        {o.trip_name}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(o.amount_cents, o.currency)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--crm-text-2)' }}>
                        {formatDate(o.scheduled_date)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {o.is_overdue ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 600,
                              background: 'var(--crm-red-bg)',
                              color: 'var(--crm-red)',
                            }}
                          >
                            <AlertTriangle size={11} /> Overdue
                          </span>
                        ) : (
                          <StatusPill status={o.status} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
