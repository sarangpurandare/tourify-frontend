'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Vendor } from '@/types/vendor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Globe,
  Star,
  Building2,
  UserCircle,
  MessageCircle,
  Trash2,
  Edit3,
} from 'lucide-react';
import { toast } from 'sonner';

const VENDOR_TYPES: Record<string, string> = {
  hotel: 'Hotel',
  transport: 'Transport',
  activity: 'Activity',
  guide: 'Guide',
  restaurant: 'Restaurant',
  airline: 'Airline',
  insurance: 'Insurance',
  visa_agent: 'Visa Agent',
  equipment: 'Equipment',
  photographer: 'Photographer',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  hotel: '#5856d6',
  transport: '#007d8a',
  activity: '#ff9f0a',
  guide: '#34c759',
  restaurant: '#ff6482',
  airline: '#0a84ff',
  insurance: '#8e8e93',
  visa_agent: '#af52de',
  equipment: '#ac8e68',
  photographer: '#ff453a',
  other: '#636366',
};

const EMPTY_VENDOR_FORM = {
  name: '',
  type: '',
  contact_person: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  state: '',
  country: '',
  gst_number: '',
  pan_number: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  website: '',
  notes: '',
  tags: '' as string,
  rating: 0,
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors', search, typeFilter, activeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '200' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (activeFilter === 'active') params.set('is_active', 'true');
      else if (activeFilter === 'inactive') params.set('is_active', 'false');
      return api.get<APIResponse<Vendor[]>>(`/vendors?${params}`);
    },
  });

  const vendors = vendorsData?.data ?? [];
  const totalCount = vendorsData?.meta?.total ?? vendors.length;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<Vendor>>('/vendors', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Vendor created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create vendor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<Vendor>>(`/vendors/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDialogOpen(false);
      setEditingVendor(null);
      resetForm();
      toast.success('Vendor updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update vendor');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deactivated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to deactivate vendor');
    },
  });

  function resetForm() {
    setForm(EMPTY_VENDOR_FORM);
  }

  function openCreateDialog() {
    setEditingVendor(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(vendor: Vendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name || '',
      type: vendor.type || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      whatsapp: vendor.whatsapp || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      country: vendor.country || '',
      gst_number: vendor.gst_number || '',
      pan_number: vendor.pan_number || '',
      bank_name: vendor.bank_name || '',
      bank_account: vendor.bank_account || '',
      bank_ifsc: vendor.bank_ifsc || '',
      website: vendor.website || '',
      notes: vendor.notes || '',
      tags: (vendor.tags ?? []).join(', '),
      rating: vendor.rating ?? 0,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.type) return;

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      contact_person: form.contact_person.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
      gst_number: form.gst_number.trim() || undefined,
      pan_number: form.pan_number.trim() || undefined,
      bank_name: form.bank_name.trim() || undefined,
      bank_account: form.bank_account.trim() || undefined,
      bank_ifsc: form.bank_ifsc.trim() || undefined,
      website: form.website.trim() || undefined,
      notes: form.notes.trim() || undefined,
      rating: form.rating || undefined,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function handleDeactivate(vendor: Vendor) {
    if (!confirm(`Deactivate "${vendor.name}"? They will be hidden from active lists.`)) return;
    deleteMutation.mutate(vendor.id);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 className="crm-title-1" style={{ margin: 0, fontSize: 18 }}>Vendors</h1>
          <span className="crm-caption">{totalCount} vendor{totalCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="crm-sidebar-search" style={{ margin: 0, width: 220 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', font: 'inherit', color: 'var(--crm-text)', width: '100%', fontSize: 13 }}
          />
        </div>
        <Select value={typeFilter || undefined} onValueChange={(val) => setTypeFilter(!val || val === 'all' ? '' : val)}>
          <SelectTrigger style={{ width: 140 }}><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(VENDOR_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(val) => setActiveFilter(val ?? 'all')}>
          <SelectTrigger style={{ width: 120 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <button className="crm-btn primary" onClick={openCreateDialog}>
          <Plus size={14} /> Add Vendor
        </button>
      </div>

      {/* Vendor list */}
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <span className="crm-caption">Loading vendors...</span>
        </div>
      ) : vendors.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Building2 size={40} style={{ color: 'var(--crm-text-disabled)', marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: 'var(--crm-text-2)', marginBottom: 4 }}>No vendors found</div>
          <span className="crm-caption">Add your first vendor to get started.</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', textAlign: 'left' }}>
                <th style={{ padding: '10px 20px', fontWeight: 500 }} className="crm-eyebrow">Name</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">City</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Contact Person</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Phone</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Rating</th>
                <th style={{ padding: '10px 12px', fontWeight: 500, width: 80 }} className="crm-eyebrow">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  onClick={() => openEditDialog(vendor)}
                  style={{
                    borderBottom: '1px solid var(--crm-hairline)',
                    cursor: 'pointer',
                    opacity: vendor.is_active ? 1 : 0.55,
                  }}
                >
                  <td style={{ padding: '10px 20px' }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{vendor.name}</div>
                    {vendor.email && (
                      <div className="crm-caption" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Mail size={10} /> {vendor.email}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      className="crm-pill"
                      style={{
                        fontSize: 11,
                        background: TYPE_COLORS[vendor.type] ?? TYPE_COLORS.other,
                        color: '#fff',
                        border: 'none',
                      }}
                    >
                      {VENDOR_TYPES[vendor.type] ?? vendor.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }} className="crm-caption">
                    {[vendor.city, vendor.state].filter(Boolean).join(', ') || '--'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {vendor.contact_person ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <UserCircle size={12} style={{ color: 'var(--crm-text-3)' }} />
                        {vendor.contact_person}
                      </div>
                    ) : (
                      <span className="crm-caption">--</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {vendor.phone ? (
                      <div className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Phone size={10} /> {vendor.phone}
                      </div>
                    ) : (
                      <span className="crm-caption">--</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {vendor.rating ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StarRating value={vendor.rating} size={12} readonly />
                      </div>
                    ) : (
                      <span className="crm-caption">--</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="crm-btn ghost sm"
                        style={{ padding: 4 }}
                        onClick={() => openEditDialog(vendor)}
                        title="Edit"
                      >
                        <Edit3 size={13} />
                      </button>
                      {vendor.is_active && (
                        <button
                          className="crm-btn ghost sm"
                          style={{ padding: 4, color: 'var(--crm-red)' }}
                          onClick={() => handleDeactivate(vendor)}
                          title="Deactivate"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingVendor(null); }}>
        <DialogContent className="sm:max-w-2xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              {editingVendor ? 'Update vendor details.' : 'Add a new supplier to your vendor list.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Vendor name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={form.type || undefined} onValueChange={(val) => setForm((p) => ({ ...p, type: val ?? '' }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VENDOR_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => setForm((p) => ({ ...p, contact_person: e.target.value }))}
                  placeholder="Primary contact"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="vendor@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="India"
                />
              </div>
            </div>

            {/* Tax & compliance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>GST Number</Label>
                <Input
                  value={form.gst_number}
                  onChange={(e) => setForm((p) => ({ ...p, gst_number: e.target.value }))}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div className="grid gap-2">
                <Label>PAN Number</Label>
                <Input
                  value={form.pan_number}
                  onChange={(e) => setForm((p) => ({ ...p, pan_number: e.target.value }))}
                  placeholder="AAAAA0000A"
                />
              </div>
            </div>

            {/* Bank details */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Bank Name</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                  placeholder="Bank name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Number</Label>
                <Input
                  value={form.bank_account}
                  onChange={(e) => setForm((p) => ({ ...p, bank_account: e.target.value }))}
                  placeholder="Account number"
                />
              </div>
              <div className="grid gap-2">
                <Label>IFSC Code</Label>
                <Input
                  value={form.bank_ifsc}
                  onChange={(e) => setForm((p) => ({ ...p, bank_ifsc: e.target.value }))}
                  placeholder="SBIN0001234"
                />
              </div>
            </div>

            {/* Other */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Tags</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="budget, premium, reliable (comma-separated)"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Rating</Label>
              <StarRating
                value={form.rating}
                onChange={(val) => setForm((p) => ({ ...p, rating: val }))}
                size={24}
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes about this vendor..."
              />
            </div>
          </div>
          <DialogFooter>
            <button
              className="crm-btn ghost"
              onClick={() => { setDialogOpen(false); setEditingVendor(null); }}
            >
              Cancel
            </button>
            <button
              className="crm-btn primary"
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim() || !form.type}
            >
              {isPending
                ? (editingVendor ? 'Saving...' : 'Creating...')
                : (editingVendor ? 'Save Changes' : 'Create Vendor')
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
