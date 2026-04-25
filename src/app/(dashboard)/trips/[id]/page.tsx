'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { thumbUrl } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { TripMaster } from '@/types/trip';
import type { Departure } from '@/types/departure';
import type {
  ItineraryDay,
  ItineraryActivity,
  ItineraryMeal,
  ItineraryLocation,
  ItineraryTransport,
  ItineraryAccommodation,
} from '@/types/itinerary';
import { MultiUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Copy,
  Trash2,
  Edit2,
  Plus,
  ChevronDown,
  ChevronRight,
  Utensils,
  Bus,
  Bed,
  Activity,
  Navigation,
  Calendar,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────── */

function statusPillColor(status: string) {
  switch (status.toLowerCase()) {
    case 'published': return 'green';
    case 'draft': return 'amber';
    case 'archived': return 'red';
    default: return '';
  }
}

function formatPrice(cents?: number, currency?: string) {
  if (!cents) return '--';
  const amount = cents / 100;
  const curr = currency || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${curr} ${amount.toLocaleString()}`;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Tabs ────────────────────────────────────── */

const tabs = ['Overview', 'Departures', 'Itinerary', 'Inclusions', 'Gallery', 'Packing', 'Settings'] as const;

/* ─── Sub-components ──────────────────────────── */

function KVItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="crm-caption" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

/* ─── Edit Trip Dialog ────────────────────────── */

function EditTripDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: TripMaster;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: trip.name,
    short_description: trip.short_description || '',
    long_description: trip.long_description || '',
    duration_days: trip.duration_days?.toString() || '',
    duration_nights: trip.duration_nights?.toString() || '',
    base_price_cents: trip.base_price_cents?.toString() || '',
    difficulty_level: trip.difficulty_level?.toString() || '',
    destinations: (trip.destinations || []).join(', '),
    tags: (trip.tags || []).join(', '),
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put<APIResponse<TripMaster>>(`/trips/${trip.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', trip.id] });
      onOpenChange(false);
    },
  });

  function handleSave() {
    const body: Record<string, unknown> = { name: form.name.trim() };
    if (form.short_description) body.short_description = form.short_description;
    if (form.long_description) body.long_description = form.long_description;
    if (form.duration_days) body.duration_days = Number(form.duration_days);
    if (form.duration_nights) body.duration_nights = Number(form.duration_nights);
    if (form.base_price_cents) body.base_price_cents = Number(form.base_price_cents);
    if (form.difficulty_level) body.difficulty_level = Number(form.difficulty_level);
    if (form.destinations) body.destinations = form.destinations.split(',').map(s => s.trim()).filter(Boolean);
    if (form.tags) body.tags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
    mutation.mutate(body);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
          <DialogDescription>Update trip details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Short Description</Label>
            <Input value={form.short_description} onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Long Description</Label>
            <Input value={form.long_description} onChange={e => setForm(p => ({ ...p, long_description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Duration (days)</Label>
              <Input type="number" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Duration (nights)</Label>
              <Input type="number" value={form.duration_nights} onChange={e => setForm(p => ({ ...p, duration_nights: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Base Price (cents)</Label>
              <Input type="number" value={form.base_price_cents} onChange={e => setForm(p => ({ ...p, base_price_cents: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Difficulty (1-5)</Label>
              <Input type="number" min="1" max="5" value={form.difficulty_level} onChange={e => setForm(p => ({ ...p, difficulty_level: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Destinations (comma-separated)</Label>
            <Input value={form.destinations} onChange={e => setForm(p => ({ ...p, destinations: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <button className="crm-btn primary" onClick={handleSave} disabled={mutation.isPending || !form.name.trim()}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Itinerary Tab ───────────────────────────── */

function ItineraryTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [dayForm, setDayForm] = useState({ day_number: '', title: '' });

  // Sub-resource inline forms
  const [addingActivity, setAddingActivity] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({ type: 'sightseeing', description: '', duration_minutes: '', sort_order: '0' });
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [mealForm, setMealForm] = useState({ meal_type: 'breakfast', is_included: true, location: '', notes: '' });
  const [addingLocation, setAddingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', latitude: '', longitude: '', sort_order: '0' });
  const [addingTransport, setAddingTransport] = useState<string | null>(null);
  const [transportForm, setTransportForm] = useState({ mode: 'car', distance_km: '', duration_minutes: '', vendor_notes: '' });
  const [addingAccommodation, setAddingAccommodation] = useState<string | null>(null);
  const [accommodationForm, setAccommodationForm] = useState({ property_name: '', room_type: '', internal_notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['itinerary', tripId],
    queryFn: () => api.get<APIResponse<ItineraryDay[]>>(`/trips/${tripId}/itinerary`),
  });

  const days = (data?.data ?? []).sort((a, b) => a.day_number - b.day_number);

  const addDayMutation = useMutation({
    mutationFn: (body: { day_number: number; title?: string }) =>
      api.post<APIResponse<ItineraryDay>>(`/trips/${tripId}/itinerary`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setAddDayOpen(false);
      setDayForm({ day_number: '', title: '' });
    },
  });

  const deleteDayMutation = useMutation({
    mutationFn: (dayId: string) => api.delete(`/itinerary-days/${dayId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] }),
  });

  // Sub-resource mutations
  const addActivityMutation = useMutation({
    mutationFn: ({ dayId, body }: { dayId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<ItineraryActivity>>(`/itinerary-days/${dayId}/activities`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setAddingActivity(null);
      setActivityForm({ type: 'sightseeing', description: '', duration_minutes: '', sort_order: '0' });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: ({ dayId, actId }: { dayId: string; actId: string }) =>
      api.delete(`/itinerary-days/${dayId}/activities/${actId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] }),
  });

  const addMealMutation = useMutation({
    mutationFn: ({ dayId, body }: { dayId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<ItineraryMeal>>(`/itinerary-days/${dayId}/meals`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setAddingMeal(null);
      setMealForm({ meal_type: 'breakfast', is_included: true, location: '', notes: '' });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: ({ dayId, mealId }: { dayId: string; mealId: string }) =>
      api.delete(`/itinerary-days/${dayId}/meals/${mealId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] }),
  });

  const addLocationMutation = useMutation({
    mutationFn: ({ dayId, body }: { dayId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<ItineraryLocation>>(`/itinerary-days/${dayId}/locations`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setAddingLocation(null);
      setLocationForm({ name: '', latitude: '', longitude: '', sort_order: '0' });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: ({ dayId, locId }: { dayId: string; locId: string }) =>
      api.delete(`/itinerary-days/${dayId}/locations/${locId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] }),
  });

  const addTransportMutation = useMutation({
    mutationFn: ({ dayId, body }: { dayId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<ItineraryTransport>>(`/itinerary-days/${dayId}/transport`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setAddingTransport(null);
      setTransportForm({ mode: 'car', distance_km: '', duration_minutes: '', vendor_notes: '' });
    },
  });

  const deleteTransportMutation = useMutation({
    mutationFn: ({ dayId, tId }: { dayId: string; tId: string }) =>
      api.delete(`/itinerary-days/${dayId}/transport/${tId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] }),
  });

  const addAccommodationMutation = useMutation({
    mutationFn: ({ dayId, body }: { dayId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<ItineraryAccommodation>>(`/itinerary-days/${dayId}/accommodation`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setAddingAccommodation(null);
      setAccommodationForm({ property_name: '', room_type: '', internal_notes: '' });
    },
  });

  const deleteAccommodationMutation = useMutation({
    mutationFn: ({ dayId, accId }: { dayId: string; accId: string }) =>
      api.delete(`/itinerary-days/${dayId}/accommodation/${accId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] }),
  });

  function toggleDay(dayId: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading itinerary...</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add Day button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
          <DialogTrigger
            render={
              <button className="crm-btn primary">
                <Plus size={14} />
                Add Day
              </button>
            }
          />
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Itinerary Day</DialogTitle>
              <DialogDescription>Add a new day to the trip template.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Day Number *</Label>
                <Input
                  type="number"
                  value={dayForm.day_number}
                  onChange={e => setDayForm(p => ({ ...p, day_number: e.target.value }))}
                  placeholder={String(days.length + 1)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={dayForm.title}
                  onChange={e => setDayForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Arrival in Florence"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                className="crm-btn primary"
                onClick={() => {
                  if (!dayForm.day_number) return;
                  const body: { day_number: number; title?: string } = { day_number: Number(dayForm.day_number) };
                  if (dayForm.title) body.title = dayForm.title;
                  addDayMutation.mutate(body);
                }}
                disabled={addDayMutation.isPending || !dayForm.day_number}
              >
                {addDayMutation.isPending ? 'Adding...' : 'Add Day'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {days.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Calendar size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
          <div className="crm-caption">No itinerary days yet</div>
        </div>
      ) : (
        days.map(day => {
          const isExpanded = expandedDays.has(day.id);
          const actCount = (day.activities?.length || 0) + (day.meals?.length || 0) + (day.locations?.length || 0) + (day.transport?.length || 0) + (day.accommodation?.length || 0);

          return (
            <div key={day.id} className="crm-card">
              {/* Day header */}
              <div
                className="crm-card-pad"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => toggleDay(day.id)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Day {day.day_number}</span>
                  {day.title && <span className="crm-dim" style={{ marginLeft: 8, fontSize: 13 }}>{day.title}</span>}
                </div>
                {day.altitude_meters && (
                  <span className="crm-caption">{day.altitude_meters}m</span>
                )}
                <span className="crm-caption">{actCount} items</span>
                <button
                  className="crm-btn ghost sm"
                  style={{ padding: '0 6px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete Day ${day.day_number}?`)) {
                      deleteDayMutation.mutate(day.id);
                    }
                  }}
                >
                  <Trash2 size={14} style={{ color: 'var(--crm-red)' }} />
                </button>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--crm-hairline)', padding: '16px 20px' }}>
                  {day.internal_notes && (
                    <div style={{ fontSize: 12, color: 'var(--crm-text-3)', marginBottom: 12, fontStyle: 'italic' }}>
                      Internal: {day.internal_notes}
                    </div>
                  )}
                  {day.traveller_notes && (
                    <div style={{ fontSize: 13, color: 'var(--crm-text-2)', marginBottom: 12 }}>
                      {day.traveller_notes}
                    </div>
                  )}

                  {/* ── Locations ── */}
                  <SectionBlock
                    icon={<Navigation size={13} />}
                    title="Locations"
                    items={day.locations || []}
                    renderItem={(loc: ItineraryLocation) => (
                      <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ fontSize: 13 }}>{loc.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {loc.latitude && loc.longitude && (
                            <span className="crm-caption">{loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}</span>
                          )}
                          <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteLocationMutation.mutate({ dayId: day.id, locId: loc.id })}>
                            <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                          </button>
                        </div>
                      </div>
                    )}
                    isAdding={addingLocation === day.id}
                    onToggleAdd={() => setAddingLocation(addingLocation === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                        <div className="grid gap-1" style={{ flex: 1, minWidth: 120 }}>
                          <Label style={{ fontSize: 11 }}>Name *</Label>
                          <Input value={locationForm.name} onChange={e => setLocationForm(p => ({ ...p, name: e.target.value }))} placeholder="Location name" style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <div className="grid gap-1" style={{ width: 70 }}>
                          <Label style={{ fontSize: 11 }}>Order</Label>
                          <Input type="number" value={locationForm.sort_order} onChange={e => setLocationForm(p => ({ ...p, sort_order: e.target.value }))} style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <button
                          className="crm-btn primary sm"
                          disabled={addLocationMutation.isPending || !locationForm.name.trim()}
                          onClick={() => {
                            addLocationMutation.mutate({
                              dayId: day.id,
                              body: { name: locationForm.name.trim(), sort_order: Number(locationForm.sort_order) || 0 },
                            });
                          }}
                        >
                          {addLocationMutation.isPending ? '...' : 'Add'}
                        </button>
                      </div>
                    }
                  />

                  {/* ── Activities ── */}
                  <SectionBlock
                    icon={<Activity size={13} />}
                    title="Activities"
                    items={day.activities || []}
                    renderItem={(act: ItineraryActivity) => (
                      <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div>
                          {act.type && <span className="crm-pill" style={{ marginRight: 6 }}>{act.type}</span>}
                          <span style={{ fontSize: 13 }}>{act.description || '(no description)'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {act.duration_minutes && <span className="crm-caption">{act.duration_minutes} min</span>}
                          <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteActivityMutation.mutate({ dayId: day.id, actId: act.id })}>
                            <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                          </button>
                        </div>
                      </div>
                    )}
                    isAdding={addingActivity === day.id}
                    onToggleAdd={() => setAddingActivity(addingActivity === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                        <div className="grid gap-1" style={{ width: 110 }}>
                          <Label style={{ fontSize: 11 }}>Type</Label>
                          <select
                            value={activityForm.type}
                            onChange={e => setActivityForm(p => ({ ...p, type: e.target.value }))}
                            style={{ height: 32, fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', padding: '0 6px', background: 'var(--crm-bg)' }}
                          >
                            {['sightseeing', 'trekking', 'cultural', 'adventure', 'leisure'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1" style={{ flex: 1, minWidth: 120 }}>
                          <Label style={{ fontSize: 11 }}>Description</Label>
                          <Input value={activityForm.description} onChange={e => setActivityForm(p => ({ ...p, description: e.target.value }))} placeholder="Activity description" style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <div className="grid gap-1" style={{ width: 70 }}>
                          <Label style={{ fontSize: 11 }}>Min</Label>
                          <Input type="number" value={activityForm.duration_minutes} onChange={e => setActivityForm(p => ({ ...p, duration_minutes: e.target.value }))} style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <button
                          className="crm-btn primary sm"
                          disabled={addActivityMutation.isPending}
                          onClick={() => {
                            const body: Record<string, unknown> = { sort_order: Number(activityForm.sort_order) || 0 };
                            if (activityForm.type) body.type = activityForm.type;
                            if (activityForm.description) body.description = activityForm.description;
                            if (activityForm.duration_minutes) body.duration_minutes = Number(activityForm.duration_minutes);
                            addActivityMutation.mutate({ dayId: day.id, body });
                          }}
                        >
                          {addActivityMutation.isPending ? '...' : 'Add'}
                        </button>
                      </div>
                    }
                  />

                  {/* ── Meals ── */}
                  <SectionBlock
                    icon={<Utensils size={13} />}
                    title="Meals"
                    items={day.meals || []}
                    renderItem={(meal: ItineraryMeal) => (
                      <div key={meal.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div>
                          <span className={`crm-pill ${meal.is_included ? 'green' : ''}`} style={{ marginRight: 6 }}>
                            {meal.meal_type}
                          </span>
                          <span style={{ fontSize: 13 }}>
                            {meal.is_included ? 'Included' : 'Not included'}
                            {meal.location ? ` @ ${meal.location}` : ''}
                          </span>
                        </div>
                        <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteMealMutation.mutate({ dayId: day.id, mealId: meal.id })}>
                          <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                        </button>
                      </div>
                    )}
                    isAdding={addingMeal === day.id}
                    onToggleAdd={() => setAddingMeal(addingMeal === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                        <div className="grid gap-1" style={{ width: 100 }}>
                          <Label style={{ fontSize: 11 }}>Type *</Label>
                          <select
                            value={mealForm.meal_type}
                            onChange={e => setMealForm(p => ({ ...p, meal_type: e.target.value }))}
                            style={{ height: 32, fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', padding: '0 6px', background: 'var(--crm-bg)' }}
                          >
                            {['breakfast', 'lunch', 'dinner'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1" style={{ width: 90 }}>
                          <Label style={{ fontSize: 11 }}>Included</Label>
                          <select
                            value={mealForm.is_included ? 'yes' : 'no'}
                            onChange={e => setMealForm(p => ({ ...p, is_included: e.target.value === 'yes' }))}
                            style={{ height: 32, fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', padding: '0 6px', background: 'var(--crm-bg)' }}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <div className="grid gap-1" style={{ flex: 1, minWidth: 100 }}>
                          <Label style={{ fontSize: 11 }}>Location</Label>
                          <Input value={mealForm.location} onChange={e => setMealForm(p => ({ ...p, location: e.target.value }))} style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <button
                          className="crm-btn primary sm"
                          disabled={addMealMutation.isPending}
                          onClick={() => {
                            const body: Record<string, unknown> = { meal_type: mealForm.meal_type, is_included: mealForm.is_included };
                            if (mealForm.location) body.location = mealForm.location;
                            if (mealForm.notes) body.notes = mealForm.notes;
                            addMealMutation.mutate({ dayId: day.id, body });
                          }}
                        >
                          {addMealMutation.isPending ? '...' : 'Add'}
                        </button>
                      </div>
                    }
                  />

                  {/* ── Transport ── */}
                  <SectionBlock
                    icon={<Bus size={13} />}
                    title="Transport"
                    items={day.transport || []}
                    renderItem={(t: ItineraryTransport) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div>
                          {t.mode && <span className="crm-pill" style={{ marginRight: 6 }}>{t.mode}</span>}
                          <span style={{ fontSize: 13 }}>
                            {t.distance_km ? `${t.distance_km} km` : ''}
                            {t.distance_km && t.duration_minutes ? ' / ' : ''}
                            {t.duration_minutes ? `${t.duration_minutes} min` : ''}
                          </span>
                        </div>
                        <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteTransportMutation.mutate({ dayId: day.id, tId: t.id })}>
                          <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                        </button>
                      </div>
                    )}
                    isAdding={addingTransport === day.id}
                    onToggleAdd={() => setAddingTransport(addingTransport === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                        <div className="grid gap-1" style={{ width: 100 }}>
                          <Label style={{ fontSize: 11 }}>Mode</Label>
                          <select
                            value={transportForm.mode}
                            onChange={e => setTransportForm(p => ({ ...p, mode: e.target.value }))}
                            style={{ height: 32, fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', padding: '0 6px', background: 'var(--crm-bg)' }}
                          >
                            {['car', 'bus', 'flight', 'train', 'ferry', 'walk'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1" style={{ width: 80 }}>
                          <Label style={{ fontSize: 11 }}>Dist (km)</Label>
                          <Input type="number" value={transportForm.distance_km} onChange={e => setTransportForm(p => ({ ...p, distance_km: e.target.value }))} style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <div className="grid gap-1" style={{ width: 80 }}>
                          <Label style={{ fontSize: 11 }}>Time (min)</Label>
                          <Input type="number" value={transportForm.duration_minutes} onChange={e => setTransportForm(p => ({ ...p, duration_minutes: e.target.value }))} style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <button
                          className="crm-btn primary sm"
                          disabled={addTransportMutation.isPending}
                          onClick={() => {
                            const body: Record<string, unknown> = {};
                            if (transportForm.mode) body.mode = transportForm.mode;
                            if (transportForm.distance_km) body.distance_km = Number(transportForm.distance_km);
                            if (transportForm.duration_minutes) body.duration_minutes = Number(transportForm.duration_minutes);
                            if (transportForm.vendor_notes) body.vendor_notes = transportForm.vendor_notes;
                            addTransportMutation.mutate({ dayId: day.id, body });
                          }}
                        >
                          {addTransportMutation.isPending ? '...' : 'Add'}
                        </button>
                      </div>
                    }
                  />

                  {/* ── Accommodation ── */}
                  <SectionBlock
                    icon={<Bed size={13} />}
                    title="Accommodation"
                    items={day.accommodation || []}
                    renderItem={(acc: ItineraryAccommodation) => (
                      <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{acc.property_name || '(unnamed)'}</span>
                          {acc.room_type && <span className="crm-dim" style={{ marginLeft: 8, fontSize: 12 }}>{acc.room_type}</span>}
                        </div>
                        <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteAccommodationMutation.mutate({ dayId: day.id, accId: acc.id })}>
                          <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                        </button>
                      </div>
                    )}
                    isAdding={addingAccommodation === day.id}
                    onToggleAdd={() => setAddingAccommodation(addingAccommodation === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                        <div className="grid gap-1" style={{ flex: 1, minWidth: 120 }}>
                          <Label style={{ fontSize: 11 }}>Property</Label>
                          <Input value={accommodationForm.property_name} onChange={e => setAccommodationForm(p => ({ ...p, property_name: e.target.value }))} placeholder="Hotel name" style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <div className="grid gap-1" style={{ width: 100 }}>
                          <Label style={{ fontSize: 11 }}>Room Type</Label>
                          <Input value={accommodationForm.room_type} onChange={e => setAccommodationForm(p => ({ ...p, room_type: e.target.value }))} style={{ height: 32, fontSize: 12 }} />
                        </div>
                        <button
                          className="crm-btn primary sm"
                          disabled={addAccommodationMutation.isPending}
                          onClick={() => {
                            const body: Record<string, unknown> = {};
                            if (accommodationForm.property_name) body.property_name = accommodationForm.property_name;
                            if (accommodationForm.room_type) body.room_type = accommodationForm.room_type;
                            if (accommodationForm.internal_notes) body.internal_notes = accommodationForm.internal_notes;
                            addAccommodationMutation.mutate({ dayId: day.id, body });
                          }}
                        >
                          {addAccommodationMutation.isPending ? '...' : 'Add'}
                        </button>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Section block (reusable for itinerary sub-resources) ── */

function SectionBlock<T>({
  icon,
  title,
  items,
  renderItem,
  isAdding,
  onToggleAdd,
  addForm,
}: {
  icon: React.ReactNode;
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  isAdding: boolean;
  onToggleAdd: () => void;
  addForm: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon}
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--crm-text-3)' }}>
            {title} ({items.length})
          </span>
        </div>
        <button className="crm-btn ghost sm" onClick={onToggleAdd} style={{ fontSize: 11 }}>
          <Plus size={12} /> Add
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ paddingLeft: 20 }}>
          {items.map(renderItem)}
        </div>
      )}
      {isAdding && (
        <div style={{ paddingLeft: 20, marginTop: 8, padding: '10px 12px', background: 'var(--crm-bg-hover)', borderRadius: 8 }}>
          {addForm}
        </div>
      )}
    </div>
  );
}

/* ─── Departures Tab ──────────────────────────── */

function DeparturesTab({ tripId }: { tripId: string }) {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['departures', 'trip', tripId],
    queryFn: () => api.get<APIResponse<Departure[]>>(`/departures?trip_master_id=${tripId}`),
  });

  const departures = data?.data ?? [];

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading departures...</span></div>;
  }

  if (departures.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Calendar size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
        <div className="crm-caption">No departures for this trip</div>
        <div className="crm-dim" style={{ fontSize: 12, marginTop: 4 }}>Create departures from the Departures page</div>
      </div>
    );
  }

  return (
    <div className="crm-card">
      <div className="crm-row hd" style={{ gridTemplateColumns: '2fr 1fr 1fr 80px 80px 80px 1fr' }}>
        <span>Dates</span>
        <span>Status</span>
        <span>Pickup / Drop</span>
        <span>Capacity</span>
        <span>Confirmed</span>
        <span>Waitlist</span>
        <span>Price</span>
      </div>
      {departures.map(dep => (
        <div
          key={dep.id}
          className="crm-row"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 80px 80px 80px 1fr', cursor: 'pointer' }}
          onClick={() => router.push(`/departures/${dep.id}`)}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {formatDate(dep.start_date)} - {formatDate(dep.end_date)}
          </span>
          <span>
            <span className={`crm-pill ${dep.status === 'published' ? 'green' : dep.status === 'draft' ? 'amber' : ''}`}>
              {dep.status}
            </span>
          </span>
          <span style={{ fontSize: 13 }}>
            {dep.pickup_city || '--'} / {dep.drop_city || '--'}
          </span>
          <span className="crm-tabular" style={{ fontSize: 13 }}>{dep.capacity}</span>
          <span className="crm-tabular" style={{ fontSize: 13 }}>{dep.confirmed_count}</span>
          <span className="crm-tabular" style={{ fontSize: 13 }}>{dep.waitlist_count}</span>
          <span style={{ fontSize: 13 }}>
            {formatPrice(dep.pricing_override_cents, dep.pricing_currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Page ────────────────────────────────────── */

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [editOpen, setEditOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => api.get<APIResponse<TripMaster>>(`/trips/${id}`),
    enabled: !!id,
  });

  const cloneMutation = useMutation({
    mutationFn: () => api.post<APIResponse<TripMaster>>(`/trips/${id}/clone`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.push(`/trips/${res.data.id}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/trips/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/trips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.push('/trips');
    },
  });

  const trip = data?.data;

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <span className="crm-caption">Loading trip...</span>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="crm-caption">Trip not found</div>
        <button className="crm-btn ghost" style={{ marginTop: 12 }} onClick={() => router.push('/trips')}>
          <ArrowLeft size={14} /> Back to trips
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Hero ────────────────────────────── */}
      {trip.hero_image_urls && trip.hero_image_urls.length > 0 ? (
        <div style={{ height: 160, borderRadius: 0, overflow: 'hidden', background: '#f0f0f0', position: 'relative' }}>
          <img
            src={thumbUrl(trip.hero_image_urls[0], 800, 200)}
            alt={trip.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div className="crm-img-plc" style={{ height: 120, marginBottom: 0, borderRadius: 0 }}>
          [ no hero image ]
        </div>
      )}

      <div style={{ padding: '16px 24px 0' }}>
        {/* Back */}
        <button
          className="crm-btn ghost sm"
          style={{ marginBottom: 12 }}
          onClick={() => router.push('/trips')}
        >
          <ArrowLeft size={14} /> Back to trips
        </button>

        {/* Status control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="crm-seg" style={{ marginRight: 4 }}>
            {(['draft', 'published', 'archived'] as const).map((s) => (
              <button
                key={s}
                className={trip.status === s ? 'on' : ''}
                disabled={statusMutation.isPending}
                onClick={() => { if (trip.status !== s) statusMutation.mutate(s); }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {trip.countries && trip.countries.map(c => (
            <span key={c} className="crm-pill blue">{c}</span>
          ))}
          {trip.tags && trip.tags.slice(0, 3).map(t => (
            <span key={t} className="crm-pill">{t}</span>
          ))}
        </div>

        {/* Title */}
        <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Trip Template</div>
        <h1 className="crm-display" style={{ marginBottom: 4 }}>{trip.name}</h1>
        <div className="crm-dim" style={{ fontSize: 15, marginBottom: 8 }}>
          {trip.destinations && trip.destinations.length > 0
            ? trip.destinations.join(' / ')
            : trip.slug}
          {(trip.duration_days || trip.duration_nights) && (
            <>
              {' '}&middot;{' '}
              {trip.duration_days ? `${trip.duration_days} days` : ''}
              {trip.duration_days && trip.duration_nights ? ' / ' : ''}
              {trip.duration_nights ? `${trip.duration_nights} nights` : ''}
            </>
          )}
        </div>
        {trip.short_description && (
          <div style={{ fontSize: 14, color: 'var(--crm-text-2)', marginBottom: 16, maxWidth: 700, lineHeight: 1.5 }}>
            {trip.short_description}
          </div>
        )}
      </div>

      {/* ─── Tabs ────────────────────────────── */}
      <div className="crm-tabs">
        {tabs.map(t => (
          <div
            key={t}
            className={`crm-tab${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </div>
        ))}
      </div>

      {/* ─── Tab content ─────────────────────── */}
      <div style={{ padding: 24 }}>
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Trip at a glance */}
              <div className="crm-card crm-card-pad">
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Trip at a glance</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px 24px' }}>
                  <KVItem label="Duration" value={
                    (trip.duration_days || trip.duration_nights)
                      ? `${trip.duration_days || '--'}D / ${trip.duration_nights || '--'}N`
                      : '--'
                  } />
                  <KVItem label="Destinations" value={
                    trip.destinations && trip.destinations.length > 0
                      ? trip.destinations.join(', ')
                      : '--'
                  } />
                  <KVItem label="Difficulty" value={trip.difficulty_level ? `${trip.difficulty_level}/5` : '--'} />
                  <KVItem label="Base Price" value={formatPrice(trip.base_price_cents, trip.base_price_currency)} />
                  <KVItem label="Currency" value={trip.base_price_currency} />
                  <KVItem label="Status" value={trip.status} />
                  <KVItem label="Created" value={formatDate(trip.created_at)} />
                  <KVItem label="Tags" value={
                    trip.tags && trip.tags.length > 0
                      ? trip.tags.join(', ')
                      : '--'
                  } />
                </div>
              </div>

              {/* Long description */}
              {trip.long_description && (
                <div className="crm-card crm-card-pad">
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Description</h3>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--crm-text-2)' }}>
                    {trip.long_description}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {trip.highlights && trip.highlights.length > 0 && (
                <div className="crm-card crm-card-pad">
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Highlights</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {trip.highlights.map((h, i) => (
                      <div key={i} style={{ fontSize: 13, paddingLeft: 12, borderLeft: '3px solid var(--crm-accent)', lineHeight: 1.4 }}>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Actions card */}
              <div className="crm-card crm-card-pad">
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Actions</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="crm-btn" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => setEditOpen(true)}>
                    <Edit2 size={14} /> Edit Trip
                  </button>
                  <button
                    className="crm-btn"
                    style={{ justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => cloneMutation.mutate()}
                    disabled={cloneMutation.isPending}
                  >
                    <Copy size={14} /> {cloneMutation.isPending ? 'Cloning...' : 'Clone Trip'}
                  </button>

                  {/* Archive with confirmation */}
                  {!archiveConfirm ? (
                    <button
                      className="crm-btn"
                      style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--crm-red)' }}
                      onClick={() => setArchiveConfirm(true)}
                    >
                      <Trash2 size={14} /> Archive Trip
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--crm-red)' }}>Confirm?</span>
                      <button
                        className="crm-btn primary sm"
                        style={{ background: 'var(--crm-red)', borderColor: 'var(--crm-red)' }}
                        onClick={() => archiveMutation.mutate()}
                        disabled={archiveMutation.isPending}
                      >
                        {archiveMutation.isPending ? '...' : 'Yes, archive'}
                      </button>
                      <button className="crm-btn ghost sm" onClick={() => setArchiveConfirm(false)}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick info */}
              <div className="crm-card crm-card-pad">
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Details</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="crm-dim">Slug</span>
                    <span style={{ fontWeight: 500 }}>/{trip.slug}</span>
                  </div>
                  {trip.countries && trip.countries.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span className="crm-dim">Countries</span>
                      <span style={{ fontWeight: 500 }}>{trip.countries.join(', ')}</span>
                    </div>
                  )}
                  {trip.age_min != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span className="crm-dim">Age range</span>
                      <span style={{ fontWeight: 500 }}>{trip.age_min} - {trip.age_max ?? '--'}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="crm-dim">Updated</span>
                    <span style={{ fontWeight: 500 }}>{formatDate(trip.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Departures' && <DeparturesTab tripId={id} />}

        {activeTab === 'Itinerary' && <ItineraryTab tripId={id} />}

        {/* Gallery tab */}
        {activeTab === 'Gallery' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Hero Images</h4>
              <p style={{ fontSize: 12, color: 'var(--crm-text-3)', marginBottom: 8 }}>First image is used as the banner. Drag & drop or click to add.</p>
              <MultiUpload
                value={trip.hero_image_urls || []}
                onChange={async (urls) => {
                  await api.put(`/trips/${id}`, { ...trip, hero_image_urls: urls });
                  queryClient.invalidateQueries({ queryKey: ['trips', id] });
                }}
                accept="image/*,video/mp4"
                label=""
                max={5}
              />
            </div>
            <div style={{ borderTop: '1px solid var(--crm-border)', paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Trip Gallery</h4>
              <p style={{ fontSize: 12, color: 'var(--crm-text-3)', marginBottom: 8 }}>Photos and videos showcasing the trip experience.</p>
              <MultiUpload
                value={trip.gallery_urls || []}
                onChange={async (urls) => {
                  await api.put(`/trips/${id}`, { ...trip, gallery_urls: urls });
                  queryClient.invalidateQueries({ queryKey: ['trips', id] });
                }}
                accept="image/*,video/mp4,video/quicktime"
                label=""
                max={30}
              />
            </div>
          </div>
        )}

        {/* Placeholder tabs */}
        {!['Overview', 'Departures', 'Itinerary', 'Gallery'].includes(activeTab) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            color: 'var(--crm-text-3)',
            fontSize: 15,
          }}>
            {activeTab} — coming soon
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {trip && (
        <EditTripDialog trip={trip} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  );
}
