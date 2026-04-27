'use client';

import { use, useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

/* ─── Types ─── */

interface Activity {
  time?: string;
  type?: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  is_optional?: boolean;
  is_included?: boolean;
}

interface Meal {
  type: string; // breakfast | lunch | dinner | snack
  restaurant?: string;
  cuisine?: string;
  dietary_options?: string;
  notes?: string;
  is_included?: boolean;
}

interface Transport {
  mode: string;
  from_location?: string;
  to_location?: string;
  departure_time?: string;
  arrival_time?: string;
  operator?: string;
  vehicle?: string;
  notes?: string;
}

interface Accommodation {
  property_name: string;
  room_type?: string;
  check_in_time?: string;
  check_out_time?: string;
  address?: string;
  phone?: string;
  amenities?: string[];
  notes?: string;
}

interface ItineraryDay {
  day_number: number;
  title: string;
  altitude_meters?: number | null;
  distance_km?: number | null;
  weather_notes?: string | null;
  guide_name?: string | null;
  guide_phone?: string | null;
  activities: Activity[];
  meals: Meal[];
  transport: Transport[];
  accommodation: Accommodation[];
}

interface ItineraryData {
  trip_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  org_name: string;
  org_logo_url?: string | null;
  meeting_point?: string | null;
  meeting_time?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  itinerary: ItineraryDay[];
}

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();

  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (sameMonth) {
    return `${s.getDate()} – ${e.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} · ${days} days`;
  }
  if (sameYear) {
    return `${s.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short' })} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} · ${days} days`;
  }
  return `${formatDate(start)} – ${formatDate(end)} · ${days} days`;
}

function formatTime12(time24?: string | null): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function mealIcon(type: string): string {
  const lower = type.toLowerCase();
  if (lower === 'breakfast') return '☕';
  if (lower === 'dinner') return '🌙';
  return '🍽️';
}

function transportIcon(mode: string): string {
  const lower = mode.toLowerCase();
  if (lower.includes('flight') || lower.includes('plane')) return '✈️';
  if (lower.includes('train')) return '🚂';
  if (lower.includes('boat') || lower.includes('ferry')) return '⛵';
  if (lower.includes('bus')) return '🚌';
  if (lower.includes('walk') || lower.includes('trek')) return '🚶';
  if (lower.includes('bike') || lower.includes('cycle')) return '🚲';
  return '🚗';
}

/* ─── Styles ─── */

const colors = {
  bg: '#fafaf8',
  text: '#1a1a1a',
  textSecondary: '#555555',
  textMuted: '#888888',
  accent: '#2563eb',
  accentLight: '#eff6ff',
  card: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  dayHeader: '#f5f5f0',
  border: '#e8e8e4',
  badgeGreen: '#059669',
  badgeGreenBg: '#ecfdf5',
  badgeGray: '#6b7280',
  badgeGrayBg: '#f3f4f6',
};

const font = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
};

/* ─── Page Component ─── */

