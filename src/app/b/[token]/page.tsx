'use client';

import { use, useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, MapPin, Clock, MessageCircle, Download, ChevronDown, ChevronUp, Upload, FileText, Check, AlertCircle, X, Phone, Heart, Shield, Shirt, Droplets, Utensils, Bus, Hotel, Sun, CreditCard, User, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

/* ─── Types ─── */

interface Activity { time?: string; type?: string; title: string; description?: string; duration_minutes?: number; is_optional?: boolean; is_included?: boolean; }
interface Meal { type: string; restaurant?: string; cuisine?: string; dietary_options?: string; notes?: string; is_included?: boolean; }
interface Transport { mode: string; from_location?: string; to_location?: string; departure_time?: string; arrival_time?: string; operator?: string; vehicle?: string; notes?: string; }
interface Accommodation { property_name: string; room_type?: string; check_in_time?: string; check_out_time?: string; address?: string; phone?: string; amenities?: string[]; notes?: string; }
interface ItineraryDay { day_number: number; title: string; traveller_notes?: string; locations?: string[]; activities: Activity[]; meals: Meal[]; transport: Transport[]; accommodation: Accommodation[]; }
interface Document { id: string; document_type: string; label: string; is_required: boolean; status: string; file_url?: string; }
interface PaymentItem { amount_cents: number; currency: string; type: string; status: string; scheduled_date?: string; paid_date?: string; }
interface EmergencyContact { name: string; relation: string; phone: string; }

interface GroupMemberDoc { id: string; document_type: string; label: string; is_required: boolean; status: string; file_url?: string; }
interface GroupMember { booking_id: string; name: string; status: string; portal_token: string; documents: GroupMemberDoc[]; }

interface BoardingPassData {
  booking: { id: string; status: string; payment_status: string; special_requests?: string; portal_token: string };
  trip: { name: string; destinations?: string[]; duration_days?: number; duration_nights?: number; short_description?: string; hero_image_url?: string; packing_list_template?: string; whats_included_text?: string; whats_excluded_text?: string };
  departure: { start_date: string; end_date: string; meeting_point?: string; meeting_time?: string; whatsapp_link?: string; pickup_city?: string; drop_city?: string };
  organisation: { name: string; logo_url?: string };
  itinerary: ItineraryDay[];
  documents: Document[];
  payments: { items: PaymentItem[]; total_paid_cents: number; total_due_cents: number };
  group_members: GroupMember[];
  co_travellers: { name: string }[];
  traveller: {
    full_legal_name?: string; preferred_name?: string; email?: string; phone?: string; whatsapp?: string;
    dietary?: string; allergies?: string; medical_conditions?: string; medications?: string;
    blood_group?: string; tshirt_size?: string; jacket_size?: string;
    emergency_contacts?: EmergencyContact[];
  };
}

/* ─── Helpers ─── */

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(cents: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days > 1) return `Starts in ${days} days`;
  if (days === 1) return 'Starts tomorrow';
  if (days === 0) return 'Starts today';
  return 'Trip in progress';
}

function statusColor(status: string): { bg: string; fg: string } {
  const s = status.toLowerCase();
  if (s === 'verified' || s === 'paid' || s === 'completed' || s === 'confirmed') return { bg: 'var(--crm-green-bg)', fg: 'var(--crm-green)' };
  if (s === 'pending' || s === 'uploaded' || s === 'scheduled' || s === 'partially_paid') return { bg: 'var(--crm-amber-bg)', fg: 'var(--crm-amber)' };
  if (s === 'rejected' || s === 'overdue' || s === 'failed' || s === 'cancelled') return { bg: 'var(--crm-red-bg)', fg: 'var(--crm-red)' };
  return { bg: 'var(--crm-bg-active)', fg: 'var(--crm-text-3)' };
}

function formatTime12(time24?: string | null): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/* ─── Styles ─── */

