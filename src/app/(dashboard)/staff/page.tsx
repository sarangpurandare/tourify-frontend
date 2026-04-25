'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { APIResponse } from '@/types/api';
import type { StaffUser, Role } from '@/types/staff';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, ShieldAlert, Pencil, Crown } from 'lucide-react';

const ASSIGNABLE_ROLES: Role[] = ['admin', 'ops', 'sales', 'viewer'];

function rolePillColor(role: Role) {
  switch (role) {
    case 'owner': return 'var(--crm-amber)';
    case 'admin': return 'var(--crm-red)';
    case 'ops': return 'var(--crm-blue)';
    case 'sales': return 'var(--crm-green)';
    case 'viewer': return 'var(--crm-text-3)';
    default: return 'var(--crm-text-3)';
  }
}

const hashHue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  const hues = ['#0071e3', '#ff9f0a', '#d93775', '#248a3d', '#5856d6', '#007d8a', '#b25000', '#d70015'];
  return hues[Math.abs(h) % hues.length];
};

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StaffPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '' as Role, is_active: true });

  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', phone: '', role: 'viewer' as Role });

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<APIResponse<StaffUser[]>>('/staff'),
    enabled: isOwnerOrAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newStaff) => api.post<APIResponse<StaffUser>>('/staff', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setAddOpen(false);
      setNewStaff({ name: '', email: '', password: '', phone: '', role: 'viewer' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<StaffUser>>(`/staff/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEditOpen(false);
      setEditingStaff(null);
    },
  });

  if (authLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="crm-caption">Loading...</span>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', color: 'var(--crm-text-3)' }}>
        <ShieldAlert size={48} style={{ marginBottom: 16, color: 'var(--crm-text-4)' }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 4 }}>Access Denied</h2>
        <span style={{ fontSize: 13 }}>You need admin or owner privileges to view this page.</span>
      </div>
    );
  }

  const staff = data?.data ?? [];

  function canEditStaff(target: StaffUser): boolean {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.role === 'admin' && target.role !== 'owner') return true;
    return false;
  }

  function openEdit(s: StaffUser) {
    setEditingStaff(s);
    setEditForm({ name: s.name, phone: s.phone || '', role: s.role, is_active: s.is_active });
    setEditOpen(true);
  }

  function handleUpdate() {
    if (!editingStaff) return;
    const body: Record<string, unknown> = {};
    if (editForm.name !== editingStaff.name) body.name = editForm.name;
    if ((editForm.phone || '') !== (editingStaff.phone || '')) body.phone = editForm.phone || null;
    if (editForm.role !== editingStaff.role) body.role = editForm.role;
    if (editForm.is_active !== editingStaff.is_active) body.is_active = editForm.is_active;
    if (Object.keys(body).length === 0) {
      setEditOpen(false);
      return;
    }
    updateMutation.mutate({ id: editingStaff.id, body });
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="crm-page-title">Staff</h1>
          <div className="crm-dim" style={{ fontSize: 13 }}>{staff.length} members</div>
        </div>
        <Button onClick={() => setAddOpen(true)} style={{ gap: 6 }}>
          <Plus size={14} /> Add Staff
        </Button>
      </div>

      {/* Staff cards */}
      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>Loading...</span>
          </div>
        ) : staff.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>No staff members found.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-border)', background: 'var(--crm-bg-2)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Member</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Phone</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Joined</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const color = rolePillColor(s.role);
                const editable = canEditStaff(s);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--crm-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, color: '#fff',
                          background: `linear-gradient(135deg, ${hashHue(s.name)}, color-mix(in oklab, ${hashHue(s.name)} 60%, #000))`,
                        }}>
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {s.name}
                            {s.role === 'owner' && <Crown size={13} style={{ color: 'var(--crm-amber)' }} />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-2)' }}>{s.email}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)' }}>{s.phone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: color + '18', color: color, textTransform: 'capitalize',
                      }}>{s.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.is_active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'var(--crm-green)18', color: 'var(--crm-green)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--crm-green)' }} />Active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'var(--crm-red)18', color: 'var(--crm-red)' }}>Inactive</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 12 }}>{formatDate(s.created_at)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {editable ? (
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)} style={{ gap: 4 }}>
                          <Pencil size={12} /> Edit
                        </Button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Staff dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="crm-caption">Name</label>
              <Input value={newStaff.name} onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="crm-caption">Email</label>
              <Input type="email" value={newStaff.email} onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="crm-caption">Password</label>
              <Input type="password" value={newStaff.password} onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))} placeholder="Temporary password" />
            </div>
            <div>
              <label className="crm-caption">Phone</label>
              <Input value={newStaff.phone} onChange={e => setNewStaff(s => ({ ...s, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="crm-caption">Role</label>
              <Select value={newStaff.role} onValueChange={(val) => setNewStaff(s => ({ ...s, role: (val ?? 'viewer') as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!newStaff.name.trim() || !newStaff.email.trim() || !newStaff.password.trim()) return;
              createMutation.mutate(newStaff);
            }} disabled={createMutation.isPending || !newStaff.name.trim() || !newStaff.email.trim() || !newStaff.password.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Staff — {editingStaff?.name}
              {editingStaff?.role === 'owner' && <Crown size={14} style={{ display: 'inline', marginLeft: 6, color: 'var(--crm-amber)' }} />}
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="crm-caption">Name</label>
              <Input value={editForm.name} onChange={e => setEditForm(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label className="crm-caption">Email</label>
              <Input value={editingStaff?.email ?? ''} disabled style={{ opacity: 0.5 }} />
              <span style={{ fontSize: 10, color: 'var(--crm-text-4)' }}>Email cannot be changed</span>
            </div>
            <div>
              <label className="crm-caption">Phone</label>
              <Input value={editForm.phone} onChange={e => setEditForm(s => ({ ...s, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="crm-caption">Role</label>
                {editingStaff?.role === 'owner' ? (
                  <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--crm-amber)', fontWeight: 500 }}>Owner (cannot change)</div>
                ) : (
                  <Select value={editForm.role} onValueChange={(val) => setEditForm(s => ({ ...s, role: (val ?? s.role) as Role }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="crm-caption">Status</label>
                {editingStaff?.role === 'owner' ? (
                  <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--crm-green)', fontWeight: 500 }}>Always active</div>
                ) : (
                  <Select value={editForm.is_active ? 'active' : 'inactive'} onValueChange={(val) => setEditForm(s => ({ ...s, is_active: val === 'active' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || !editForm.name.trim()}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
