'use client';

import { useQuery } from '@tanstack/react-query';
import { travellerApi } from '@/lib/traveller-api';
import type { APIResponse } from '@/types/api';
import type { PortalReview } from '@/types/portal';
import { StarRating } from '@/components/ui/star-rating';
import Link from 'next/link';
import { Star } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TravellerReviewsPage() {
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['portal-reviews'],
    queryFn: () => travellerApi.get<APIResponse<PortalReview[]>>('/portal/reviews'),
  });

  const reviews = reviewsData?.data ?? [];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 20 }}>
        My Reviews
      </h1>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13 }}>
          Loading reviews...
        </div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="crm-card" style={{ padding: 48, textAlign: 'center' }}>
          <Star size={32} style={{ color: 'var(--crm-text-3)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No reviews yet</div>
          <div style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>
            You can leave reviews after completing trips
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.map((review) => (
          <Link
            key={review.id}
            href={`/t/trips/${review.booking_id}`}
            className="crm-card"
            style={{ padding: '16px 20px', textDecoration: 'none', color: 'var(--crm-text)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{review.trip_name || 'Trip'}</div>
                <StarRating value={review.rating} readonly size={16} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--crm-text-4)' }}>
                {formatDate(review.created_at)}
              </span>
            </div>
            {review.title && (
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{review.title}</div>
            )}
            {review.body && (
              <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.5, margin: 0 }}>
                {review.body.length > 150 ? review.body.slice(0, 150) + '...' : review.body}
              </p>
            )}
            {review.operator_response && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--crm-bg-subtle)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, color: 'var(--crm-text-3)' }}>
                Operator responded
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
