'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { travellerApi } from '@/lib/traveller-api';
import type { APIResponse } from '@/types/api';
import type { PortalTripDetail, PortalReview, ReviewFormData } from '@/types/portal';
import { StarRating } from '@/components/ui/star-rating';
import { MapPin, Calendar, Clock, Utensils, Bus, Hotel, Phone, Upload, ChevronLeft, Camera } from 'lucide-react';
import Link from 'next/link';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t?: string) {
  if (!t) return '';
  return t;
}

const TABS = ['Itinerary', 'Documents', 'Co-Travellers', 'Review'] as const;
type Tab = typeof TABS[number];

const DOC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  verified: { bg: 'var(--crm-green-bg)', text: 'var(--crm-green)' },
  pending: { bg: 'var(--crm-amber-bg)', text: 'var(--crm-amber)' },
  uploaded: { bg: 'var(--crm-accent-bg)', text: 'var(--crm-accent)' },
  rejected: { bg: 'var(--crm-red-bg)', text: 'var(--crm-red)' },
  expired: { bg: 'var(--crm-red-bg)', text: 'var(--crm-red)' },
};

export default function TripDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Itinerary');
  const [reviewForm, setReviewForm] = useState<ReviewFormData>({ rating: 0 });
  const [reviewError, setReviewError] = useState('');

  const { data: tripData, isLoading } = useQuery({
    queryKey: ['portal-trip', bookingId],
    queryFn: () => travellerApi.get<APIResponse<PortalTripDetail>>(`/portal/trips/${bookingId}`),
  });

  const trip = tripData?.data ?? null;

  const createReviewMutation = useMutation({
    mutationFn: (body: ReviewFormData) =>
      travellerApi.post<APIResponse<PortalReview>>(`/portal/trips/${bookingId}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-trip', bookingId] });
      setReviewError('');
    },
    onError: (err: Error) => setReviewError(err.message),
  });

  const updateReviewMutation = useMutation({
    mutationFn: (body: ReviewFormData) =>
      travellerApi.put<APIResponse<PortalReview>>(`/portal/trips/${bookingId}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-trip', bookingId] });
      setReviewError('');
    },
    onError: (err: Error) => setReviewError(err.message),
  });

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13 }}>
        Loading trip details...
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Trip not found</div>
        <Link href="/t/trips" style={{ color: 'var(--crm-accent)', fontSize: 14, textDecoration: 'none' }}>
          Back to my trips
        </Link>
      </div>
    );
  }

  const tripEndDate = new Date(trip.end_date);
  const isTripCompleted = tripEndDate <= new Date();
  const existingReview = trip.review;
  const canEditReview = existingReview && (Date.now() - new Date(existingReview.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;

  return (
    <div style={{ padding: '16px 16px', maxWidth: 800, margin: '0 auto' }}>
      {/* Back link */}
      <Link
        href="/t/trips"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          color: 'var(--crm-accent)',
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        <ChevronLeft size={16} />
        My trips
      </Link>

      {/* Trip header */}
      <div className="crm-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{trip.trip_name}</h1>
        {trip.destination && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--crm-text-3)', marginBottom: 4 }}>
            <MapPin size={14} />
            {trip.destination}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--crm-text-3)', marginBottom: 8 }}>
          <Calendar size={14} />
          {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
        </div>
        {trip.operator_name && (
          <div style={{ fontSize: 13, color: 'var(--crm-text-4)' }}>
            Operated by <strong style={{ color: 'var(--crm-text-2)' }}>{trip.operator_name}</strong>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--crm-line)',
          marginBottom: 20,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--crm-accent)' : 'var(--crm-text-3)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--crm-accent)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Itinerary Tab */}
      {activeTab === 'Itinerary' && (
        <div>
          {(!trip.itinerary || trip.itinerary.length === 0) ? (
            <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
              Itinerary not available yet
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: 'var(--crm-line)',
                }}
              />

              {trip.itinerary
                .sort((a, b) => a.day_number - b.day_number)
                .map((day) => (
                  <div key={day.id} style={{ position: 'relative', marginBottom: 20 }}>
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -20,
                        top: 10,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: 'var(--crm-accent)',
                        border: '2px solid var(--crm-bg)',
                      }}
                    />

                    <div className="crm-card" style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: 'var(--crm-accent-bg)',
                            color: 'var(--crm-accent)',
                          }}
                        >
                          Day {day.day_number}
                        </span>
                        {day.title && (
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{day.title}</span>
                        )}
                      </div>

                      {day.traveller_notes && (
                        <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.5, marginBottom: 12 }}>
                          {day.traveller_notes}
                        </p>
                      )}

                      {/* Locations */}
                      {day.locations && day.locations.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {day.locations.sort((a, b) => a.sort_order - b.sort_order).map((loc) => (
                            <span
                              key={loc.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 12,
                                background: 'var(--crm-bg-subtle)',
                                color: 'var(--crm-text-2)',
                              }}
                            >
                              <MapPin size={11} />
                              {loc.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Activities */}
                      {day.activities && day.activities.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {day.activities.sort((a, b) => a.sort_order - b.sort_order).map((act) => (
                            <div
                              key={act.id}
                              style={{
                                padding: '6px 0',
                                borderTop: '1px solid var(--crm-hairline)',
                                display: 'flex',
                                gap: 10,
                                alignItems: 'flex-start',
                              }}
                            >
                              <div style={{ minWidth: 60, fontSize: 12, color: 'var(--crm-text-3)', paddingTop: 2 }}>
                                {formatTime(act.start_time) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Clock size={10} />
                                    {formatTime(act.start_time)}
                                  </div>
                                )}
                                {act.duration_minutes && (
                                  <div style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>
                                    {act.duration_minutes}min
                                  </div>
                                )}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>
                                  {act.description || act.type || 'Activity'}
                                  {act.is_optional && (
                                    <span style={{ fontSize: 10, color: 'var(--crm-text-4)', marginLeft: 6 }}>(optional)</span>
                                  )}
                                </div>
                                {act.location_name && (
                                  <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>{act.location_name}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Meals */}
                      {day.meals && day.meals.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                          {day.meals.map((meal) => (
                            <div
                              key={meal.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                background: meal.is_included ? 'var(--crm-green-bg)' : 'var(--crm-bg-subtle)',
                                color: meal.is_included ? 'var(--crm-green)' : 'var(--crm-text-3)',
                              }}
                            >
                              <Utensils size={11} />
                              <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{meal.meal_type}</span>
                              {meal.restaurant_name && <span>@ {meal.restaurant_name}</span>}
                              {!meal.is_included && <span style={{ fontSize: 10 }}>(own)</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Transport */}
                      {day.transport && day.transport.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {day.transport.map((tr) => (
                            <div
                              key={tr.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: 'var(--crm-text-3)',
                                padding: '4px 0',
                              }}
                            >
                              <Bus size={12} />
                              <span style={{ textTransform: 'capitalize' }}>{tr.mode || 'Transport'}</span>
                              {tr.from_location && tr.to_location && (
                                <span>{tr.from_location} → {tr.to_location}</span>
                              )}
                              {tr.duration_minutes && (
                                <span style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>({tr.duration_minutes}min)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Accommodation */}
                      {day.accommodation && day.accommodation.length > 0 && (
                        <div>
                          {day.accommodation.map((acc) => (
                            <div
                              key={acc.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: 'var(--crm-text-2)',
                                padding: '4px 0',
                              }}
                            >
                              <Hotel size={12} />
                              <span style={{ fontWeight: 500 }}>{acc.property_name || 'Accommodation'}</span>
                              {acc.room_type && <span style={{ color: 'var(--crm-text-3)' }}>({acc.room_type})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'Documents' && (
        <div>
          {(!trip.documents || trip.documents.length === 0) ? (
            <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
              No documents for this trip
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trip.documents.map((doc) => {
                const statusStyle = DOC_STATUS_COLORS[doc.status] ?? { bg: 'var(--crm-bg-active)', text: 'var(--crm-text-3)' };
                return (
                  <div key={doc.id} className="crm-card" style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.label}</div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 600,
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          textTransform: 'capitalize',
                        }}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--crm-text-3)', textTransform: 'capitalize' }}>
                      {doc.document_type.replace(/_/g, ' ')}
                      {doc.is_booking_doc && ' (trip document)'}
                    </div>
                    {doc.expiry_date && (
                      <div style={{ fontSize: 11, color: new Date(doc.expiry_date) <= new Date() ? 'var(--crm-red)' : 'var(--crm-text-4)', marginTop: 4 }}>
                        Expires: {formatDate(doc.expiry_date)}
                      </div>
                    )}
                    {doc.rejection_reason && (
                      <div style={{ fontSize: 12, color: 'var(--crm-red)', marginTop: 4 }}>
                        Reason: {doc.rejection_reason}
                      </div>
                    )}
                    {doc.file_url ? (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--crm-accent)', marginTop: 6, display: 'inline-block' }}>
                        View document
                      </a>
                    ) : (
                      <button
                        className="crm-btn sm"
                        style={{ marginTop: 8, gap: 4, fontSize: 12 }}
                        onClick={() => {
                          // Trigger file upload
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,.pdf';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              await travellerApi.upload(`/portal/documents/${doc.id}/upload`, formData);
                              queryClient.invalidateQueries({ queryKey: ['portal-trip', bookingId] });
                            } catch {
                              // Handle silently
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload size={12} />
                        Upload
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Co-Travellers Tab */}
      {activeTab === 'Co-Travellers' && (
        <div>
          {(!trip.co_travellers || trip.co_travellers.length === 0) ? (
            <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
              No co-travellers for this trip
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trip.co_travellers.map((ct) => (
                <div key={ct.id} className="crm-card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{ct.name}</div>
                  {ct.phone && (
                    <a
                      href={`tel:${ct.phone}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--crm-accent)', textDecoration: 'none' }}
                    >
                      <Phone size={13} />
                      {ct.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'Review' && (
        <div>
          {!isTripCompleted ? (
            <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>You can review after your trip ends</div>
              <div style={{ fontSize: 13 }}>Trip ends on {formatDate(trip.end_date)}</div>
            </div>
          ) : existingReview && !canEditReview ? (
            /* Show existing review (read-only, past 30 day edit window) */
            <div className="crm-card" style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: 12 }}>
                <StarRating value={existingReview.rating} readonly size={24} />
              </div>
              {existingReview.title && (
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{existingReview.title}</h3>
              )}
              {existingReview.body && (
                <p style={{ fontSize: 14, color: 'var(--crm-text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                  {existingReview.body}
                </p>
              )}
              <div style={{ fontSize: 12, color: 'var(--crm-text-4)' }}>
                Reviewed on {formatDate(existingReview.created_at)}
              </div>
              {existingReview.operator_response && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--crm-bg-subtle)', borderRadius: 'var(--crm-radius-sm)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-3)', marginBottom: 4 }}>Operator response</div>
                  <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.5 }}>
                    {existingReview.operator_response}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Review form (create or edit) */
            <div className="crm-card" style={{ padding: '20px 24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                {existingReview ? 'Edit your review' : 'Leave a review'}
              </h3>

              {reviewError && (
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--crm-red)',
                    background: 'var(--crm-red-bg)',
                    borderRadius: 'var(--crm-radius-sm)',
                    marginBottom: 16,
                  }}
                >
                  {reviewError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)', display: 'block', marginBottom: 8 }}>
                  Rating *
                </label>
                <StarRating
                  value={reviewForm.rating || existingReview?.rating || 0}
                  onChange={(val) => setReviewForm((f) => ({ ...f, rating: val }))}
                  size={32}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)', display: 'block', marginBottom: 6 }}>
                  Title
                </label>
                <input
                  type="text"
                  defaultValue={existingReview?.title ?? ''}
                  onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Summarize your experience"
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    border: '1px solid var(--crm-line)',
                    borderRadius: 'var(--crm-radius-sm)',
                    background: 'var(--crm-bg-elev)',
                    color: 'var(--crm-text)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)', display: 'block', marginBottom: 6 }}>
                  Your review
                </label>
                <textarea
                  defaultValue={existingReview?.body ?? ''}
                  onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Tell us about your experience..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--crm-line)',
                    borderRadius: 'var(--crm-radius-sm)',
                    background: 'var(--crm-bg-elev)',
                    color: 'var(--crm-text)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)', display: 'block', marginBottom: 6 }}>
                  Photos (optional)
                </label>
                <button
                  className="crm-btn sm"
                  disabled
                  style={{ gap: 4, opacity: 0.5, cursor: 'not-allowed' }}
                >
                  <Camera size={14} />
                  Photos coming soon
                </button>
              </div>

              <button
                className="crm-btn primary"
                disabled={createReviewMutation.isPending || updateReviewMutation.isPending || (reviewForm.rating === 0 && !existingReview)}
                onClick={() => {
                  const data: ReviewFormData = {
                    rating: reviewForm.rating || existingReview?.rating || 0,
                    title: reviewForm.title ?? existingReview?.title,
                    body: reviewForm.body ?? existingReview?.body,
                    photos: reviewForm.photos ?? existingReview?.photos,
                  };
                  if (existingReview) {
                    updateReviewMutation.mutate(data);
                  } else {
                    createReviewMutation.mutate(data);
                  }
                }}
                style={{ height: 40, justifyContent: 'center', fontSize: 14 }}
              >
                {(createReviewMutation.isPending || updateReviewMutation.isPending)
                  ? 'Submitting...'
                  : existingReview ? 'Update review' : 'Submit review'
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
