'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Group, GroupMembership } from '@/types/group';
import type { Traveller } from '@/types/traveller';
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
import { ArrowLeft, Plus, Star, Trash2 } from 'lucide-react';
import { EntitySearch } from '@/components/entity-search';

const GROUP_TYPES = ['family', 'friends', 'couple', 'corporate'] as const;
const COMM_PREFERENCES = ['primary_only', 'all'] as const;

function typePillColor(type: string) {
  switch (type) {
    case 'family': return 'purple';
    case 'friends': return 'blue';
    case 'couple': return 'pink';
    case 'corporate': return 'teal';
    default: return '';
  }
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', type: '', comm_preference: '' });

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberTravellerId, setNewMemberTravellerId] = useState('');
  const [newMemberIsCoordinator, setNewMemberIsCoordinator] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => api.get<APIResponse<Group>>(`/groups/${groupId}`),
    enabled: !!groupId,
  });

  const group = data?.data;

  const { data: travellersData } = useQuery({
    queryKey: ['travellers-for-group'],
    queryFn: () => api.get<APIResponse<Traveller[]>>('/travellers?per_page=200'),
    enabled: addMemberOpen,
  });
  const allTravellers = travellersData?.data ?? [];
  const existingMemberIds = new Set(group?.members?.map(m => m.traveller_id) ?? []);
  const availableTravellers = allTravellers.filter(t => !existingMemberIds.has(t.id));

  const updateMutation = useMutation({
    mutationFn: (body: { name: string; type: string; comm_preference: string }) =>
      api.put<APIResponse<Group>>(`/groups/${groupId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      setEditing(false);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (body: { traveller_id: string; is_primary_coordinator: boolean }) =>
      api.post<APIResponse<GroupMembership>>(`/groups/${groupId}/members`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      setAddMemberOpen(false);
      setNewMemberTravellerId('');
      setNewMemberIsCoordinator(false);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (travellerId: string) =>
      api.delete<APIResponse<null>>(`/groups/${groupId}/members/${travellerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  function startEditing() {
    if (!group) return;
    setEditForm({ name: group.name, type: group.type, comm_preference: group.comm_preference });
    setEditing(true);
  }

  function handleSave() {
    if (!editForm.name.trim()) return;
    updateMutation.mutate(editForm);
  }

  function handleAddMember() {
    if (!newMemberTravellerId.trim()) return;
    addMemberMutation.mutate({
      traveller_id: newMemberTravellerId.trim(),
      is_primary_coordinator: newMemberIsCoordinator,
    });
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="crm-caption">Loading...</span>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="crm-caption">Group not found.</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="crm-btn ghost" onClick={() => router.push('/groups')} style={{ padding: '0 8px' }}>
          <ArrowLeft size={16} />
        </button>
        <h1 className="crm-title-1">{group.name}</h1>
        <span className={`crm-pill ${typePillColor(group.type)}`}>{group.type}</span>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Group Details */}
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3>Group Details</h3>
            {!editing ? (
              <button className="crm-btn ghost sm" onClick={startEditing}>Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="crm-btn sm" onClick={() => setEditing(false)}>Cancel</button>
                <button className="crm-btn primary sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          <div style={{ padding: 20 }}>
            {editing ? (
              <div style={{ display: 'grid', gap: 16, maxWidth: 400 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <Label>Type</Label>
                  <Select value={editForm.type} onValueChange={(val) => val !== null && setEditForm((prev) => ({ ...prev, type: val }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <Label>Communication Preference</Label>
                  <Select value={editForm.comm_preference} onValueChange={(val) => val !== null && setEditForm((prev) => ({ ...prev, comm_preference: val }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMM_PREFERENCES.map((c) => (
                        <SelectItem key={c} value={c}>{c === 'primary_only' ? 'Primary Only' : 'All'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div>
                  <div className="crm-caption" style={{ marginBottom: 4 }}>Name</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{group.name}</div>
                </div>
                <div>
                  <div className="crm-caption" style={{ marginBottom: 4 }}>Type</div>
                  <span className={`crm-pill ${typePillColor(group.type)}`}>{group.type}</span>
                </div>
                <div>
                  <div className="crm-caption" style={{ marginBottom: 4 }}>Permanent</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{group.is_permanent ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="crm-caption" style={{ marginBottom: 4 }}>Communication</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {group.comm_preference === 'primary_only' ? 'Primary Only' : 'All'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3>Members</h3>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger
                render={
                  <button className="crm-btn primary sm">
                    <Plus size={13} />
                    Add Member
                  </button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                  <DialogDescription>Add a traveller to this group.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Traveller</Label>
                    <EntitySearch
                      options={availableTravellers.map(t => ({
                        id: t.id,
                        label: t.full_legal_name,
                        sublabel: [t.city, t.phone, t.email].filter(Boolean).join(' · '),
                        initials: t.full_legal_name.split(' ').map(w => w[0]).join('').slice(0, 2),
                      }))}
                      value={newMemberTravellerId}
                      onChange={(id) => setNewMemberTravellerId(id)}
                      placeholder="Search travellers…"
                      emptyMessage="No travellers available"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id="is-coordinator"
                      type="checkbox"
                      checked={newMemberIsCoordinator}
                      onChange={(e) => setNewMemberIsCoordinator(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <Label htmlFor="is-coordinator">Primary coordinator</Label>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleAddMember}
                    disabled={addMemberMutation.isPending || !newMemberTravellerId.trim()}
                  >
                    {addMemberMutation.isPending ? 'Adding...' : 'Add'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {(!group.members || group.members.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <span className="crm-caption">No members in this group yet.</span>
            </div>
          ) : (
            <>
              <div className="crm-row hd" style={{ gridTemplateColumns: '1fr 100px 80px' }}>
                <span>Traveller</span>
                <span>Coordinator</span>
                <span>Actions</span>
              </div>
              {group.members.map((member) => (
                <div key={member.id} className="crm-row" style={{ gridTemplateColumns: '1fr 100px 80px' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {member.traveller_name || member.traveller_id}
                  </span>
                  <span>
                    {member.is_primary_coordinator && (
                      <Star size={14} style={{ color: 'var(--crm-amber)', fill: 'var(--crm-amber)' }} />
                    )}
                  </span>
                  <span>
                    <button
                      className="crm-btn ghost sm"
                      onClick={() => {
                        if (!window.confirm('Remove this member from the group?')) return;
                        removeMemberMutation.mutate(member.traveller_id);
                      }}
                      disabled={removeMemberMutation.isPending}
                      style={{ padding: '0 6px', color: 'var(--crm-red)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
