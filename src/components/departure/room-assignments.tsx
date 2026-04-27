'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { APIResponse } from '@/types/api';
import type { Booking } from '@/types/booking';
import type { ItineraryDay, ItineraryAccommodation } from '@/types/itinerary';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BedDouble,
  Plus,
  X,
  UserPlus,
  Users,
  StickyNote,
  Hotel,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────── */

interface RoomAssignment {
  id: string;
  departure_id: string;
  accommodation_id: string;
  room_number?: string;
  notes?: string;
  created_at: string;
  member_booking_ids: string[];
}

/* ─── Capacity helper ────────────────────────────── */

function roomCapacity(roomType?: string): number {
  if (!roomType) return 2;
  const lower = roomType.toLowerCase();
  if (lower.includes('single')) return 1;
  if (lower.includes('twin') || lower.includes('double')) return 2;
  if (lower.includes('triple')) return 3;
  if (lower.includes('dorm') || lower.includes('dormitory')) return 6;
  return 2;
}

/* ─── Component ──────────────────────────────────── */

export function RoomAssignments({ departureId }: { departureId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  /* ─── Queries ─────────────────────────────── */

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['departure-rooms', departureId],
    queryFn: () => api.get<APIResponse<RoomAssignment[]>>(`/departures/${departureId}/rooms`),
    enabled: !!departureId,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['departure-bookings', departureId],
    queryFn: () => api.get<APIResponse<Booking[]>>(`/bookings?departure_id=${departureId}&per_page=200`),
    enabled: !!departureId,
  });

  const { data: itineraryData } = useQuery({
    queryKey: ['departures', departureId, 'itinerary'],
    queryFn: () => api.get<APIResponse<ItineraryDay[]>>(`/departures/${departureId}/itinerary`),
    enabled: !!departureId,
  });

  const rooms = roomsData?.data ?? [];
  const bookings = (bookingsData?.data ?? []).filter(b => b.status !== 'cancelled');
  const itinerary = itineraryData?.data ?? [];

  // Flatten all accommodations from itinerary
  const accommodations = useMemo(() => {
    const accs: (ItineraryAccommodation & { day_number: number })[] = [];
    for (const day of itinerary) {
      if (day.accommodation) {
        for (const acc of day.accommodation) {
          accs.push({ ...acc, day_number: day.day_number });
        }
      }
    }
    return accs;
  }, [itinerary]);

  // Build accommodation map for display
  const accommodationMap = useMemo(() => {
    const map: Record<string, { name: string; roomType?: string; dayNumber: number }> = {};
    for (const acc of accommodations) {
      map[acc.id] = {
        name: acc.property_name || 'Unknown Property',
        roomType: acc.room_type,
        dayNumber: acc.day_number,
      };
    }
    return map;
  }, [accommodations]);

  // Compute assigned booking IDs
  const assignedBookingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const room of rooms) {
      for (const bid of room.member_booking_ids) {
        ids.add(bid);
      }
    }
    return ids;
  }, [rooms]);

  // Unassigned bookings
  const unassignedBookings = useMemo(
    () => bookings.filter(b => !assignedBookingIds.has(b.id)),
    [bookings, assignedBookingIds]
  );

  // Booking map for name lookup
  const bookingMap = useMemo(() => {
    const map: Record<string, Booking> = {};
    for (const b of bookings) {
      map[b.id] = b;
    }
    return map;
  }, [bookings]);

  /* ─── Mutations ───────────────────────────── */

  const createRoomMutation = useMutation({
    mutationFn: (body: { accommodation_id: string; room_number?: string; notes?: string }) =>
      api.post(`/departures/${departureId}/rooms`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-rooms', departureId] });
      setCreateOpen(false);
      toast.success('Room created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create room'),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) =>
      api.delete(`/departures/${departureId}/rooms/${roomId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-rooms', departureId] });
      toast.success('Room deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete room'),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ roomId, bookingId }: { roomId: string; bookingId: string }) =>
      api.post(`/departures/${departureId}/rooms/${roomId}/members`, { booking_id: bookingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-rooms', departureId] });
      setAssignOpen(null);
      toast.success('Traveller assigned');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign traveller'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ roomId, bookingId }: { roomId: string; bookingId: string }) =>
      api.delete(`/departures/${departureId}/rooms/${roomId}/members/${bookingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-rooms', departureId] });
      toast.success('Traveller removed');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove traveller'),
  });

  /* ─── Render ──────────────────────────────── */

  if (roomsLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading rooms...</span></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Room Assignments</h3>
          <span className="crm-caption">{rooms.length} rooms &middot; {bookings.length} travellers</span>
        </div>
        <button className="crm-btn primary sm" onClick={() => setCreateOpen(true)} disabled={accommodations.length === 0}>
          <Plus size={13} /> Create Room
        </button>
      </div>

      {accommodations.length === 0 && (
        <div className="crm-card" style={{ padding: '24px 32px', marginBottom: 20, background: 'var(--crm-bg-2)', borderRadius: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hotel size={15} style={{ color: 'var(--crm-text-3)' }} />
            <span>Add accommodation to the itinerary first to create room assignments.</span>
          </div>
        </div>
      )}

      {/* Layout: Unassigned panel + Room grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left: Unassigned */}
        <div>
          <div className="crm-card" style={{ position: 'sticky', top: 20 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={14} style={{ color: 'var(--crm-text-3)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Unassigned</span>
              <span className="crm-caption" style={{ marginLeft: 'auto' }}>{unassignedBookings.length}</span>
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {unassignedBookings.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <span className="crm-caption">All travellers assigned</span>
                </div>
              ) : (
                unassignedBookings.map(b => (
                  <div key={b.id} style={{
                    padding: '10px 16px', borderBottom: '1px solid var(--crm-hairline)',
                    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{b.traveller_name || 'Unknown'}</div>
                      <div className="crm-caption">{b.room_type_preference?.replace('_', ' ') || 'No pref'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Room cards grid */}
        <div>
          {rooms.length === 0 ? (
            <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
              <BedDouble size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No rooms created</div>
              <div className="crm-caption" style={{ marginBottom: 16 }}>Create rooms to start assigning travellers.</div>
              {accommodations.length > 0 && (
                <button className="crm-btn primary" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} /> Create First Room
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {rooms.map(room => {
                const acc = accommodationMap[room.accommodation_id];
                const capacity = roomCapacity(acc?.roomType);
                const memberCount = room.member_booking_ids.length;
                const isFull = memberCount >= capacity;

                return (
                  <div key={room.id} className="crm-card" style={{
                    border: isFull ? '1px solid var(--crm-green)' : '1px solid var(--crm-hairline)',
                    opacity: deleteRoomMutation.isPending ? 0.5 : 1,
                  }}>
                    {/* Room header */}
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--crm-hairline)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BedDouble size={14} />
                          {room.room_number || 'Room'}
                        </div>
                        <div className="crm-caption" style={{ marginTop: 2 }}>
                          {acc?.name || 'Unknown property'}
                          {acc?.dayNumber && <> &middot; Day {acc.dayNumber}</>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* Capacity badge */}
                        <span className={`crm-pill ${isFull ? 'green' : memberCount > 0 ? 'amber' : ''}`} style={{ fontSize: 11 }}>
                          {memberCount}/{capacity}
                        </span>
                        <button
                          className="crm-btn ghost sm"
                          style={{ padding: '4px 6px', color: 'var(--crm-pink)' }}
                          title="Delete room"
                          onClick={() => {
                            if (confirm('Delete this room? Members will become unassigned.')) {
                              deleteRoomMutation.mutate(room.id);
                            }
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Members */}
                    <div style={{ padding: '8px 16px' }}>
                      {room.member_booking_ids.length === 0 ? (
                        <div style={{ padding: '12px 0', textAlign: 'center' }}>
                          <span className="crm-caption">No members</span>
                        </div>
                      ) : (
                        room.member_booking_ids.map(bid => {
                          const booking = bookingMap[bid];
                          return (
                            <div key={bid} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '6px 0', borderBottom: '1px solid var(--crm-hairline)',
                            }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>
                                {booking?.traveller_name || 'Unknown'}
                              </span>
                              <button
                                className="crm-btn ghost sm"
                                style={{ padding: '2px 4px' }}
                                title="Remove from room"
                                onClick={() => removeMemberMutation.mutate({ roomId: room.id, bookingId: bid })}
                                disabled={removeMemberMutation.isPending}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add member button */}
                    {!isFull && unassignedBookings.length > 0 && (
                      <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--crm-hairline)' }}>
                        <button
                          className="crm-btn ghost sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => setAssignOpen(room.id)}
                        >
                          <UserPlus size={12} /> Assign Traveller
                        </button>
                      </div>
                    )}

                    {/* Notes */}
                    {room.notes && (
                      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <StickyNote size={11} style={{ color: 'var(--crm-text-3)', marginTop: 2, flexShrink: 0 }} />
                        <span className="crm-caption" style={{ fontSize: 11 }}>{room.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Room Dialog */}
      <CreateRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        accommodations={accommodations}
        onSubmit={(body) => createRoomMutation.mutate(body)}
        submitting={createRoomMutation.isPending}
      />

      {/* Assign Traveller Dialog */}
      <AssignTravellerDialog
        open={!!assignOpen}
        onOpenChange={(v) => { if (!v) setAssignOpen(null); }}
        unassigned={unassignedBookings}
        onAssign={(bookingId) => {
          if (assignOpen) addMemberMutation.mutate({ roomId: assignOpen, bookingId });
        }}
        submitting={addMemberMutation.isPending}
      />
    </div>
  );
}

/* ─── Create Room Dialog ─────────────────────────── */

function CreateRoomDialog({ open, onOpenChange, accommodations, onSubmit, submitting }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accommodations: (ItineraryAccommodation & { day_number: number })[];
  onSubmit: (body: { accommodation_id: string; room_number?: string; notes?: string }) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({ accommodation_id: '', room_number: '', notes: '' });

  function handleSubmit() {
    if (!form.accommodation_id) return;
    onSubmit({
      accommodation_id: form.accommodation_id,
      room_number: form.room_number || undefined,
      notes: form.notes || undefined,
    });
    setForm({ accommodation_id: '', room_number: '', notes: '' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Room</DialogTitle>
          <DialogDescription>Add a room assignment for this departure.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Accommodation *</Label>
            <Select value={form.accommodation_id} onValueChange={(v) => { if (v) setForm(p => ({ ...p, accommodation_id: v })); }}>
              <SelectTrigger><SelectValue placeholder="Select accommodation" /></SelectTrigger>
              <SelectContent>
                {accommodations.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    Day {acc.day_number} - {acc.property_name || 'Unknown'} {acc.room_type ? `(${acc.room_type})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Room Number / Label</Label>
            <Input
              value={form.room_number}
              onChange={(e) => setForm(p => ({ ...p, room_number: e.target.value }))}
              placeholder="e.g. 101, A, Tent 1"
            />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
                border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
                color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical',
              }}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <button className="crm-btn primary" onClick={handleSubmit} disabled={submitting || !form.accommodation_id}>
            {submitting ? 'Creating...' : 'Create Room'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Assign Traveller Dialog ────────────────────── */

function AssignTravellerDialog({ open, onOpenChange, unassigned, onAssign, submitting }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unassigned: Booking[];
  onAssign: (bookingId: string) => void;
  submitting: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return unassigned;
    const lower = search.toLowerCase();
    return unassigned.filter(b => (b.traveller_name || '').toLowerCase().includes(lower));
  }, [unassigned, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Traveller</DialogTitle>
          <DialogDescription>Select a traveller to add to this room.</DialogDescription>
        </DialogHeader>
        <div style={{ padding: '8px 0' }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search travellers..."
            style={{ marginBottom: 12 }}
          />
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <span className="crm-caption">No unassigned travellers found</span>
              </div>
            ) : (
              filtered.map(b => (
                <button
                  key={b.id}
                  className="crm-btn ghost"
                  style={{
                    width: '100%', justifyContent: 'flex-start', padding: '10px 12px',
                    borderBottom: '1px solid var(--crm-hairline)', borderRadius: 0,
                  }}
                  onClick={() => onAssign(b.id)}
                  disabled={submitting}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{b.traveller_name || 'Unknown'}</div>
                    <div className="crm-caption">{b.room_type_preference?.replace('_', ' ') || 'No preference'}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