const S = {
  page: { minHeight: '100vh', background: '#fafbfc', fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)', color: 'var(--crm-text, #1d1d1f)', WebkitFontSmoothing: 'antialiased' as const },
  container: { maxWidth: 640, margin: '0 auto', padding: '0 0 64px' },
  card: { background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 20, marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 13, fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--crm-text-4, #86868b)', margin: '0 0 14px', padding: '0 4px' },
  label: { fontSize: 12, fontWeight: 500 as const, color: 'var(--crm-text-3, #6e6e73)', marginBottom: 4, display: 'block' as const },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--crm-line, rgba(0,0,0,0.08))', fontSize: 14, fontFamily: 'inherit', color: 'var(--crm-text)', background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
  pill: (status: string) => { const c = statusColor(status); return { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, background: c.bg, color: c.fg } as React.CSSProperties; },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, padding: '0 20px', borderRadius: 12, fontSize: 14, fontWeight: 600 as const, background: 'var(--crm-accent, #0071e3)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' } as React.CSSProperties,
  btnOutline: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, padding: '0 20px', borderRadius: 12, fontSize: 14, fontWeight: 500 as const, background: '#fff', color: 'var(--crm-text)', border: '1px solid var(--crm-line, rgba(0,0,0,0.08))', cursor: 'pointer', fontFamily: 'inherit', width: '100%' } as React.CSSProperties,
};

/* ─── Page Component ─── */

