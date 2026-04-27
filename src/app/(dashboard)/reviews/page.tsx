'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { StaffReview, ReviewStats } from '@/types/portal';
import { StarRating } from '@/components/ui/star-rating';
import { Star, MessageSquare, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface APIList<T> { data: T[]; meta: { page: number; per_page: number; total: number } }

export default function StaffReviewsPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['staff-reviews'],
    queryFn: () => api.get<APIList<StaffReview>>('/reviews?per_page=100'),
  });

  const { data: statsData } = useQuery({
    queryKey: ['review-stats'],
    queryFn: () => api.get<APIResponse<ReviewStats>>('/reviews/stats'),
  });

  const reviews = reviewsData?.data ?? [];
  const stats = statsData?.data ?? null;

  const respondMutation = useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
      api.put<APIResponse<StaffReview>>(`/reviews/${reviewId}/respond`, { operator_response: response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-reviews'] });
      setRespondingTo(null);
      setResponseText('');
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to submit response');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ reviewId, is_published }: { reviewId: string; is_published: boolean }) =>
      api.patch<APIResponse<StaffReview>>(`/reviews/${reviewId}/publish`, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to update review visibility');
    },
  });

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="crm-page-title">Reviews</h1>
          <div className="crm-dim" style={{ fontSize: 13 }}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="crm-card" style={{ padding: '16px 20px', flex: '0 0 auto', minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--crm-accent)' }}>
              {stats.average_rating.toFixed(1)}
            </div>
            <StarRating value={Math.round(stats.average_rating)} readonly size={14} />
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginTop: 4 }}>
              Average rating
            </div>
          </div>
          <div className="crm-card" style={{ padding: '16px 20px', flex: '0 0 auto', minWidth: 100, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--crm-text)' }}>
              {stats.total_count}
            </div>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginTop: 4 }}>
              Total reviews
            </div>
          </div>
          <div className="crm-card" style={{ padding: '16px 20px', flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase' }}>
              Rating distribution
            </div>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution[String(rating)] ?? 0;
              const pct = stats.total_count > 0 ? (count / stats.total_count) * 100 : 0;
              return (
                <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, width: 14, textAlign: 'right', color: 'var(--crm-text-3)' }}>{rating}</span>
                  <Star size={10} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                  <div style={{ flex: 1, height: 8, background: 'var(--crm-bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: rating >= 4 ? 'var(--crm-green)' : rating >= 3 ? 'var(--crm-amber)' : 'var(--crm-red)',
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--crm-text-4)', width: 24 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews list */}
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
            Reviews will appear here when travellers leave feedback
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reviews.map((review) => {
          const isExpanded = expandedId === review.id;
          const isResponding = respondingTo === review.id;

          return (
            <div key={review.id} className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Review header */}
              <div
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : review.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{review.traveller_name}</span>
                      <StarRating value={review.rating} readonly size={14} />
                      {!review.is_published && (
                        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'var(--crm-amber-bg)', color: 'var(--crm-amber)' }}>
                          Hidden
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>
                      {review.trip_name ?? 'Trip'} {review.departure_date ? `· ${formatDate(review.departure_date)}` : ''}
                    </div>
                    {review.title && (
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6 }}>{review.title}</div>
                    )}
                    {review.body && !isExpanded && (
                      <div style={{ fontSize: 13, color: 'var(--crm-text-2)', marginTop: 4 }}>
                        {review.body.length > 120 ? review.body.slice(0, 120) + '...' : review.body}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--crm-text-4)' }}>
                      {formatDate(review.created_at)}
                    </span>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--crm-text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--crm-text-3)' }} />}
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--crm-hairline)' }}>
                  {review.body && (
                    <p style={{ fontSize: 14, color: 'var(--crm-text-2)', lineHeight: 1.6, margin: '12px 0' }}>
                      {review.body}
                    </p>
                  )}

                  {/* Operator response */}
                  {review.operator_response && (
                    <div style={{ margin: '12px 0', padding: '12px 16px', background: 'var(--crm-bg-subtle)', borderRadius: 'var(--crm-radius-sm)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-3)', marginBottom: 4 }}>Your response</div>
                      <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.5, margin: 0 }}>
                        {review.operator_response}
                      </p>
                      {review.operator_responded_at && (
                        <div style={{ fontSize: 11, color: 'var(--crm-text-4)', marginTop: 4 }}>
                          Responded on {formatDate(review.operator_responded_at)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Respond form */}
                  {isResponding && (
                    <div style={{ margin: '12px 0' }}>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write your response..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid var(--crm-line)',
                          borderRadius: 'var(--crm-radius-sm)',
                          background: 'var(--crm-bg-elev)',
                          color: 'var(--crm-text)',
                          fontSize: 13,
                          fontFamily: 'var(--font-sans)',
                          outline: 'none',
                          resize: 'vertical',
                          marginBottom: 8,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="crm-btn primary sm"
                          disabled={!responseText.trim() || respondMutation.isPending}
                          onClick={() => respondMutation.mutate({ reviewId: review.id, response: responseText })}
                        >
                          {respondMutation.isPending ? 'Sending...' : 'Submit response'}
                        </button>
                        <button className="crm-btn sm" onClick={() => { setRespondingTo(null); setResponseText(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {!isResponding && (
                      <button
                        className="crm-btn sm"
                        style={{ gap: 4 }}
                        onClick={() => {
                          setRespondingTo(review.id);
                          setResponseText(review.operator_response ?? '');
                        }}
                      >
                        <MessageSquare size={13} />
                        {review.operator_response ? 'Edit response' : 'Respond'}
                      </button>
                    )}
                    <button
                      className="crm-btn sm"
                      style={{ gap: 4 }}
                      onClick={() => togglePublishMutation.mutate({ reviewId: review.id, is_published: !review.is_published })}
                      disabled={togglePublishMutation.isPending}
                    >
                      {review.is_published ? (
                        <><EyeOff size={13} /> Hide</>
                      ) : (
                        <><Eye size={13} /> Show</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
