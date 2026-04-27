'use client';

import { useQuery } from '@tanstack/react-query';
import { travellerApi } from '@/lib/traveller-api';
import type { APIResponse } from '@/types/api';
import type { PortalTrip } from '@/types/portal';
import Link from 'next/link';
import { MapPin, Calendar } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: 'var(--crm-green-bg)', text: 'var(--crm-green)' },
  waitlisted: { bg: 'var(--crm-amber-bg)', text: 'var(--crm-amber)' },
  cancelled: { bg: 'var(--crm-red-bg)', text: 'var(--crm-red)' },
  completed: { bg: 'var(--crm-accent-bg)', text: 'var(--crm-accent)' },
};

export default function TravellerTripsPage() {
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
    .filter((t) => new Date(t.start_date) <= now)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const sortedTrips = [...upcomingTrips, ...pastTrips];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 20 }}>
        My Trips
      </h1>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13 }}>
          Loading trips...
        </div>
      )}

      {!isLoading && sortedTrips.length === 0 && (
        <div className="crm-card" style={{ padding: 48, textAlign: 'center' }}>
          <MapPin size={32} style={{ color: 'var(--crm-text-3)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No trips yet</div>
          <div style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>
            Your trips will appear here once your operator books you
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedTrips.map((trip) => {
          const isPast = new Date(trip.end_date) <= now;
          const statusStyle = STATUS_COLORS[trip.status] ?? { bg: 'var(--crm-bg-active)', text: 'var(--crm-text-3)' };

          return (
            <Link
              key={trip.booking_id}
              href={`/t/trips/${trip.booking_id}`}
              className="crm-card"
              style={{
                padding: '16px 20px',
                textDecoration: 'none',
                color: 'var(--crm-text)',
                opacity: isPast ? 0.75 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{trip.trip_name}</h3>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    textTransform: 'capitalize',
                  }}
                >
                  {trip.status}
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