export default function BoardingPassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ data: BoardingPassData }>({
    queryKey: ['boarding-pass', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/b/${token}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : 'error');
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      document.title = `${data.data.trip.name} - ${data.data.organisation.name}`;
    }
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (error || !data?.data) return <ErrorState notFound={(error as Error)?.message === 'not_found'} />;

  const d = data.data;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .bp-container { padding: 0 !important; }
          .bp-card { border-radius: 0 !important; margin-left: -0px !important; margin-right: -0px !important; }
        }
      `}</style>

      <div className="bp-container" style={S.container}>
        <HeaderSection org={d.organisation} trip={d.trip} departure={d.departure} />
        <HeroSection trip={d.trip} />

        <div style={{ padding: '0 16px' }}>
          <QuickInfoCard departure={d.departure} trip={d.trip} />
          <ActionButtons departure={d.departure} trip={d.trip} />
          {d.itinerary.length > 0 && <ItinerarySection itinerary={d.itinerary} startDate={d.departure.start_date} />}
          {d.documents.length > 0 && <DocumentsSection documents={d.documents} token={token} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['boarding-pass', token] })} />}
          <PaymentsSection payments={d.payments} />
          <ProfileSection traveller={d.traveller} token={token} />
          {d.group_members?.length > 0 && <GroupMembersSection members={d.group_members} token={token} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['boarding-pass', token] })} />}
          {d.co_travellers.length > 0 && <CoTravellersSection coTravellers={d.co_travellers} />}
          <IncludedExcludedSection trip={d.trip} />

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '32px 0 16px', fontSize: 12, color: 'var(--crm-text-4)' }}>
            Powered by <span style={{ fontWeight: 600, color: 'var(--crm-text-3)' }}>Tourify</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading & Error States ─── */

function LoadingState() {
  return (
    <div style={{ ...S.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 40, height: 40, border: '3px solid var(--crm-line, #e5e5e5)', borderTopColor: 'var(--crm-accent, #0071e3)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 14, color: 'var(--crm-text-3)', margin: 0 }}>Loading your trip details...</p>
    </div>);
}

function ErrorState({ notFound }: { notFound: boolean }) {
  return (
    <div style={{ ...S.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: notFound ? '#fef3c7' : '#fee2e2', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
        {notFound ? <MapPin size={28} color="#d97706" /> : <AlertCircle size={28} color="#dc2626" />}
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>{notFound ? 'Trip not found' : 'Something went wrong'}</h1>
      <p style={{ fontSize: 15, color: 'var(--crm-text-3)', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
        {notFound ? 'This link may be invalid or expired. Please contact your tour operator for an updated link.' : 'We could not load your trip details. Please try refreshing the page or contact your tour operator.'}
      </p>
    </div>);
}

/* ─── 1. Header ─── */

function HeaderSection({ org, trip, departure }: { org: BoardingPassData['organisation']; trip: BoardingPassData['trip']; departure: BoardingPassData['departure'] }) {
  const countdown = countdownLabel(departure.start_date);
  const daysLeft = daysUntil(departure.start_date);

  const logo = org.logo_url
    ? <img src={org.logo_url} alt={org.name} style={{ height: 32, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
    : <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--crm-accent)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{org.name.charAt(0).toUpperCase()}</div>;
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid var(--crm-hairline, rgba(0,0,0,0.06))', padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {logo}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text)' }}>{org.name}</div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-4)' }}>{trip.name}</div>
          </div>
        </div>
        {daysLeft >= 0 && (
          <div style={{ background: daysLeft <= 3 ? 'var(--crm-amber-bg)' : 'var(--crm-accent-bg)', color: daysLeft <= 3 ? 'var(--crm-amber)' : 'var(--crm-accent)', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{countdown}</div>
        )}
      </div>
    </header>
  );
}

/* ─── 2. Hero ─── */

function HeroSection({ trip }: { trip: BoardingPassData['trip'] }) {
  const hasImage = !!trip.hero_image_url;

  return (
    <div style={{
      position: 'relative',
      height: hasImage ? 240 : 140,
      background: hasImage ? undefined : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {hasImage && (
        <img
          src={trip.hero_image_url!}
          alt={trip.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: hasImage ? 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' : 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '24px 20px',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 4px', lineHeight: 1.2, letterSpacing: '-0.02em', textShadow: hasImage ? 'none' : '0 1px 2px rgba(0,0,0,0.2)' }}>
          {trip.name}
        </h1>
        {trip.destinations && trip.destinations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            <MapPin size={14} />
            <span>{trip.destinations.join(' / ')}</span>
          </div>
        )}
        {trip.short_description && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '6px 0 0', lineHeight: 1.4 }}>
            {trip.short_description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── 3. Quick Info Card ─── */

function QuickInfoCard({ departure, trip }: { departure: BoardingPassData['departure']; trip: BoardingPassData['trip'] }) {
  const items: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (departure.start_date) items.push({ icon: <Calendar size={16} />, label: 'Start', value: formatDate(departure.start_date) });
  if (departure.end_date) items.push({ icon: <Calendar size={16} />, label: 'End', value: formatDate(departure.end_date) });
  if (trip.duration_days) items.push({ icon: <Sun size={16} />, label: 'Duration', value: `${trip.duration_days}D / ${trip.duration_nights || (trip.duration_days - 1)}N` });
  if (departure.pickup_city) items.push({ icon: <MapPin size={16} />, label: 'Pickup', value: departure.pickup_city });
  if (departure.drop_city) items.push({ icon: <MapPin size={16} />, label: 'Drop', value: departure.drop_city });
  if (departure.meeting_point) items.push({ icon: <MapPin size={16} />, label: 'Meeting Point', value: departure.meeting_point });
  if (departure.meeting_time) items.push({ icon: <Clock size={16} />, label: 'Meeting Time', value: formatTime12(departure.meeting_time) });

  if (items.length === 0) return null;

  return (
    <div className="bp-card" style={S.card}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ color: 'var(--crm-accent)', flexShrink: 0, marginTop: 1 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--crm-text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 4. Action Buttons ─── */

function ActionButtons({ departure, trip }: { departure: BoardingPassData['departure']; trip: BoardingPassData['trip'] }) {
  const hasWhatsApp = !!departure.whatsapp_link;
  const hasPackingList = !!trip.packing_list_template;
  if (!hasWhatsApp && !hasPackingList) return null;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, padding: '0 0' }}>
      {hasWhatsApp && (
        <a href={departure.whatsapp_link!} target="_blank" rel="noopener noreferrer" style={{ ...S.btnPrimary, textDecoration: 'none', background: '#25D366', flex: 1 }}>
          <MessageCircle size={18} />
          WhatsApp Group
        </a>
      )}
      {hasPackingList && (
        <a href={trip.packing_list_template!} target="_blank" rel="noopener noreferrer" style={{ ...S.btnOutline, textDecoration: 'none', flex: 1 }}>
          <Download size={18} />
          Packing List
        </a>
      )}
    </div>
  );
}

/* ─── 5. Itinerary ─── */

function ItinerarySection({ itinerary, startDate }: { itinerary: ItineraryDay[]; startDate: string }) {
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));

  function toggleDay(dayNumber: number) {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={S.sectionTitle}>Itinerary</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itinerary.map((day) => {
          const isOpen = openDays.has(day.day_number);
          const dayDate = new Date(startDate);
          dayDate.setDate(dayDate.getDate() + day.day_number - 1);
          const dateLabel = dayDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

          return (
            <div key={day.day_number} className="bp-card" style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 0 }}>
              {/* Day header - clickable */}
              <button
                onClick={() => toggleDay(day.day_number)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--crm-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Day {day.day_number}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>{dateLabel}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--crm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {day.title}
                  </div>
                </div>
                <div style={{ color: 'var(--crm-text-4)', flexShrink: 0, marginLeft: 8 }}>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Day content */}
              {isOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--crm-hairline, rgba(0,0,0,0.06))' }}>
                  {day.traveller_notes && (
                    <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.5, margin: '14px 0', padding: '10px 12px', background: 'var(--crm-accent-bg)', borderRadius: 8, fontStyle: 'italic' }}>
                      {day.traveller_notes}
                    </p>
                  )}

                  {day.locations && day.locations.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '14px 0 0' }}>
                      {day.locations.map((loc, i) => (
                        <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--crm-bg-active)', color: 'var(--crm-text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {loc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Activities */}
                  {day.activities.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sun size={12} /> Activities
                      </div>
                      {day.activities.map((act, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: i < day.activities.length - 1 ? '1px solid var(--crm-hairline)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{act.title}</span>
                            {act.time && <span style={{ fontSize: 12, color: 'var(--crm-text-4)' }}>{formatTime12(act.time)}</span>}
                            {act.is_optional && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--crm-bg-active)', color: 'var(--crm-text-3)' }}>Optional</span>}
                          </div>
                          {act.description && <p style={{ fontSize: 13, color: 'var(--crm-text-3)', margin: '4px 0 0', lineHeight: 1.5 }}>{act.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meals */}
                  {day.meals.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Utensils size={12} /> Meals
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {day.meals.map((meal, i) => (
                          <span key={i} style={{ fontSize: 13, padding: '5px 12px', borderRadius: 10, background: '#fff8f0', border: '1px solid #fed7aa', color: '#9a3412', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                            {meal.restaurant && <span style={{ color: '#b45309', fontSize: 11 }}>at {meal.restaurant}</span>}
                            {meal.is_included && <Check size={12} color="#059669" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transport */}
                  {day.transport.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bus size={12} /> Transport
                      </div>
                      {day.transport.map((t, i) => (
                        <div key={i} style={{ padding: '6px 0', fontSize: 13, color: 'var(--crm-text-2)' }}>
                          <span style={{ fontWeight: 500, color: 'var(--crm-text)' }}>{t.mode}</span>
                          {t.from_location && t.to_location && <span> &middot; {t.from_location} to {t.to_location}</span>}
                          {t.departure_time && <span style={{ color: 'var(--crm-text-4)', marginLeft: 8, fontSize: 12 }}>{formatTime12(t.departure_time)}</span>}
                          {t.notes && <p style={{ fontSize: 12, color: 'var(--crm-text-4)', margin: '2px 0 0', fontStyle: 'italic' }}>{t.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Accommodation */}
                  {day.accommodation.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Hotel size={12} /> Stay
                      </div>
                      {day.accommodation.map((acc, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'var(--crm-bg-subtle, #f5f5f7)', borderRadius: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{acc.property_name}</div>
                          {acc.room_type && <div style={{ fontSize: 12, color: 'var(--crm-text-3)', marginTop: 2 }}>{acc.room_type}</div>}
                          {(acc.check_in_time || acc.check_out_time) && (
                            <div style={{ fontSize: 12, color: 'var(--crm-text-4)', marginTop: 2 }}>
                              {acc.check_in_time && `Check-in: ${formatTime12(acc.check_in_time)}`}
                              {acc.check_in_time && acc.check_out_time && ' / '}
                              {acc.check_out_time && `Check-out: ${formatTime12(acc.check_out_time)}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 6. Documents ─── */