export default function PublicItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<ItineraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchItinerary() {
      try {
        const res = await fetch(`${API_URL}/public/itinerary/${token}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchItinerary();
  }, [token]);

  // Update page title
  useEffect(() => {
    if (data) {
      document.title = `${data.trip_name} — ${data.org_name}`;
    }
  }, [data]);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        fontFamily: font.sans,
        gap: 16,
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.accent,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading itinerary...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        fontFamily: font.sans,
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'grid',
          placeItems: 'center',
          fontSize: 28,
          marginBottom: 20,
        }}>
          &#128683;
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: colors.text, margin: '0 0 8px' }}>
          Itinerary not found
        </h1>
        <p style={{ fontSize: 15, color: colors.textSecondary, maxWidth: 400, lineHeight: 1.6 }}>
          This itinerary link is invalid or has expired. Please contact your tour operator for an updated link.
        </p>
      </div>
    );
  }

  /* ─── Main Itinerary ─── */
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media (max-width: 600px) {
          .itin-container { padding: 16px !important; }
          .itin-hero h1 { font-size: 26px !important; }
          .day-card { padding: 20px !important; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        fontFamily: font.sans,
        color: colors.text,
        WebkitFontSmoothing: 'antialiased',
      }}>

        {/* ─── Header ─── */}
        <header style={{
          borderBottom: `1px solid ${colors.border}`,
          background: colors.card,
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }} className="no-print">
          {data.org_logo_url ? (
            <img
              src={data.org_logo_url}
              alt={data.org_name}
              style={{ height: 32, width: 'auto', objectFit: 'contain', borderRadius: 4 }}
            />
          ) : (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: colors.accent,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}>
              {data.org_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>
            {data.org_name}
          </span>
        </header>

        {/* ─── Hero Section ─── */}
        <div className="itin-container" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 48px' }}>

          <section className="itin-hero" style={{ textAlign: 'center', padding: '40px 0 36px' }}>
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: font.serif,
              color: colors.text,
              margin: '0 0 10px',
              lineHeight: 1.25,
            }}>
              {data.trip_name}
            </h1>
            <p style={{ fontSize: 16, color: colors.textSecondary, margin: '0 0 6px' }}>
              {formatDateRange(data.start_date, data.end_date)}
            </p>
            <p style={{ fontSize: 15, color: colors.textMuted, margin: 0 }}>
              Prepared for <strong style={{ color: colors.text, fontWeight: 600 }}>{data.client_name}</strong>
            </p>
          </section>

          {/* ─── Quick Info ─── */}
          {(data.meeting_point || data.emergency_contact_name) && (
            <section style={{
              background: colors.card,
              borderRadius: 12,
              boxShadow: colors.cardShadow,
              padding: '20px 24px',
              marginBottom: 32,
              border: `1px solid ${colors.border}`,
            }}>
              <h2 style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: colors.textMuted,
                margin: '0 0 14px',
              }}>Quick Info</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.meeting_point && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 16, lineHeight: '22px', flexShrink: 0 }}>{'📍'}</span>
                    <div>
                      <span style={{ fontSize: 14, color: colors.textSecondary }}>Meeting Point: </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>
                        {data.meeting_point}
                        {data.meeting_time ? `, ${formatTime12(data.meeting_time)}` : ''}
                      </span>
                    </div>
                  </div>
                )}
                {data.emergency_contact_name && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 16, lineHeight: '22px', flexShrink: 0 }}>{'📞'}</span>
                    <div>
                      <span style={{ fontSize: 14, color: colors.textSecondary }}>Emergency: </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>
                        {data.emergency_contact_name}
                        {data.emergency_contact_phone ? ` ${data.emergency_contact_phone}` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ─── Days ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {data.itinerary.map((day) => (
              <DayCard key={day.day_number} day={day} startDate={data.start_date} />
            ))}
          </div>

          {/* ─── Footer ─── */}
          <footer className="no-print" style={{
            textAlign: 'center',
            padding: '48px 0 24px',
            fontSize: 13,
            color: colors.textMuted,
          }}>
            Powered by <span style={{ fontWeight: 600, color: colors.textSecondary }}>Tourify</span>
          </footer>
        </div>
      </div>
    </>
  );
}

/* ─── Day Card ─── */

function DayCard({ day, startDate }: { day: ItineraryDay; startDate: string }) {
  const dayDate = new Date(startDate + 'T00:00:00');
  dayDate.setDate(dayDate.getDate() + day.day_number - 1);
  const dateLabel = dayDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  // Build unified timeline events
  const events: { time: string; sortKey: string; node: React.ReactNode }[] = [];

  // Transport events
  day.transport.forEach((t, i) => {
    const time = t.departure_time || '';
    events.push({
      time,
      sortKey: time || `t_${i}`,
      node: <TransportItem key={`tr-${i}`} transport={t} />,
    });
  });

  // Activities
  day.activities.forEach((a, i) => {
    const time = a.time || '';
    events.push({
      time,
      sortKey: time || `a_${i}`,
      node: <ActivityItem key={`ac-${i}`} activity={a} />,
    });
  });

  // Meals
  day.meals.forEach((m, i) => {
    const time = mealSortTime(m.type);
    events.push({
      time,
      sortKey: time,
      node: <MealItem key={`ml-${i}`} meal={m} />,
    });
  });

  // Accommodation
  day.accommodation.forEach((acc, i) => {
    events.push({
      time: acc.check_in_time || '23:00',
      sortKey: acc.check_in_time || '23:00',
      node: <AccommodationItem key={`acco-${i}`} accommodation={acc} />,
    });
  });

  // Sort by time
  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <section className="day-card" style={{
      background: colors.card,
      borderRadius: 12,
      boxShadow: colors.cardShadow,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
    }}>
      {/* Day header */}
      <div style={{
        background: colors.dayHeader,
        padding: '18px 24px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: colors.accent,
            }}>Day {day.day_number}</span>
            <h3 style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: font.serif,
              color: colors.text,
              margin: '4px 0 0',
            }}>{day.title}</h3>
          </div>
          <span style={{ fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap' }}>{dateLabel}</span>
        </div>

        {/* Meta badges */}
        {(day.distance_km || day.altitude_meters || day.weather_notes || day.guide_name) && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
          }}>
            {day.distance_km != null && (
              <MetaBadge icon={'📍'} text={`${day.distance_km} km`} />
            )}
            {day.altitude_meters != null && (
              <MetaBadge icon={'⛰️'} text={`${day.altitude_meters.toLocaleString()} m`} />
            )}
            {day.weather_notes && (
              <MetaBadge icon={'☀️'} text={day.weather_notes} />
            )}
            {day.guide_name && (
              <MetaBadge
                icon={'🧑‍🌾'}
                text={`Guide: ${day.guide_name}${day.guide_phone ? ` (${day.guide_phone})` : ''}`}
              />
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: '20px 24px' }}>
        {events.length === 0 ? (
          <p style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic', margin: 0 }}>
            Free day &mdash; no activities scheduled
          </p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            {/* Vertical timeline line */}
            <div style={{
              position: 'absolute',
              left: 7,
              top: 6,
              bottom: 6,
              width: 2,
              background: `linear-gradient(to bottom, ${colors.accent}33, ${colors.accent}11)`,
              borderRadius: 1,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {events.map((ev, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: -23,
                    top: 6,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: colors.accent,
                    border: `2px solid ${colors.card}`,
                    boxShadow: `0 0 0 2px ${colors.accent}33`,
                  }} />
                  {ev.node}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Timeline Items ─── */

function TransportItem({ transport }: { transport: Transport }) {
  const icon = transportIcon(transport.mode);
  const route = [transport.from_location, transport.to_location].filter(Boolean).join(' → ');
  const timeStr = [
    transport.departure_time ? formatTime12(transport.departure_time) : '',
    transport.arrival_time ? formatTime12(transport.arrival_time) : '',
  ].filter(Boolean).join(' – ');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
          {capitalizeFirst(transport.mode)}
        </span>
        {timeStr && <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 4 }}>{timeStr}</span>}
      </div>
      {route && <p style={{ fontSize: 13, color: colors.textSecondary, margin: '2px 0 0', paddingLeft: 22 }}>{route}</p>}
      {transport.operator && (
        <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0', paddingLeft: 22 }}>
          {transport.operator}{transport.vehicle ? ` · ${transport.vehicle}` : ''}
        </p>
      )}
      {transport.notes && (
        <p style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', margin: '2px 0 0', paddingLeft: 22 }}>
          {transport.notes}
        </p>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icon = activityIcon(activity.type);
  const durationStr = activity.duration_minutes
    ? activity.duration_minutes >= 60
      ? `${Math.floor(activity.duration_minutes / 60)}h${activity.duration_minutes % 60 ? ` ${activity.duration_minutes % 60}m` : ''}`
      : `${activity.duration_minutes}m`
    : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{activity.title}</span>
        {activity.time && (
          <span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 4 }}>{formatTime12(activity.time)}</span>
        )}
        {durationStr && (
          <span style={{
            fontSize: 11,
            color: colors.textMuted,
            background: colors.badgeGrayBg,
            padding: '1px 7px',
            borderRadius: 99,
          }}>{durationStr}</span>
        )}
        {activity.is_optional && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: colors.badgeGray,
            background: colors.badgeGrayBg,
            padding: '1px 7px',
            borderRadius: 99,
          }}>Optional</span>
        )}
        {activity.is_included === true && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: colors.badgeGreen,
            background: colors.badgeGreenBg,
            padding: '1px 7px',
            borderRadius: 99,
          }}>Included</span>
        )}
      </div>
      {activity.description && (
        <p style={{ fontSize: 13, color: colors.textSecondary, margin: '2px 0 0', paddingLeft: 22, lineHeight: 1.5 }}>
          {activity.description}
        </p>
      )}
    </div>
  );
}

function MealItem({ meal }: { meal: Meal }) {
  const icon = mealIcon(meal.type);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{capitalizeFirst(meal.type)}</span>
        {meal.restaurant && (
          <span style={{ fontSize: 13, color: colors.textSecondary }}>&mdash; {meal.restaurant}</span>
        )}
        {meal.is_included === true && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: colors.badgeGreen,
            background: colors.badgeGreenBg,
            padding: '1px 7px',
            borderRadius: 99,
          }}>Included</span>
        )}
      </div>
      {(meal.cuisine || meal.dietary_options) && (
        <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0', paddingLeft: 22 }}>
          {[meal.cuisine, meal.dietary_options].filter(Boolean).join(' · ')}
        </p>
      )}
      {meal.notes && (
        <p style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', margin: '2px 0 0', paddingLeft: 22 }}>
          {meal.notes}
        </p>
      )}
    </div>
  );
}

function AccommodationItem({ accommodation }: { accommodation: Accommodation }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
        <span style={{ fontSize: 15 }}>{'🏨'}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{accommodation.property_name}</span>
      </div>
      <div style={{ paddingLeft: 22 }}>
        {accommodation.room_type && (
          <p style={{ fontSize: 13, color: colors.textSecondary, margin: '2px 0 0' }}>
            {accommodation.room_type}
          </p>
        )}
        {(accommodation.check_in_time || accommodation.check_out_time) && (
          <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0' }}>
            {accommodation.check_in_time ? `Check-in: ${formatTime12(accommodation.check_in_time)}` : ''}
            {accommodation.check_in_time && accommodation.check_out_time ? ' · ' : ''}
            {accommodation.check_out_time ? `Check-out: ${formatTime12(accommodation.check_out_time)}` : ''}
          </p>
        )}
        {accommodation.address && (
          <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0' }}>{accommodation.address}</p>
        )}
        {accommodation.phone && (
          <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0' }}>
            Tel: {accommodation.phone}
          </p>
        )}
        {accommodation.amenities && accommodation.amenities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {accommodation.amenities.map((a, i) => (
              <span key={i} style={{
                fontSize: 11,
                color: colors.textMuted,
                background: colors.badgeGrayBg,
                padding: '2px 8px',
                borderRadius: 99,
              }}>{a}</span>
            ))}
          </div>
        )}
        {accommodation.notes && (
          <p style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', margin: '4px 0 0' }}>
            {accommodation.notes}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Small Components ─── */

function MetaBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: colors.textSecondary,
      background: `${colors.card}`,
      border: `1px solid ${colors.border}`,
      borderRadius: 99,
      padding: '3px 10px',
      whiteSpace: 'nowrap',
    }}>
      <span>{icon}</span>
      {text}
    </span>
  );
}

/* ─── Utility ─── */

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function activityIcon(type?: string): string {
  if (!type) return '📌';
  const t = type.toLowerCase();
  if (t.includes('hike') || t.includes('trek')) return '🥾';
  if (t.includes('boat') || t.includes('cruise') || t.includes('kayak') || t.includes('raft')) return '🚣';
  if (t.includes('dive') || t.includes('snorkel') || t.includes('swim')) return '🏊';
  if (t.includes('bike') || t.includes('cycle')) return '🚴';
  if (t.includes('safari') || t.includes('wildlife')) return '🦁';
  if (t.includes('temple') || t.includes('church') || t.includes('mosque') || t.includes('monument') || t.includes('museum') || t.includes('heritage')) return '🏛️';
  if (t.includes('shop') || t.includes('market')) return '🛒';
  if (t.includes('spa') || t.includes('massage') || t.includes('wellness')) return '📆';
  if (t.includes('cooking') || t.includes('food') || t.includes('tasting')) return '👨‍🍳';
  if (t.includes('photo')) return '📷';
  if (t.includes('camp')) return '⛺';
  if (t.includes('yoga') || t.includes('meditat')) return '🧘';
  return '🎯';
}

function mealSortTime(type: string): string {
  const t = type.toLowerCase();
  if (t === 'breakfast') return '07:30';
  if (t === 'lunch') return '12:30';
  if (t === 'snack') return '16:00';
  if (t === 'dinner') return '19:30';
  return '12:00';
}
