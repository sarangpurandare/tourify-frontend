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
import { toast } from 'sonner';
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
  ImageOff,
  Phone,
  User,
  CloudRain,
  AlertTriangle,
  Bookmark,
  Car,
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

const tabs = ['Overview', 'Details', 'Departures', 'Itinerary', 'Gallery'] as const;

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
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);
  const [editDayForm, setEditDayForm] = useState<{
    title: string; day_status: string; distance_km: string; altitude_meters: string;
    guide_name: string; guide_phone: string; weather_notes: string; contingency_plan: string;
    internal_notes: string; traveller_notes: string;
  }>({ title: '', day_status: 'planned', distance_km: '', altitude_meters: '', guide_name: '', guide_phone: '', weather_notes: '', contingency_plan: '', internal_notes: '', traveller_notes: '' });

  // Sub-resource inline forms
  const [addingActivity, setAddingActivity] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<{
    type: string; description: string; duration_minutes: string; sort_order: string;
    start_time: string; end_time: string; location_name: string; cost_per_person_cents: string;
    is_optional: boolean; booking_reference: string;
  }>({ type: 'sightseeing', description: '', duration_minutes: '', sort_order: '0', start_time: '', end_time: '', location_name: '', cost_per_person_cents: '', is_optional: false, booking_reference: '' });
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [mealForm, setMealForm] = useState<{
    meal_type: string; is_included: boolean; location: string; notes: string;
    time: string; restaurant_name: string; cuisine_type: string; cost_per_person_cents: string; dietary_options: string;
  }>({ meal_type: 'breakfast', is_included: true, location: '', notes: '', time: '', restaurant_name: '', cuisine_type: '', cost_per_person_cents: '', dietary_options: '' });
  const [addingLocation, setAddingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', latitude: '', longitude: '', sort_order: '0' });
  const [addingTransport, setAddingTransport] = useState<string | null>(null);
  const [transportForm, setTransportForm] = useState<{
    mode: string; distance_km: string; duration_minutes: string; vendor_notes: string;
    from_location: string; to_location: string; departure_time: string; arrival_time: string;
    operator_name: string; booking_reference: string; vehicle_number: string; driver_name: string; driver_phone: string;
  }>({ mode: 'car', distance_km: '', duration_minutes: '', vendor_notes: '', from_location: '', to_location: '', departure_time: '', arrival_time: '', operator_name: '', booking_reference: '', vehicle_number: '', driver_name: '', driver_phone: '' });
  const [addingAccommodation, setAddingAccommodation] = useState<string | null>(null);
  const [accommodationForm, setAccommodationForm] = useState<{
    property_name: string; room_type: string; internal_notes: string;
    check_in_time: string; check_out_time: string; address: string; phone: string;
    booking_reference: string; cost_per_night_cents: string; amenities: string;
  }>({ property_name: '', room_type: '', internal_notes: '', check_in_time: '', check_out_time: '', address: '', phone: '', booking_reference: '', cost_per_night_cents: '', amenities: '' });

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

  const updateDayMutation = useMutation({
    mutationFn: ({ dayId, body }: { dayId: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<ItineraryDay>>(`/itinerary-days/${dayId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      setEditingDay(null);
      toast.success('Day updated');
    },
    onError: () => { toast.error('Failed to update day'); },
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
      setActivityForm({ type: 'sightseeing', description: '', duration_minutes: '', sort_order: '0', start_time: '', end_time: '', location_name: '', cost_per_person_cents: '', is_optional: false, booking_reference: '' });
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
      setMealForm({ meal_type: 'breakfast', is_included: true, location: '', notes: '', time: '', restaurant_name: '', cuisine_type: '', cost_per_person_cents: '', dietary_options: '' });
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
      setTransportForm({ mode: 'car', distance_km: '', duration_minutes: '', vendor_notes: '', from_location: '', to_location: '', departure_time: '', arrival_time: '', operator_name: '', booking_reference: '', vehicle_number: '', driver_name: '', driver_phone: '' });
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
      setAccommodationForm({ property_name: '', room_type: '', internal_notes: '', check_in_time: '', check_out_time: '', address: '', phone: '', booking_reference: '', cost_per_night_cents: '', amenities: '' });
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

  function openEditDay(day: ItineraryDay) {
    setEditDayForm({
      title: day.title || '',
      day_status: day.day_status || 'planned',
      distance_km: day.distance_km?.toString() || '',
      altitude_meters: day.altitude_meters?.toString() || '',
      guide_name: day.guide_name || '',
      guide_phone: day.guide_phone || '',
      weather_notes: day.weather_notes || '',
      contingency_plan: day.contingency_plan || '',
      internal_notes: day.internal_notes || '',
      traveller_notes: day.traveller_notes || '',
    });
    setEditingDay(day);
  }

  function saveEditDay() {
    if (!editingDay) return;
    const body: Record<string, unknown> = {};
    body.title = editDayForm.title || null;
    body.day_status = editDayForm.day_status;
    body.distance_km = editDayForm.distance_km ? Number(editDayForm.distance_km) : null;
    body.altitude_meters = editDayForm.altitude_meters ? Number(editDayForm.altitude_meters) : null;
    body.guide_name = editDayForm.guide_name || null;
    body.guide_phone = editDayForm.guide_phone || null;
    body.weather_notes = editDayForm.weather_notes || null;
    body.contingency_plan = editDayForm.contingency_plan || null;
    body.internal_notes = editDayForm.internal_notes || null;
    body.traveller_notes = editDayForm.traveller_notes || null;
    updateDayMutation.mutate({ dayId: editingDay.id, body });
  }

  const smallInputStyle: React.CSSProperties = { height: 32, fontSize: 12 };
  const selectStyle: React.CSSProperties = { height: 32, fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', padding: '0 6px', background: 'var(--crm-bg)' };

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
          const actCount = day.activities?.length || 0;
          const mealCount = day.meals?.length || 0;
          const transportCount = day.transport?.length || 0;
          const accCount = day.accommodation?.length || 0;

          return (
            <div key={day.id} className="crm-card">
              {/* Day header */}
              <div
                className="crm-card-pad"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => toggleDay(day.id)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Day {day.day_number}</span>
                  {day.title && <span className="crm-dim" style={{ fontSize: 13 }}>{day.title}</span>}
                  {day.day_status && day.day_status !== 'planned' && (
                    <span className={`crm-pill ${day.day_status === 'confirmed' ? 'green' : day.day_status === 'cancelled' ? 'red' : 'amber'}`} style={{ fontSize: 10 }}>
                      {day.day_status}
                    </span>
                  )}
                </div>
                {/* Summary icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {day.distance_km && <span className="crm-caption" title="Distance">{day.distance_km} km</span>}
                  {day.altitude_meters && <span className="crm-caption" title="Altitude">{day.altitude_meters}m</span>}
                  {actCount > 0 && <span className="crm-caption" title="Activities" style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Activity size={11} />{actCount}</span>}
                  {mealCount > 0 && <span className="crm-caption" title="Meals" style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Utensils size={11} />{mealCount}</span>}
                  {transportCount > 0 && <span className="crm-caption" title="Transport" style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Bus size={11} />{transportCount}</span>}
                  {accCount > 0 && <span className="crm-caption" title="Accommodation" style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Bed size={11} />{accCount}</span>}
                </div>
                <button
                  className="crm-btn ghost sm"
                  style={{ padding: '0 6px' }}
                  onClick={(e) => { e.stopPropagation(); openEditDay(day); }}
                  title="Edit day details"
                >
                  <Edit2 size={14} />
                </button>
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
                  {/* Day logistics summary */}
                  {(day.guide_name || day.weather_notes || day.contingency_plan) && (
                    <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--crm-bg-hover)', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                      {day.guide_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <User size={12} style={{ color: 'var(--crm-text-3)' }} />
                          <span style={{ fontWeight: 500 }}>{day.guide_name}</span>
                          {day.guide_phone && <span className="crm-dim">({day.guide_phone})</span>}
                        </div>
                      )}
                      {day.weather_notes && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <CloudRain size={12} style={{ color: 'var(--crm-text-3)' }} />
                          <span>{day.weather_notes}</span>
                        </div>
                      )}
                      {day.contingency_plan && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <AlertTriangle size={12} style={{ color: 'var(--crm-text-3)' }} />
                          <span>{day.contingency_plan}</span>
                        </div>
                      )}
                    </div>
                  )}
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
                          <Input value={locationForm.name} onChange={e => setLocationForm(p => ({ ...p, name: e.target.value }))} placeholder="Location name" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1" style={{ width: 70 }}>
                          <Label style={{ fontSize: 11 }}>Order</Label>
                          <Input type="number" value={locationForm.sort_order} onChange={e => setLocationForm(p => ({ ...p, sort_order: e.target.value }))} style={smallInputStyle} />
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

                  {/* ── Activities (enhanced) ── */}
                  <SectionBlock
                    icon={<Activity size={13} />}
                    title="Activities"
                    items={day.activities || []}
                    renderItem={(act: ItineraryActivity) => (
                      <div key={act.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--crm-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {act.type && <span className="crm-pill" style={{ fontSize: 10 }}>{act.type}</span>}
                            {act.is_optional && <span className="crm-pill amber" style={{ fontSize: 10 }}>optional</span>}
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{act.description || '(no description)'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {act.cost_per_person_cents && <span className="crm-caption">{formatPrice(act.cost_per_person_cents)}/pp</span>}
                            {act.duration_minutes && <span className="crm-caption">{act.duration_minutes} min</span>}
                            <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteActivityMutation.mutate({ dayId: day.id, actId: act.id })}>
                              <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                            </button>
                          </div>
                        </div>
                        {(act.start_time || act.location_name || act.booking_reference) && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 4 }}>
                            {act.start_time && <span className="crm-caption"><Clock size={10} style={{ marginRight: 2 }} />{act.start_time}{act.end_time ? ` - ${act.end_time}` : ''}</span>}
                            {act.location_name && <span className="crm-caption"><MapPin size={10} style={{ marginRight: 2 }} />{act.location_name}</span>}
                            {act.booking_reference && <span className="crm-caption"><Bookmark size={10} style={{ marginRight: 2 }} />{act.booking_reference}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    isAdding={addingActivity === day.id}
                    onToggleAdd={() => setAddingActivity(addingActivity === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Type</Label>
                          <select value={activityForm.type} onChange={e => setActivityForm(p => ({ ...p, type: e.target.value }))} style={selectStyle}>
                            {['sightseeing', 'trekking', 'cultural', 'adventure', 'leisure', 'water_sport', 'wildlife'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
                          <Label style={{ fontSize: 11 }}>Description</Label>
                          <Input value={activityForm.description} onChange={e => setActivityForm(p => ({ ...p, description: e.target.value }))} placeholder="Activity description" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Start Time</Label>
                          <Input type="time" value={activityForm.start_time} onChange={e => setActivityForm(p => ({ ...p, start_time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>End Time</Label>
                          <Input type="time" value={activityForm.end_time} onChange={e => setActivityForm(p => ({ ...p, end_time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Duration (min)</Label>
                          <Input type="number" value={activityForm.duration_minutes} onChange={e => setActivityForm(p => ({ ...p, duration_minutes: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Location</Label>
                          <Input value={activityForm.location_name} onChange={e => setActivityForm(p => ({ ...p, location_name: e.target.value }))} placeholder="Place name" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Cost/person (cents)</Label>
                          <Input type="number" value={activityForm.cost_per_person_cents} onChange={e => setActivityForm(p => ({ ...p, cost_per_person_cents: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Booking Ref</Label>
                          <Input value={activityForm.booking_reference} onChange={e => setActivityForm(p => ({ ...p, booking_reference: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1" style={{ display: 'flex', alignItems: 'end', gap: 6 }}>
                          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="checkbox" checked={activityForm.is_optional} onChange={e => setActivityForm(p => ({ ...p, is_optional: e.target.checked }))} />
                            Optional
                          </label>
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            className="crm-btn primary sm"
                            disabled={addActivityMutation.isPending}
                            onClick={() => {
                              const body: Record<string, unknown> = { sort_order: Number(activityForm.sort_order) || 0, is_optional: activityForm.is_optional };
                              if (activityForm.type) body.type = activityForm.type;
                              if (activityForm.description) body.description = activityForm.description;
                              if (activityForm.duration_minutes) body.duration_minutes = Number(activityForm.duration_minutes);
                              if (activityForm.start_time) body.start_time = activityForm.start_time;
                              if (activityForm.end_time) body.end_time = activityForm.end_time;
                              if (activityForm.location_name) body.location_name = activityForm.location_name;
                              if (activityForm.cost_per_person_cents) body.cost_per_person_cents = Number(activityForm.cost_per_person_cents);
                              if (activityForm.booking_reference) body.booking_reference = activityForm.booking_reference;
                              addActivityMutation.mutate({ dayId: day.id, body });
                            }}
                          >
                            {addActivityMutation.isPending ? '...' : 'Add Activity'}
                          </button>
                        </div>
                      </div>
                    }
                  />

                  {/* ── Meals (enhanced) ── */}
                  <SectionBlock
                    icon={<Utensils size={13} />}
                    title="Meals"
                    items={day.meals || []}
                    renderItem={(meal: ItineraryMeal) => (
                      <div key={meal.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--crm-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`crm-pill ${meal.is_included ? 'green' : ''}`} style={{ fontSize: 10 }}>{meal.meal_type}</span>
                            <span style={{ fontSize: 13 }}>
                              {meal.restaurant_name || meal.location || (meal.is_included ? 'Included' : 'Not included')}
                            </span>
                            {meal.cuisine_type && <span className="crm-dim" style={{ fontSize: 11 }}>({meal.cuisine_type})</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {meal.time && <span className="crm-caption"><Clock size={10} style={{ marginRight: 2 }} />{meal.time}</span>}
                            {meal.cost_per_person_cents && <span className="crm-caption">{formatPrice(meal.cost_per_person_cents)}/pp</span>}
                            <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteMealMutation.mutate({ dayId: day.id, mealId: meal.id })}>
                              <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                            </button>
                          </div>
                        </div>
                        {meal.dietary_options && meal.dietary_options.length > 0 && (
                          <div style={{ marginTop: 4, paddingLeft: 4 }}>
                            {meal.dietary_options.map((d, i) => <span key={i} className="crm-pill" style={{ fontSize: 9, marginRight: 4 }}>{d}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                    isAdding={addingMeal === day.id}
                    onToggleAdd={() => setAddingMeal(addingMeal === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Type *</Label>
                          <select value={mealForm.meal_type} onChange={e => setMealForm(p => ({ ...p, meal_type: e.target.value }))} style={selectStyle}>
                            {['breakfast', 'lunch', 'dinner', 'snack'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Included</Label>
                          <select value={mealForm.is_included ? 'yes' : 'no'} onChange={e => setMealForm(p => ({ ...p, is_included: e.target.value === 'yes' }))} style={selectStyle}>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Time</Label>
                          <Input type="time" value={mealForm.time} onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Restaurant</Label>
                          <Input value={mealForm.restaurant_name} onChange={e => setMealForm(p => ({ ...p, restaurant_name: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Cuisine</Label>
                          <Input value={mealForm.cuisine_type} onChange={e => setMealForm(p => ({ ...p, cuisine_type: e.target.value }))} placeholder="e.g. Italian" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Cost/person (cents)</Label>
                          <Input type="number" value={mealForm.cost_per_person_cents} onChange={e => setMealForm(p => ({ ...p, cost_per_person_cents: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Location</Label>
                          <Input value={mealForm.location} onChange={e => setMealForm(p => ({ ...p, location: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Dietary (comma-sep)</Label>
                          <Input value={mealForm.dietary_options} onChange={e => setMealForm(p => ({ ...p, dietary_options: e.target.value }))} placeholder="veg, vegan, gf" style={smallInputStyle} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            className="crm-btn primary sm"
                            disabled={addMealMutation.isPending}
                            onClick={() => {
                              const body: Record<string, unknown> = { meal_type: mealForm.meal_type, is_included: mealForm.is_included };
                              if (mealForm.location) body.location = mealForm.location;
                              if (mealForm.notes) body.notes = mealForm.notes;
                              if (mealForm.time) body.time = mealForm.time;
                              if (mealForm.restaurant_name) body.restaurant_name = mealForm.restaurant_name;
                              if (mealForm.cuisine_type) body.cuisine_type = mealForm.cuisine_type;
                              if (mealForm.cost_per_person_cents) body.cost_per_person_cents = Number(mealForm.cost_per_person_cents);
                              if (mealForm.dietary_options) body.dietary_options = mealForm.dietary_options.split(',').map(s => s.trim()).filter(Boolean);
                              addMealMutation.mutate({ dayId: day.id, body });
                            }}
                          >
                            {addMealMutation.isPending ? '...' : 'Add Meal'}
                          </button>
                        </div>
                      </div>
                    }
                  />

                  {/* ── Transport (enhanced) ── */}
                  <SectionBlock
                    icon={<Bus size={13} />}
                    title="Transport"
                    items={day.transport || []}
                    renderItem={(t: ItineraryTransport) => (
                      <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--crm-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {t.mode && <span className="crm-pill" style={{ fontSize: 10 }}>{t.mode}</span>}
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {t.from_location && t.to_location
                                ? `${t.from_location} → ${t.to_location}`
                                : t.from_location || t.to_location || '(no route)'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {t.distance_km && <span className="crm-caption">{t.distance_km} km</span>}
                            {t.duration_minutes && <span className="crm-caption">{t.duration_minutes} min</span>}
                            <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteTransportMutation.mutate({ dayId: day.id, tId: t.id })}>
                              <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                            </button>
                          </div>
                        </div>
                        {(t.departure_time || t.operator_name || t.vehicle_number || t.driver_name || t.booking_reference) && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 4, flexWrap: 'wrap' }}>
                            {t.departure_time && <span className="crm-caption"><Clock size={10} style={{ marginRight: 2 }} />{t.departure_time}{t.arrival_time ? ` - ${t.arrival_time}` : ''}</span>}
                            {t.operator_name && <span className="crm-caption"><Car size={10} style={{ marginRight: 2 }} />{t.operator_name}</span>}
                            {t.vehicle_number && <span className="crm-caption">#{t.vehicle_number}</span>}
                            {t.driver_name && <span className="crm-caption"><User size={10} style={{ marginRight: 2 }} />{t.driver_name}{t.driver_phone ? ` (${t.driver_phone})` : ''}</span>}
                            {t.booking_reference && <span className="crm-caption"><Bookmark size={10} style={{ marginRight: 2 }} />{t.booking_reference}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    isAdding={addingTransport === day.id}
                    onToggleAdd={() => setAddingTransport(addingTransport === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Mode</Label>
                          <select value={transportForm.mode} onChange={e => setTransportForm(p => ({ ...p, mode: e.target.value }))} style={selectStyle}>
                            {['car', 'bus', 'flight', 'train', 'ferry', 'walk', 'bike', 'auto'].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>From</Label>
                          <Input value={transportForm.from_location} onChange={e => setTransportForm(p => ({ ...p, from_location: e.target.value }))} placeholder="Origin" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>To</Label>
                          <Input value={transportForm.to_location} onChange={e => setTransportForm(p => ({ ...p, to_location: e.target.value }))} placeholder="Destination" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Departure</Label>
                          <Input type="time" value={transportForm.departure_time} onChange={e => setTransportForm(p => ({ ...p, departure_time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Arrival</Label>
                          <Input type="time" value={transportForm.arrival_time} onChange={e => setTransportForm(p => ({ ...p, arrival_time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Distance (km)</Label>
                          <Input type="number" value={transportForm.distance_km} onChange={e => setTransportForm(p => ({ ...p, distance_km: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Duration (min)</Label>
                          <Input type="number" value={transportForm.duration_minutes} onChange={e => setTransportForm(p => ({ ...p, duration_minutes: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Operator</Label>
                          <Input value={transportForm.operator_name} onChange={e => setTransportForm(p => ({ ...p, operator_name: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Booking Ref</Label>
                          <Input value={transportForm.booking_reference} onChange={e => setTransportForm(p => ({ ...p, booking_reference: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Vehicle #</Label>
                          <Input value={transportForm.vehicle_number} onChange={e => setTransportForm(p => ({ ...p, vehicle_number: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Driver Name</Label>
                          <Input value={transportForm.driver_name} onChange={e => setTransportForm(p => ({ ...p, driver_name: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Driver Phone</Label>
                          <Input value={transportForm.driver_phone} onChange={e => setTransportForm(p => ({ ...p, driver_phone: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            className="crm-btn primary sm"
                            disabled={addTransportMutation.isPending}
                            onClick={() => {
                              const body: Record<string, unknown> = {};
                              if (transportForm.mode) body.mode = transportForm.mode;
                              if (transportForm.from_location) body.from_location = transportForm.from_location;
                              if (transportForm.to_location) body.to_location = transportForm.to_location;
                              if (transportForm.departure_time) body.departure_time = transportForm.departure_time;
                              if (transportForm.arrival_time) body.arrival_time = transportForm.arrival_time;
                              if (transportForm.distance_km) body.distance_km = Number(transportForm.distance_km);
                              if (transportForm.duration_minutes) body.duration_minutes = Number(transportForm.duration_minutes);
                              if (transportForm.operator_name) body.operator_name = transportForm.operator_name;
                              if (transportForm.booking_reference) body.booking_reference = transportForm.booking_reference;
                              if (transportForm.vehicle_number) body.vehicle_number = transportForm.vehicle_number;
                              if (transportForm.driver_name) body.driver_name = transportForm.driver_name;
                              if (transportForm.driver_phone) body.driver_phone = transportForm.driver_phone;
                              if (transportForm.vendor_notes) body.vendor_notes = transportForm.vendor_notes;
                              addTransportMutation.mutate({ dayId: day.id, body });
                            }}
                          >
                            {addTransportMutation.isPending ? '...' : 'Add Transport'}
                          </button>
                        </div>
                      </div>
                    }
                  />

                  {/* ── Accommodation (enhanced) ── */}
                  <SectionBlock
                    icon={<Bed size={13} />}
                    title="Accommodation"
                    items={day.accommodation || []}
                    renderItem={(acc: ItineraryAccommodation) => (
                      <div key={acc.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--crm-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{acc.property_name || '(unnamed)'}</span>
                            {acc.room_type && <span className="crm-pill" style={{ fontSize: 10 }}>{acc.room_type}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {acc.cost_per_night_cents && <span className="crm-caption">{formatPrice(acc.cost_per_night_cents)}/night</span>}
                            <button className="crm-btn ghost sm" style={{ padding: '0 4px' }} onClick={() => deleteAccommodationMutation.mutate({ dayId: day.id, accId: acc.id })}>
                              <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
                            </button>
                          </div>
                        </div>
                        {(acc.check_in_time || acc.address || acc.phone || acc.booking_reference) && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 4, flexWrap: 'wrap' }}>
                            {acc.check_in_time && <span className="crm-caption"><Clock size={10} style={{ marginRight: 2 }} />In: {acc.check_in_time}</span>}
                            {acc.check_out_time && <span className="crm-caption"><Clock size={10} style={{ marginRight: 2 }} />Out: {acc.check_out_time}</span>}
                            {acc.phone && <span className="crm-caption"><Phone size={10} style={{ marginRight: 2 }} />{acc.phone}</span>}
                            {acc.booking_reference && <span className="crm-caption"><Bookmark size={10} style={{ marginRight: 2 }} />{acc.booking_reference}</span>}
                            {acc.address && <span className="crm-caption"><MapPin size={10} style={{ marginRight: 2 }} />{acc.address}</span>}
                          </div>
                        )}
                        {acc.amenities && acc.amenities.length > 0 && (
                          <div style={{ marginTop: 4, paddingLeft: 4 }}>
                            {acc.amenities.map((a, i) => <span key={i} className="crm-pill" style={{ fontSize: 9, marginRight: 4 }}>{a}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                    isAdding={addingAccommodation === day.id}
                    onToggleAdd={() => setAddingAccommodation(addingAccommodation === day.id ? null : day.id)}
                    addForm={
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                        <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
                          <Label style={{ fontSize: 11 }}>Property Name</Label>
                          <Input value={accommodationForm.property_name} onChange={e => setAccommodationForm(p => ({ ...p, property_name: e.target.value }))} placeholder="Hotel / Lodge name" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Room Type</Label>
                          <Input value={accommodationForm.room_type} onChange={e => setAccommodationForm(p => ({ ...p, room_type: e.target.value }))} placeholder="e.g. Deluxe Twin" style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Check-in</Label>
                          <Input type="time" value={accommodationForm.check_in_time} onChange={e => setAccommodationForm(p => ({ ...p, check_in_time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Check-out</Label>
                          <Input type="time" value={accommodationForm.check_out_time} onChange={e => setAccommodationForm(p => ({ ...p, check_out_time: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
                          <Label style={{ fontSize: 11 }}>Address</Label>
                          <Input value={accommodationForm.address} onChange={e => setAccommodationForm(p => ({ ...p, address: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Phone</Label>
                          <Input value={accommodationForm.phone} onChange={e => setAccommodationForm(p => ({ ...p, phone: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Booking Ref</Label>
                          <Input value={accommodationForm.booking_reference} onChange={e => setAccommodationForm(p => ({ ...p, booking_reference: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1">
                          <Label style={{ fontSize: 11 }}>Cost/night (cents)</Label>
                          <Input type="number" value={accommodationForm.cost_per_night_cents} onChange={e => setAccommodationForm(p => ({ ...p, cost_per_night_cents: e.target.value }))} style={smallInputStyle} />
                        </div>
                        <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
                          <Label style={{ fontSize: 11 }}>Amenities (comma-sep)</Label>
                          <Input value={accommodationForm.amenities} onChange={e => setAccommodationForm(p => ({ ...p, amenities: e.target.value }))} placeholder="WiFi, Pool, AC" style={smallInputStyle} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            className="crm-btn primary sm"
                            disabled={addAccommodationMutation.isPending}
                            onClick={() => {
                              const body: Record<string, unknown> = {};
                              if (accommodationForm.property_name) body.property_name = accommodationForm.property_name;
                              if (accommodationForm.room_type) body.room_type = accommodationForm.room_type;
                              if (accommodationForm.internal_notes) body.internal_notes = accommodationForm.internal_notes;
                              if (accommodationForm.check_in_time) body.check_in_time = accommodationForm.check_in_time;
                              if (accommodationForm.check_out_time) body.check_out_time = accommodationForm.check_out_time;
                              if (accommodationForm.address) body.address = accommodationForm.address;
                              if (accommodationForm.phone) body.phone = accommodationForm.phone;
                              if (accommodationForm.booking_reference) body.booking_reference = accommodationForm.booking_reference;
                              if (accommodationForm.cost_per_night_cents) body.cost_per_night_cents = Number(accommodationForm.cost_per_night_cents);
                              if (accommodationForm.amenities) body.amenities = accommodationForm.amenities.split(',').map(s => s.trim()).filter(Boolean);
                              addAccommodationMutation.mutate({ dayId: day.id, body });
                            }}
                          >
                            {addAccommodationMutation.isPending ? '...' : 'Add Accommodation'}
                          </button>
                        </div>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ── Edit Day Dialog ── */}
      <Dialog open={!!editingDay} onOpenChange={(open) => { if (!open) setEditingDay(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Day {editingDay?.day_number}</DialogTitle>
            <DialogDescription>Update day details, logistics, and contingency info.</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 0' }}>
            <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
              <Label style={{ fontSize: 12 }}>Title</Label>
              <Input value={editDayForm.title} onChange={e => setEditDayForm(p => ({ ...p, title: e.target.value }))} placeholder="Day title" />
            </div>
            <div className="grid gap-1">
              <Label style={{ fontSize: 12 }}>Status</Label>
              <select value={editDayForm.day_status} onChange={e => setEditDayForm(p => ({ ...p, day_status: e.target.value }))} style={{ height: 36, fontSize: 13, borderRadius: 6, border: '1px solid var(--crm-hairline)', padding: '0 8px', background: 'var(--crm-bg)' }}>
                {['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <Label style={{ fontSize: 12 }}>Distance (km)</Label>
              <Input type="number" value={editDayForm.distance_km} onChange={e => setEditDayForm(p => ({ ...p, distance_km: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label style={{ fontSize: 12 }}>Altitude (m)</Label>
              <Input type="number" value={editDayForm.altitude_meters} onChange={e => setEditDayForm(p => ({ ...p, altitude_meters: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label style={{ fontSize: 12 }}>Guide Name</Label>
              <Input value={editDayForm.guide_name} onChange={e => setEditDayForm(p => ({ ...p, guide_name: e.target.value }))} />
            </div>
            <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
              <Label style={{ fontSize: 12 }}>Guide Phone</Label>
              <Input value={editDayForm.guide_phone} onChange={e => setEditDayForm(p => ({ ...p, guide_phone: e.target.value }))} />
            </div>
            <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
              <Label style={{ fontSize: 12 }}>Weather Notes</Label>
              <Input value={editDayForm.weather_notes} onChange={e => setEditDayForm(p => ({ ...p, weather_notes: e.target.value }))} placeholder="Expected conditions..." />
            </div>
            <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
              <Label style={{ fontSize: 12 }}>Contingency Plan</Label>
              <Input value={editDayForm.contingency_plan} onChange={e => setEditDayForm(p => ({ ...p, contingency_plan: e.target.value }))} placeholder="Backup plan if weather/issues..." />
            </div>
            <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
              <Label style={{ fontSize: 12 }}>Internal Notes</Label>
              <Input value={editDayForm.internal_notes} onChange={e => setEditDayForm(p => ({ ...p, internal_notes: e.target.value }))} placeholder="Ops notes (not visible to travellers)" />
            </div>
            <div className="grid gap-1" style={{ gridColumn: 'span 2' }}>
              <Label style={{ fontSize: 12 }}>Traveller Notes</Label>
              <Input value={editDayForm.traveller_notes} onChange={e => setEditDayForm(p => ({ ...p, traveller_notes: e.target.value }))} placeholder="Visible to travellers" />
            </div>
          </div>
          <DialogFooter>
            <button className="crm-btn ghost" onClick={() => setEditingDay(null)}>Cancel</button>
            <button className="crm-btn primary" onClick={saveEditDay} disabled={updateDayMutation.isPending}>
              {updateDayMutation.isPending ? 'Saving...' : 'Save Day'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

/* ─── Details Tab ────────────────────────────── */

function DetailsTab({ trip }: { trip: TripMaster }) {
  const queryClient = useQueryClient();

  // Section 1: Trip Information
  const [infoForm, setInfoForm] = useState({
    fitness_level_required: trip.fitness_level_required ?? 1,
    fitness_requirements: trip.fitness_requirements || '',
    altitude_details: trip.altitude_details || '',
    weather_notes: trip.weather_notes || '',
    best_seasons: (trip.best_seasons || []).join(', '),
    group_size_min: trip.group_size_min?.toString() || '',
    group_size_max: trip.group_size_max?.toString() || '',
  });
  const [infoSaving, setInfoSaving] = useState(false);

  // Section 2: Policies & Info
  const [policyForm, setPolicyForm] = useState({
    cancellation_policy: trip.cancellation_policy
      ? JSON.stringify(trip.cancellation_policy, null, 2)
      : '[\n  { "days_before": 30, "refund_percent": 100 },\n  { "days_before": 14, "refund_percent": 50 },\n  { "days_before": 7, "refund_percent": 0 }\n]',
    whats_included_text: trip.whats_included_text || '',
    whats_excluded_text: trip.whats_excluded_text || '',
    insurance_mandatory: trip.insurance_mandatory ?? false,
  });
  const [policySaving, setPolicySaving] = useState(false);

  // Section 3: FAQs
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>(() => {
    if (trip.faqs && Array.isArray(trip.faqs)) {
      return trip.faqs as { question: string; answer: string }[];
    }
    return [];
  });
  const [faqsSaving, setFaqsSaving] = useState(false);

  // Section 4: SEO
  const [seoForm, setSeoForm] = useState({
    meta_title: trip.meta_title || '',
    meta_description: trip.meta_description || '',
    featured: trip.featured ?? false,
    display_order: trip.display_order?.toString() || '0',
  });
  const [seoSaving, setSeoSaving] = useState(false);

  async function saveSection(body: Record<string, unknown>, setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
      await api.put(`/trips/${trip.id}`, body);
      queryClient.invalidateQueries({ queryKey: ['trips', trip.id] });
      toast.success('Saved successfully');
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  }

  function saveInfo() {
    const body: Record<string, unknown> = {
      fitness_level_required: infoForm.fitness_level_required,
      fitness_requirements: infoForm.fitness_requirements || null,
      altitude_details: infoForm.altitude_details || null,
      weather_notes: infoForm.weather_notes || null,
      best_seasons: infoForm.best_seasons
        ? infoForm.best_seasons.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      group_size_min: infoForm.group_size_min ? Number(infoForm.group_size_min) : null,
      group_size_max: infoForm.group_size_max ? Number(infoForm.group_size_max) : null,
    };
    saveSection(body, setInfoSaving);
  }

  function savePolicy() {
    let parsedPolicy: unknown = null;
    try {
      parsedPolicy = JSON.parse(policyForm.cancellation_policy);
    } catch {
      toast.error('Invalid JSON in cancellation policy');
      return;
    }
    const body: Record<string, unknown> = {
      cancellation_policy: parsedPolicy,
      whats_included_text: policyForm.whats_included_text || null,
      whats_excluded_text: policyForm.whats_excluded_text || null,
      insurance_mandatory: policyForm.insurance_mandatory,
    };
    saveSection(body, setPolicySaving);
  }

  function saveFaqs() {
    saveSection({ faqs }, setFaqsSaving);
  }

  function saveSeo() {
    const body: Record<string, unknown> = {
      meta_title: seoForm.meta_title || null,
      meta_description: seoForm.meta_description || null,
      featured: seoForm.featured,
      display_order: Number(seoForm.display_order) || 0,
    };
    saveSection(body, setSeoSaving);
  }

  const sectionStyle: React.CSSProperties = { marginBottom: 24 };
  const sectionHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 };
  const fieldGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight: 72, padding: '8px 10px', fontSize: 13, lineHeight: 1.5,
    border: '1px solid var(--crm-hairline)', borderRadius: 6, background: 'var(--crm-bg)',
    resize: 'vertical', fontFamily: 'inherit',
  };

  return (
    <div style={{ maxWidth: 820 }}>
      {/* ── Section 1: Trip Information ── */}
      <div className="crm-card crm-card-pad" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Trip Information</h3>
          <button className="crm-btn primary sm" onClick={saveInfo} disabled={infoSaving}>
            {infoSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Fitness level slider */}
        <div style={{ marginBottom: 12 }}>
          <Label style={{ fontSize: 12 }}>Fitness Level Required: {infoForm.fitness_level_required}/10</Label>
          <input
            type="range"
            min={1}
            max={10}
            value={infoForm.fitness_level_required}
            onChange={e => setInfoForm(p => ({ ...p, fitness_level_required: Number(e.target.value) }))}
            style={{ width: '100%', marginTop: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--crm-text-4)' }}>
            <span>1 (Easy)</span><span>10 (Extreme)</span>
          </div>
        </div>

        {/* Fitness requirements */}
        <div style={{ marginBottom: 12 }}>
          <Label style={{ fontSize: 12 }}>Fitness Requirements</Label>
          <textarea
            style={textareaStyle}
            value={infoForm.fitness_requirements}
            onChange={e => setInfoForm(p => ({ ...p, fitness_requirements: e.target.value }))}
            placeholder="Describe physical fitness requirements..."
          />
        </div>

        {/* Altitude / Weather side by side */}
        <div style={fieldGridStyle}>
          <div>
            <Label style={{ fontSize: 12 }}>Altitude Details</Label>
            <textarea
              style={{ ...textareaStyle, minHeight: 60 }}
              value={infoForm.altitude_details}
              onChange={e => setInfoForm(p => ({ ...p, altitude_details: e.target.value }))}
              placeholder="Max altitude, acclimatization notes..."
            />
          </div>
          <div>
            <Label style={{ fontSize: 12 }}>Weather Notes</Label>
            <textarea
              style={{ ...textareaStyle, minHeight: 60 }}
              value={infoForm.weather_notes}
              onChange={e => setInfoForm(p => ({ ...p, weather_notes: e.target.value }))}
              placeholder="Expected weather conditions..."
            />
          </div>
        </div>

        {/* Best seasons */}
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <Label style={{ fontSize: 12 }}>Best Seasons (comma-separated, e.g. Oct, Nov, Mar)</Label>
          <Input
            value={infoForm.best_seasons}
            onChange={e => setInfoForm(p => ({ ...p, best_seasons: e.target.value }))}
            placeholder="Oct, Nov, Mar, Apr"
          />
        </div>

        {/* Group size */}
        <div style={fieldGridStyle}>
          <div>
            <Label style={{ fontSize: 12 }}>Group Size Min</Label>
            <Input
              type="number"
              min={1}
              value={infoForm.group_size_min}
              onChange={e => setInfoForm(p => ({ ...p, group_size_min: e.target.value }))}
              placeholder="e.g. 4"
            />
          </div>
          <div>
            <Label style={{ fontSize: 12 }}>Group Size Max</Label>
            <Input
              type="number"
              min={1}
              value={infoForm.group_size_max}
              onChange={e => setInfoForm(p => ({ ...p, group_size_max: e.target.value }))}
              placeholder="e.g. 16"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Policies & Info ── */}
      <div className="crm-card crm-card-pad" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Policies & Info</h3>
          <button className="crm-btn primary sm" onClick={savePolicy} disabled={policySaving}>
            {policySaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Cancellation policy JSON */}
        <div style={{ marginBottom: 12 }}>
          <Label style={{ fontSize: 12 }}>Cancellation Policy (JSON array: {`[{ days_before, refund_percent }]`})</Label>
          <textarea
            style={{ ...textareaStyle, minHeight: 100, fontFamily: 'monospace', fontSize: 12 }}
            value={policyForm.cancellation_policy}
            onChange={e => setPolicyForm(p => ({ ...p, cancellation_policy: e.target.value }))}
          />
        </div>

        {/* Included / Excluded */}
        <div style={fieldGridStyle}>
          <div>
            <Label style={{ fontSize: 12 }}>What&apos;s Included (one per line)</Label>
            <textarea
              style={{ ...textareaStyle, minHeight: 100 }}
              value={policyForm.whats_included_text}
              onChange={e => setPolicyForm(p => ({ ...p, whats_included_text: e.target.value }))}
              placeholder="Transport from pickup point&#10;All meals during trek&#10;Camping equipment"
            />
          </div>
          <div>
            <Label style={{ fontSize: 12 }}>What&apos;s Excluded (one per line)</Label>
            <textarea
              style={{ ...textareaStyle, minHeight: 100 }}
              value={policyForm.whats_excluded_text}
              onChange={e => setPolicyForm(p => ({ ...p, whats_excluded_text: e.target.value }))}
              placeholder="Personal expenses&#10;Travel insurance&#10;Tips and gratuities"
            />
          </div>
        </div>

        {/* Insurance mandatory toggle */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="insurance_mandatory"
            checked={policyForm.insurance_mandatory}
            onChange={e => setPolicyForm(p => ({ ...p, insurance_mandatory: e.target.checked }))}
            style={{ width: 16, height: 16 }}
          />
          <Label htmlFor="insurance_mandatory" style={{ fontSize: 13, margin: 0, cursor: 'pointer' }}>
            Insurance Mandatory
          </Label>
        </div>
      </div>

      {/* ── Section 3: FAQs ── */}
      <div className="crm-card crm-card-pad" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>FAQs ({faqs.length})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="crm-btn ghost sm"
              onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])}
            >
              <Plus size={12} /> Add
            </button>
            <button className="crm-btn primary sm" onClick={saveFaqs} disabled={faqsSaving}>
              {faqsSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {faqs.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <span className="crm-caption">No FAQs yet. Click Add to create one.</span>
          </div>
        )}

        {faqs.map((faq, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px 12px',
              marginBottom: 8,
              background: 'var(--crm-bg-hover)',
              borderRadius: 8,
              position: 'relative',
            }}
          >
            <button
              className="crm-btn ghost sm"
              style={{ position: 'absolute', top: 8, right: 8, padding: '0 4px' }}
              onClick={() => setFaqs(prev => prev.filter((_, i) => i !== idx))}
            >
              <Trash2 size={12} style={{ color: 'var(--crm-red)' }} />
            </button>
            <div style={{ marginBottom: 8 }}>
              <Label style={{ fontSize: 11 }}>Question</Label>
              <Input
                value={faq.question}
                onChange={e => {
                  const val = e.target.value;
                  setFaqs(prev => prev.map((f, i) => i === idx ? { ...f, question: val } : f));
                }}
                placeholder="e.g. What is the difficulty level?"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 11 }}>Answer</Label>
              <textarea
                style={{ ...textareaStyle, minHeight: 48 }}
                value={faq.answer}
                onChange={e => {
                  const val = e.target.value;
                  setFaqs(prev => prev.map((f, i) => i === idx ? { ...f, answer: val } : f));
                }}
                placeholder="Answer..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 4: SEO ── */}
      <div className="crm-card crm-card-pad" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>SEO & Display</h3>
          <button className="crm-btn primary sm" onClick={saveSeo} disabled={seoSaving}>
            {seoSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Meta title */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label style={{ fontSize: 12 }}>Meta Title</Label>
            <span style={{ fontSize: 11, color: seoForm.meta_title.length > 60 ? 'var(--crm-red)' : 'var(--crm-text-4)' }}>
              {seoForm.meta_title.length}/60
            </span>
          </div>
          <Input
            value={seoForm.meta_title}
            onChange={e => setSeoForm(p => ({ ...p, meta_title: e.target.value }))}
            placeholder="SEO page title"
            maxLength={60}
          />
        </div>

        {/* Meta description */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label style={{ fontSize: 12 }}>Meta Description</Label>
            <span style={{ fontSize: 11, color: seoForm.meta_description.length > 160 ? 'var(--crm-red)' : 'var(--crm-text-4)' }}>
              {seoForm.meta_description.length}/160
            </span>
          </div>
          <textarea
            style={{ ...textareaStyle, minHeight: 56 }}
            value={seoForm.meta_description}
            onChange={e => setSeoForm(p => ({ ...p, meta_description: e.target.value }))}
            placeholder="Brief description for search engines..."
            maxLength={160}
          />
        </div>

        {/* Featured + Display order */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="featured"
              checked={seoForm.featured}
              onChange={e => setSeoForm(p => ({ ...p, featured: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <Label htmlFor="featured" style={{ fontSize: 13, margin: 0, cursor: 'pointer' }}>
              Featured
            </Label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Label style={{ fontSize: 12, margin: 0 }}>Display Order</Label>
            <Input
              type="number"
              value={seoForm.display_order}
              onChange={e => setSeoForm(p => ({ ...p, display_order: e.target.value }))}
              style={{ width: 70 }}
            />
          </div>
        </div>
      </div>
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
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

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
        <div
          style={{
            height: 120,
            marginBottom: 0,
            borderRadius: 0,
            background: 'var(--crm-bg-2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'var(--crm-text-3)',
          }}
        >
          <ImageOff size={20} />
          <span className="crm-caption">No hero image</span>
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
          <span className={`crm-pill ${statusPillColor(trip.status)}`}>
            <span className="dot" />
            {trip.status}
          </span>
          {trip.status === 'draft' && (
            <button
              className="crm-btn primary sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('published')}
              style={{ gap: 6 }}
            >
              {statusMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
          )}
          {trip.status === 'published' && (
            <button
              className="crm-btn sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('draft')}
              style={{ gap: 6 }}
            >
              {statusMutation.isPending ? 'Updating...' : 'Move back to drafts'}
            </button>
          )}
          {trip.status === 'archived' && (
            <button
              className="crm-btn sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('draft')}
              style={{ gap: 6 }}
            >
              {statusMutation.isPending ? 'Restoring...' : 'Restore to drafts'}
            </button>
          )}
          <span className={`crm-pill ${(trip.trip_type || 'group') === 'private' ? 'purple' : ''}`}>
            {(trip.trip_type || 'group') === 'private' ? 'Private Trip' : 'Group Tour'}
          </span>
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
                    onClick={() => setCloneDialogOpen(true)}
                  >
                    <Copy size={14} /> Clone / New Departure
                  </button>
                </div>

                {/* Archive — separated at bottom */}
                {trip.status !== 'archived' && (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--crm-line)' }}>
                    {!archiveConfirm ? (
                      <button
                        className="crm-btn ghost sm"
                        style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--crm-text-3)' }}
                        onClick={() => setArchiveConfirm(true)}
                      >
                        <Trash2 size={14} /> Archive trip
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
                )}
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

        {activeTab === 'Details' && <DetailsTab trip={trip} />}

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
                  await api.put(`/trips/${id}`, { hero_image_urls: urls });
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
                  await api.put(`/trips/${id}`, { gallery_urls: urls });
                  queryClient.invalidateQueries({ queryKey: ['trips', id] });
                }}
                accept="image/*,video/mp4,video/quicktime"
                label=""
                max={30}
              />
            </div>
          </div>
        )}

      </div>

      {/* Edit dialog */}
      {trip && (
        <EditTripDialog trip={trip} open={editOpen} onOpenChange={setEditOpen} />
      )}

      {/* Clone vs New Departure dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What would you like to do?</DialogTitle>
            <DialogDescription>Choose the right action for your use case.</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            <button
              className="crm-card"
              style={{
                padding: 16, textAlign: 'left', cursor: 'pointer',
                border: '2px solid transparent', transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--crm-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              onClick={() => {
                setCloneDialogOpen(false);
                router.push(`/departures?create=${id}`);
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} style={{ color: 'var(--crm-accent)' }} />
                Add a new departure
              </div>
              <div style={{ fontSize: 13, color: 'var(--crm-text-3)', lineHeight: 1.4 }}>
                Schedule new dates for this same trip. Use this when you want to run another batch of this trip.
              </div>
            </button>
            <button
              className="crm-card"
              style={{
                padding: 16, textAlign: 'left', cursor: 'pointer',
                border: '2px solid transparent', transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--crm-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              onClick={() => {
                setCloneDialogOpen(false);
                cloneMutation.mutate();
              }}
              disabled={cloneMutation.isPending}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Copy size={16} style={{ color: 'var(--crm-text-2)' }} />
                {cloneMutation.isPending ? 'Cloning...' : 'Clone entire trip'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--crm-text-3)', lineHeight: 1.4 }}>
                Create a copy of this trip template with a new name. Use this when you want a similar but different trip.
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