function DocumentsSection({ documents, token, onRefresh }: { documents: Document[]; token: string; onRefresh: () => void }) {
  const [uploading, setUploading] = useState<string | null>(null);

  async function handleUpload(docId: string, file: File) {
    setUploading(docId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/b/${token}/documents/${docId}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Document uploaded successfully');
      onRefresh();
    } catch {
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={S.sectionTitle}>Documents</h2>
      <div className="bp-card" style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {documents.map((doc, i) => (
          <DocumentRow key={doc.id} doc={doc} isLast={i === documents.length - 1} uploading={uploading === doc.id} onUpload={handleUpload} />
        ))}
      </div>
    </div>
  );
}

function DocumentRow({ doc, isLast, uploading, onUpload }: { doc: Document; isLast: boolean; uploading: boolean; onUpload: (docId: string, file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusIcon = doc.status === 'verified' ? <Check size={14} /> : doc.status === 'rejected' ? <X size={14} /> : null;

  return (
    <div style={{ padding: '14px 20px', borderBottom: isLast ? 'none' : '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="var(--crm-text-3)" />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{doc.label}</span>
          {doc.is_required && <span style={{ fontSize: 10, color: 'var(--crm-red)', fontWeight: 600 }}>Required</span>}
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={S.pill(doc.status)}>
            {statusIcon} {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
          </span>
        </div>
      </div>

      <div>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(doc.id, f); e.target.value = ''; }} />
        {doc.status !== 'verified' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--crm-accent-bg)', color: 'var(--crm-accent)',
              border: 'none', cursor: uploading ? 'wait' : 'pointer', fontFamily: 'inherit',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : doc.file_url ? 'Re-upload' : 'Upload'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 7. Payments ─── */

function PaymentsSection({ payments }: { payments: BoardingPassData['payments'] }) {
  const total = payments.total_paid_cents + payments.total_due_cents;
  const paidPct = total > 0 ? (payments.total_paid_cents / total) * 100 : 0;
  const statLabel = { fontSize: 11, color: 'var(--crm-text-4)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
  const statVal = (color: string) => ({ fontSize: 18, fontWeight: 700 as const, color, marginTop: 2, fontVariantNumeric: 'tabular-nums' as const });

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={S.sectionTitle}>Payments</h2>
      <div className="bp-card" style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div><div style={statLabel}>Total</div><div style={statVal('var(--crm-text)')}>{formatCurrency(total)}</div></div>
          <div><div style={statLabel}>Paid</div><div style={statVal('var(--crm-green)')}>{formatCurrency(payments.total_paid_cents)}</div></div>
          <div><div style={statLabel}>Balance</div><div style={statVal(payments.total_due_cents > 0 ? 'var(--crm-amber)' : 'var(--crm-green)')}>{formatCurrency(payments.total_due_cents)}</div></div>
        </div>
        <div style={{ height: 6, background: 'var(--crm-bg-active)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${Math.min(paidPct, 100)}%`, background: paidPct >= 100 ? 'var(--crm-green)' : 'var(--crm-accent)', borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        {payments.items.length > 0 && payments.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: i > 0 ? '1px solid var(--crm-hairline)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: statusColor(item.status).bg }}>
                <CreditCard size={15} color={statusColor(item.status).fg} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text)' }}>{item.type.charAt(0).toUpperCase() + item.type.slice(1).replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>{item.paid_date ? formatDate(item.paid_date) : item.scheduled_date ? `Due ${formatDate(item.scheduled_date)}` : ''}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount_cents, item.currency)}</div>
              <span style={{ ...S.pill(item.status), fontSize: 10, padding: '1px 7px' }}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 8. My Info / Profile ─── */

function ProfileSection({ traveller, token }: { traveller: BoardingPassData['traveller']; token: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: traveller.phone || '',
    whatsapp: traveller.whatsapp || '',
    dietary: traveller.dietary || '',
    allergies: traveller.allergies || '',
    medical_conditions: traveller.medical_conditions || '',
    medications: traveller.medications || '',
    blood_group: traveller.blood_group || '',
    tshirt_size: traveller.tshirt_size || '',
    jacket_size: traveller.jacket_size || '',
    emergency_contacts: traveller.emergency_contacts || [],
  });

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateEmergencyContact(index: number, field: string, value: string) {
    setForm(prev => {
      const contacts = [...prev.emergency_contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, emergency_contacts: contacts };
    });
  }

  function addEmergencyContact() {
    setForm(prev => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, { name: '', relation: '', phone: '' }] }));
  }

  function removeEmergencyContact(index: number) {
    setForm(prev => ({ ...prev, emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/b/${token}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const F = (I: typeof Phone, l: string) => <I size={14} />;
  const infoFields: { key: string; label: string; icon: React.ReactNode; placeholder: string }[] = [
    { key: 'phone', label: 'Phone', icon: F(Phone, ''), placeholder: '+91 98765 43210' },
    { key: 'whatsapp', label: 'WhatsApp', icon: F(MessageCircle, ''), placeholder: '+91 98765 43210' },
    { key: 'dietary', label: 'Dietary Preference', icon: F(Utensils, ''), placeholder: 'Vegetarian, Vegan, etc.' },
    { key: 'allergies', label: 'Allergies', icon: F(AlertCircle, ''), placeholder: 'Any allergies' },
    { key: 'medical_conditions', label: 'Medical Conditions', icon: F(Heart, ''), placeholder: 'Any conditions' },
    { key: 'medications', label: 'Medications', icon: F(Shield, ''), placeholder: 'Current medications' },
    { key: 'blood_group', label: 'Blood Group', icon: F(Droplets, ''), placeholder: 'A+, B-, O+, etc.' },
    { key: 'tshirt_size', label: 'T-Shirt Size', icon: F(Shirt, ''), placeholder: 'S, M, L, XL, XXL' },
    { key: 'jacket_size', label: 'Jacket Size', icon: F(Shirt, ''), placeholder: 'S, M, L, XL, XXL' },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
        <h2 style={{ ...S.sectionTitle, margin: 0 }}>My Info</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>
            Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="bp-card" style={S.card}>
        {traveller.full_legal_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--crm-hairline)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--crm-accent-bg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><User size={20} color="var(--crm-accent)" /></div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--crm-text)' }}>{traveller.full_legal_name}</div>
              {traveller.email && <div style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>{traveller.email}</div>}
            </div>
          </div>)}

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {infoFields.map(({ key, label, icon, placeholder }) => (
            <div key={key}>
              <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: 'var(--crm-text-4)' }}>{icon}</span> {label}
              </label>
              {editing ? (
                <input
                  type="text"
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  style={S.input}
                />
              ) : (
                <div style={{ fontSize: 14, color: (form as Record<string, unknown>)[key] ? 'var(--crm-text)' : 'var(--crm-text-disabled)', padding: '6px 0' }}>
                  {((form as Record<string, unknown>)[key] as string) || 'Not provided'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Emergency contacts */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--crm-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ ...S.label, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--crm-text-4)' }}><Shield size={14} /></span> Emergency Contacts
            </label>
            {editing && (
              <button onClick={addEmergencyContact} style={{ fontSize: 12, fontWeight: 500, color: 'var(--crm-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Add
              </button>
            )}
          </div>

          {form.emergency_contacts.length === 0 && !editing && (
            <div style={{ fontSize: 14, color: 'var(--crm-text-disabled)', padding: '6px 0' }}>No emergency contacts added</div>
          )}

          {form.emergency_contacts.map((contact, i) => (
            <div key={i} style={{ padding: '12px', background: 'var(--crm-bg-subtle)', borderRadius: 10, marginBottom: 8 }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={contact.name} onChange={(e) => updateEmergencyContact(i, 'name', e.target.value)} placeholder="Name" style={{ ...S.input, flex: 1 }} />
                    <input type="text" value={contact.relation} onChange={(e) => updateEmergencyContact(i, 'relation', e.target.value)} placeholder="Relation" style={{ ...S.input, flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={contact.phone} onChange={(e) => updateEmergencyContact(i, 'phone', e.target.value)} placeholder="Phone" style={{ ...S.input, flex: 1 }} />
                    <button onClick={() => removeEmergencyContact(i)} style={{ padding: '0 10px', background: 'var(--crm-red-bg)', color: 'var(--crm-red)', border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{contact.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--crm-text-3)', marginTop: 2 }}>{contact.relation} &middot; {contact.phone}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        {editing && (
          <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, marginTop: 16, opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 9. Co-Travellers ─── */

/* ─── 9a. Group Members (with doc management) ─── */

function GroupMembersSection({ members, token, onRefresh }: { members: GroupMember[]; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function handleUpload(docId: string, file: File) {
    setUploading(docId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/b/${token}/documents/${docId}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('Document uploaded');
      onRefresh();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={S.sectionTitle}>Your Group</h2>
      <div className="bp-card" style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {members.map((m, i) => {
          const isOpen = expanded === m.booking_id;
          const pendingDocs = m.documents.filter(d => d.status !== 'verified').length;
          return (
            <div key={m.booking_id} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--crm-hairline)' : 'none' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : m.booking_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${(i * 97) % 360}, 50%, 60%)`, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--crm-text-4)', marginTop: 1 }}>
                    {pendingDocs > 0 ? `${pendingDocs} doc${pendingDocs > 1 ? 's' : ''} pending` : m.documents.length > 0 ? 'All docs complete' : 'No documents'}
                  </div>
                </div>
                {m.documents.length > 0 && (
                  isOpen ? <ChevronUp size={16} color="var(--crm-text-4)" /> : <ChevronDown size={16} color="var(--crm-text-4)" />
                )}
              </div>
              {isOpen && m.documents.length > 0 && (
                <div style={{ padding: '0 20px 14px' }}>
                  {m.documents.map(doc => (
                    <GroupMemberDocRow key={doc.id} doc={doc} uploading={uploading === doc.id} onUpload={handleUpload} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupMemberDocRow({ doc, uploading, onUpload }: { doc: GroupMemberDoc; uploading: boolean; onUpload: (docId: string, file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--crm-hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <FileText size={14} color="var(--crm-text-4)" />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{doc.label}</span>
        {doc.is_required && <span style={{ fontSize: 10, color: 'var(--crm-red)', fontWeight: 600 }}>Required</span>}
      </div>
      <span style={S.pill(doc.status)}>{doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}</span>
      {doc.status !== 'verified' && (
        <>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(doc.id, f); e.target.value = ''; }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'var(--crm-accent-bg)', color: 'var(--crm-accent)', border: 'none', cursor: uploading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={12} />}
            {uploading ? '...' : doc.file_url ? 'Re-upload' : 'Upload'}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── 9b. Co-Travellers (name only) ─── */

function CoTravellersSection({ coTravellers }: { coTravellers: { name: string }[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={S.sectionTitle}>Co-Travellers</h2>
      <div className="bp-card" style={S.card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {coTravellers.map((ct, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--crm-bg-subtle)', borderRadius: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(i * 67) % 360}, 50%, 60%)`, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{ct.name.charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{ct.name}</span>
            </div>))}
        </div>
      </div>
    </div>);
}

/* ─── 10. What's Included / Excluded ─── */

function IncExcBlock({ label, text, color, icon }: { label: string; text: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bp-card" style={{ ...S.card, marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: `var(--crm-${color}-bg)`, display: 'grid', placeItems: 'center' }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: `var(--crm-${color})` }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{text}</div>
    </div>
  );
}

function IncludedExcludedSection({ trip }: { trip: BoardingPassData['trip'] }) {
  if (!trip.whats_included_text && !trip.whats_excluded_text) return null;
  const both = !!(trip.whats_included_text && trip.whats_excluded_text);
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={S.sectionTitle}>What&apos;s Included &amp; Excluded</h2>
      <div style={{ display: 'grid', gridTemplateColumns: both ? '1fr 1fr' : '1fr', gap: 12 }}>
        {trip.whats_included_text && <IncExcBlock label="Included" text={trip.whats_included_text} color="green" icon={<Check size={14} color="var(--crm-green)" />} />}
        {trip.whats_excluded_text && <IncExcBlock label="Excluded" text={trip.whats_excluded_text} color="red" icon={<X size={14} color="var(--crm-red)" />} />}
      </div>
    </div>
  );
}
