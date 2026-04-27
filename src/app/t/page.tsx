'use client';

import { useQuery } from '@tanstack/react-query';
import { travellerApi } from '@/lib/traveller-api';
import { useTravellerAuth } from '@/lib/traveller-auth';
import type { APIResponse } from '@/types/api';
import type { PortalTrip } from '@/types/portal';
import Link from 'next/link';
import { MapPin, Calendar, Clock, Upload, UserCircle, Star } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function TravellerDashboard() {
  const { traveller } = useTravellerAuth();

  const { data: tripsData, isLoading } = useQuery({
    queryKey: ['portal-trips'],
    queryFn: () => travellerApi.get<APIResponse<PortalTrip[]>>('/portal/trips'),
  });

  const trips = tripsData?.data ?? [];
  const now = new Date();

  const upcomingTrips = trips
    .filter((t) => new Date(t.start_date) > now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const pastTrips = trips
    .filter((t) => new Date(t.end_date) <= now)
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
    .slice(0, 3);

  const displayName = traveller?.preferred_name || traveller?.full_legal_name || 'Traveller';

  // Derive action items
  const actionItems: { icon: typeof Upload; label: string; href: string }[] = [];
  if (!traveller?.phone) {
    actionItems.push({ icon: UserCircle, label: 'Complete your profile', href: '/t/profile' });
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 4 }}>
          Welcome back, {displayName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--crm-text-3)' }}>
          Here&apos;s what&apos;s happening with your trips
        </p>
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13 }}>
          Loading your trips...
        </div>
      )}

      {/* Action items */}
      {actionItems.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Action items
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actionItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="crm-card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'var(--crm-text)',
                  borderLeft: '3px solid var(--crm-amber)',
                }}
              >
                <item.icon size={18} style={{ color: 'var(--crm-amber)' }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming trips */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Upcoming trips
        </h2>
        {upcomingTrips.length === 0 && !isLoading ? (
          <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
            <MapPin size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 14 }}>No upcoming trips</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingTrips.map((trip) => {
              const days = daysUntil(trip.start_date);
              return (
                <Link
                  key={trip.booking_id}
                  href={`/t/trips/${trip.booking_id}`}
                  className="crm-card"
                  style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'var(--crm-text)' }}
                >
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{trip.trip_name}</h3>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: days <= 7 ? 'var(--crm-red-bg)' : days <= 30 ? 'var(--crm-amber-bg)' : 'var(--crm-accent-bg)',
                          color: days <= 7 ? 'var(--crm-red)' : days <= 30 ? 'var(--crm-amber)' : 'var(--crm-accent)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Clock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                        in {days} day{days !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {trip.destination && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--crm-text-3)', marginBottom: 4 }}>
                        <MapPin size={13} />
                        {trip.destination}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--crm-text-3)' }}>
                      <Calendar size={13} />
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </div>
                    {trip.operator_name && (
                      <div style={{ fontSize: 12, color: 'var(--crm-text-4)', marginTop: 6 }}>
                        by {trip.operator_name}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent past trips */}
      {pastTrips.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recent trips
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastTrips.map((trip) => (
              <Link
                key={trip.booking_id}
                href={`/t/trips/${trip.booking_id}`}
                className="crm-card"
                style={{ padding: '14px 20px', textDecoration: 'none', color: 'var(--crm-text)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{trip.trip_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      background: 'var(--crm-accent-bg)',
                      color: 'var(--crm-accent)',
                    }}
                  >
                    <Star size={12} />
                    Leave a review
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
