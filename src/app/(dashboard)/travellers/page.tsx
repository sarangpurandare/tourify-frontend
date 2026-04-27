'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Traveller, VisaRecord, EmergencyContact, CoTraveller } from '@/types/traveller';
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
import type { Group } from '@/types/group';
import { FileUpload } from '@/components/ui/file-upload';
import { Search, AlertTriangle, FileText, Plus, Trash2, UserPlus, Phone, Users, Star, AtSign, Calendar, Heart, Gift, Cake, MapPin, Upload, Download, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

/* ─── CSV Import helpers ────────────────────────── */

const CSV_COLUMNS = [
  'full_legal_name', 'preferred_name', 'email', 'phone', 'dob', 'gender',
  'city', 'country', 'nationality', 'passport_number', 'passport_issuing_country',
  'passport_expiry_date', 'passport_place_of_issue', 'dietary', 'blood_group',
  'allergies', 'medical_conditions', 'instagram_handle', 'internal_notes', 'tags',
];

function downloadTemplate() {
  const header = CSV_COLUMNS.join(',');
  const example = [
    'Priya Sharma', 'Priya', 'priya@example.com', '+919876543210', '1990-05-15', 'female',
    'Mumbai', 'India', 'Indian', 'J1234567', 'India',
    '2028-05-15', 'Mumbai', 'vegetarian', 'B+',
    'Peanuts', '', '@priyasharma', 'VIP guest', 'VIP',
  ].join(',');
  const csv = header + '\n' + example + '\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'travellers_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (values[i]?.trim()) row[h] = values[i].trim(); });
    return row;
  }).filter(r => Object.keys(r).length > 0);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

function csvRowToPayload(row: Record<string, string>) {
  const p: Record<string, unknown> = { full_legal_name: row.full_legal_name || row.name || '' };
  const strFields = [
    'preferred_name', 'email', 'phone', 'dob', 'gender', 'city', 'country', 'nationality',
    'passport_number', 'passport_issuing_country', 'passport_expiry_date', 'passport_issue_date',
    'passport_place_of_issue', 'dietary', 'blood_group', 'instagram_handle', 'internal_notes',
    'marital_status', 'whatsapp', 'address', 'pan', 'seat_preference', 'berth_preference',
    'roommate_preference', 'tshirt_size', 'jacket_size', 'adventure_experience', 'referral_source',
    'insurance_provider', 'insurance_number', 'insurance_valid_from', 'insurance_valid_to', 'anniversary',
  ];
  for (const f of strFields) {
    if (row[f]) p[f] = row[f];
  }
  if (row.allergies) p.allergies = row.allergies.split(';').map(s => s.trim()).filter(Boolean);
  if (row.medical_conditions) p.medical_conditions = row.medical_conditions.split(';').map(s => s.trim()).filter(Boolean);
  if (row.medications) p.medications = row.medications.split(';').map(s => s.trim()).filter(Boolean);
  if (row.fears) p.fears = row.fears.split(';').map(s => s.trim()).filter(Boolean);
  if (row.tags) p.tags = row.tags.split(';').map(s => s.trim()).filter(Boolean);
  if (row.fitness_level) p.fitness_level = parseInt(row.fitness_level);
  return p;
}

/* ─── Avatar color hash ──────────────────────────── */
const hashHue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  const hues = ['#0071e3', '#ff9f0a', '#d93775', '#248a3d', '#5856d6', '#007d8a', '#b25000', '#d70015'];
  return hues[Math.abs(h) % hues.length];
};

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Helpers ────────────────────────────────────── */
function tagColor(tag: string): string {
  if (tag === 'VIP') return 'amber';
  if (tag === 'Repeat') return 'purple';
  if (tag === 'Referrer') return 'pink';
  return '';
}

function isPassportExpiringSoon(expiry?: string): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return exp <= sixMonths;
}

function isVisaActive(v: VisaRecord): boolean {
  if (!v.validity_to) return true;
  return new Date(v.validity_to) > new Date();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateFull(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/* ─── Empty form state ───────────────────────────── */
const EMPTY_TRAVELLER_FORM = {
  full_legal_name: '',
  preferred_name: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  dob: '',
  gender: '',
};

const EMPTY_VISA_FORM = {
  country: '',
  visa_type: '',
  validity_from: '',
  validity_to: '',
  entry_type: '',
};

const EMPTY_CONTACT_FORM = {
  name: '',
  relation: '',
  phone: '',
  priority: 1,
};

/* ─── Main component ─────────────────────────────── */
export default function TravellersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPassportOpen, setEditPassportOpen] = useState(false);
  const [addVisaOpen, setAddVisaOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editPrefsOpen, setEditPrefsOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [importResult, setImportResult] = useState<{ created: number; failed: number; total: number; errors: { row: number; name: string; message: string }[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [addAsCoordinator, setAddAsCoordinator] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: '', type: 'family', comm_preference: 'primary_only' });

  // Form state
  const [newTraveller, setNewTraveller] = useState(EMPTY_TRAVELLER_FORM);
  const [editForm, setEditForm] = useState<Partial<Traveller>>({});
  const [passportForm, setPassportForm] = useState<Partial<Traveller>>({});
  const [prefsForm, setPrefsForm] = useState<Partial<Traveller>>({});
  const [visaForm, setVisaForm] = useState(EMPTY_VISA_FORM);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);

  /* ─── Queries ──────────────────────────────────── */
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['travellers', search],
    queryFn: () => api.get<APIResponse<Traveller[]>>(`/travellers?search=${encodeURIComponent(search)}&per_page=100`),
  });

  const travellers = listData?.data ?? [];

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['traveller', selectedId],
    queryFn: () => api.get<APIResponse<Traveller>>(`/travellers/${selectedId}`),
    enabled: !!selectedId,
  });

  const { data: visasData, isLoading: visasLoading } = useQuery({
    queryKey: ['traveller-visas', selectedId],
    queryFn: () => api.get<APIResponse<VisaRecord[]>>(`/travellers/${selectedId}/visas`),
    enabled: !!selectedId,
  });

  const { data: groupsData } = useQuery({
    queryKey: ['traveller-groups', selectedId],
    queryFn: () => api.get<APIResponse<Group[]>>(`/travellers/${selectedId}/groups`),
    enabled: !!selectedId,
  });

  const { data: coTravellersData } = useQuery({
    queryKey: ['traveller-co-travellers', selectedId],
    queryFn: () => api.get<APIResponse<CoTraveller[]>>(`/travellers/${selectedId}/co-travellers`),
    enabled: !!selectedId,
  });

  const { data: allGroupsData } = useQuery({
    queryKey: ['all-groups-for-add'],
    queryFn: () => api.get<APIResponse<{ id: string; name: string; type: string }[]>>('/groups?per_page=200'),
    enabled: addToGroupOpen,
  });

  const selected = detailData?.data ?? null;
  const visas = visasData?.data ?? [];
  const travellerGroups = groupsData?.data ?? [];
  const coTravellers = coTravellersData?.data ?? [];
  const allGroups = (allGroupsData?.data ?? []).filter((g: { id: string }) => !travellerGroups.some(tg => tg.id === g.id));

  // Auto-select first when list loads and nothing is selected
  useEffect(() => {
    if (!selectedId && travellers.length > 0) {
      setSelectedId(travellers[0].id);
    }
  }, [selectedId, travellers]);

  /* ─── Mutations ────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: (body: typeof newTraveller) =>
      api.post<APIResponse<Traveller>>('/travellers', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['travellers'] });
      setAddDialogOpen(false);
      setNewTraveller(EMPTY_TRAVELLER_FORM);
      setSelectedId(res.data.id);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put<APIResponse<Traveller>>(`/travellers/${selectedId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['travellers'] });
      setEditDialogOpen(false);
      setEditPassportOpen(false);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const addVisaMutation = useMutation({
    mutationFn: (body: typeof visaForm) =>
      api.post<APIResponse<VisaRecord>>(`/travellers/${selectedId}/visas`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-visas', selectedId] });
      setAddVisaOpen(false);
      setVisaForm(EMPTY_VISA_FORM);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const deleteVisaMutation = useMutation({
    mutationFn: (visaId: string) =>
      api.delete<APIResponse<null>>(`/travellers/${selectedId}/visas/${visaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-visas', selectedId] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (body: typeof contactForm) =>
      api.post<APIResponse<EmergencyContact>>(`/travellers/${selectedId}/emergency-contacts`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller', selectedId] });
      setAddContactOpen(false);
      setContactForm(EMPTY_CONTACT_FORM);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) =>
      api.delete<APIResponse<null>>(`/travellers/${selectedId}/emergency-contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller', selectedId] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const addToGroupMutation = useMutation({
    mutationFn: (body: { groupId: string; traveller_id: string; is_primary_coordinator: boolean }) =>
      api.post<APIResponse<unknown>>(`/groups/${body.groupId}/members`, { traveller_id: body.traveller_id, is_primary_coordinator: body.is_primary_coordinator }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-groups', selectedId] });
      setAddToGroupOpen(false);
      setSelectedGroupId('');
      setAddAsCoordinator(false);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (body: { name: string; type: string; comm_preference: string }) => {
      const res = await api.post<APIResponse<{ id: string }>>('/groups', body);
      await api.post(`/groups/${res.data.id}/members`, { traveller_id: selectedId, is_primary_coordinator: true });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-groups', selectedId] });
      setCreateGroupOpen(false);
      setNewGroupForm({ name: '', type: 'family', comm_preference: 'primary_only' });
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  /* ─── Handlers ─────────────────────────────────── */
  function handleCreate() {
    if (!newTraveller.full_legal_name.trim()) return;
    createMutation.mutate(newTraveller);
  }

  function openEdit() {
    if (!selected) return;
    setEditForm({
      full_legal_name: selected.full_legal_name,
      preferred_name: selected.preferred_name ?? '',
      email: selected.email ?? '',
      phone: selected.phone ?? '',
      city: selected.city ?? '',
      country: selected.country ?? '',
      dob: selected.dob ?? '',
      gender: selected.gender ?? '',
      nationality: selected.nationality ?? '',
      marital_status: selected.marital_status ?? '',
      tags: selected.tags ?? [],
      anniversary: selected.anniversary ?? '',
      instagram_handle: selected.instagram_handle ?? '',
      nps_score: selected.nps_score,
      referral_source: selected.referral_source ?? '',
      internal_notes: selected.internal_notes ?? '',
    });
    setEditDialogOpen(true);
  }

  function openPassportEdit() {
    if (!selected) return;
    setPassportForm({
      passport_number: selected.passport_number ?? '',
      passport_issuing_country: selected.passport_issuing_country ?? '',
      passport_expiry_date: selected.passport_expiry_date ?? '',
      passport_place_of_issue: selected.passport_place_of_issue ?? '',
      passport_issue_date: selected.passport_issue_date ?? '',
    });
    setEditPassportOpen(true);
  }

  function mergeWithSelected(partial: Partial<Traveller>): Record<string, unknown> {
    if (!selected) return partial;
    const allowedFields = [
      'full_legal_name', 'preferred_name', 'dob', 'gender', 'nationality', 'marital_status',
      'phone', 'whatsapp', 'email', 'address', 'city', 'country',
      'passport_number', 'passport_issuing_country', 'passport_issue_date', 'passport_expiry_date',
      'passport_place_of_issue', 'passport_front_url', 'passport_back_url',
      'pan', 'aadhaar_masked', 'driving_license', 'oci_card',
      'seat_preference', 'berth_preference', 'roommate_preference',
      'dietary', 'allergies', 'alcohol', 'medical_conditions', 'medications', 'blood_group',
      'insurance_provider', 'insurance_number', 'insurance_valid_from', 'insurance_valid_to',
      'fitness_level', 'adventure_experience', 'fears', 'tshirt_size', 'jacket_size',
      'instagram_handle', 'referral_source', 'referred_by_id', 'internal_notes', 'tags', 'anniversary',
      'nps_score',
    ] as const;
    const merged: Record<string, unknown> = {};
    const source = { ...selected, ...partial } as Record<string, unknown>;
    for (const key of allowedFields) {
      if (key in source && source[key] !== undefined) {
        merged[key] = source[key];
      }
    }
    const dateFields = ['dob', 'passport_issue_date', 'passport_expiry_date', 'insurance_valid_from', 'insurance_valid_to', 'anniversary'];
    for (const f of dateFields) {
      const v = merged[f];
      if (typeof v === 'string' && v.length > 10) {
        merged[f] = v.slice(0, 10);
      }
    }
    return merged;
  }

  function handleSaveEdit() {
    updateMutation.mutate(mergeWithSelected(editForm));
  }

  function handleSavePassport() {
    updateMutation.mutate(mergeWithSelected(passportForm));
  }

  function openPrefsEdit() {
    if (!selected) return;
    setPrefsForm({
      dietary: selected.dietary ?? '',
      allergies: selected.allergies ?? [],
      alcohol: selected.alcohol,
      blood_group: selected.blood_group ?? '',
      medical_conditions: selected.medical_conditions ?? [],
      medications: selected.medications ?? [],
      fears: selected.fears ?? [],
      seat_preference: selected.seat_preference ?? '',
      berth_preference: selected.berth_preference ?? '',
      roommate_preference: selected.roommate_preference ?? '',
      tshirt_size: selected.tshirt_size ?? '',
      jacket_size: selected.jacket_size ?? '',
      insurance_provider: selected.insurance_provider ?? '',
      insurance_number: selected.insurance_number ?? '',
      insurance_valid_from: selected.insurance_valid_from ?? '',
      insurance_valid_to: selected.insurance_valid_to ?? '',
      fitness_level: selected.fitness_level,
      adventure_experience: selected.adventure_experience ?? '',
    } as Partial<Traveller>);
    setEditPrefsOpen(true);
  }

  function handleSavePrefs() {
    updateMutation.mutate(mergeWithSelected(prefsForm));
    setEditPrefsOpen(false);
  }

  const updateTravellerField = async (field: string, value: string | null) => {
    if (!selectedId || !selected) return;
    const body = mergeWithSelected({ [field]: value } as Partial<Traveller>);
    await api.put(`/travellers/${selectedId}`, body);
    queryClient.invalidateQueries({ queryKey: ['travellers'] });
    queryClient.invalidateQueries({ queryKey: ['traveller', selectedId] });
  };

  function handleAddVisa() {
    if (!visaForm.country.trim()) return;
    addVisaMutation.mutate(visaForm);
  }

  function handleAddContact() {
    if (!contactForm.name.trim() || !contactForm.phone.trim()) return;
    addContactMutation.mutate(contactForm);
  }

  const handleCsvUpload = useCallback(async (file: File) => {
    setImportState('uploading');
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setImportResult({ created: 0, failed: 0, total: 0, errors: [{ row: 0, name: '', message: 'No valid rows found in CSV' }] });
        setImportState('done');
        return;
      }
      const payloads = rows.map(csvRowToPayload);
      const res = await api.post<{ data: { created: number; failed: number; total: number; errors: { row: number; name: string; message: string }[] } }>('/travellers/bulk', payloads);
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['travellers'] });
    } catch (e: unknown) {
      setImportResult({ created: 0, failed: 1, total: 0, errors: [{ row: 0, name: '', message: e instanceof Error ? e.message : 'Upload failed' }] });
    }
    setImportState('done');
  }, [queryClient]);

  const activeVisas = visas.filter((v) => isVisaActive(v)).length;
  const contacts = selected?.emergency_contacts ?? [];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ───── Left panel ───── */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--crm-hairline)',
          background: 'var(--crm-bg-sidebar)',
          overflow: 'hidden',
        }}
      >
        {/* Search + Add */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <div className="crm-sidebar-search" style={{ margin: 0, flex: 1 }}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search travellers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  font: 'inherit',
                  color: 'var(--crm-text)',
                  width: '100%',
                  fontSize: 13,
                }}
              />
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger
                render={
                  <button className="crm-btn primary" style={{ padding: '0 10px', flexShrink: 0 }}>
                    <Plus size={14} />
                  </button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Traveller</DialogTitle>
                  <DialogDescription>Create a new traveller record.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-name">Full Legal Name *</Label>
                    <Input
                      id="new-name"
                      value={newTraveller.full_legal_name}
                      onChange={(e) => setNewTraveller((p) => ({ ...p, full_legal_name: e.target.value }))}
                      placeholder="As on passport"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-pref">Preferred Name</Label>
                      <Input
                        id="new-pref"
                        value={newTraveller.preferred_name}
                        onChange={(e) => setNewTraveller((p) => ({ ...p, preferred_name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-gender">Gender</Label>
                      <Select
                        value={newTraveller.gender || undefined}
                        onValueChange={(val) => val !== null && setNewTraveller((p) => ({ ...p, gender: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-email">Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newTraveller.email}
                        onChange={(e) => setNewTraveller((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-phone">Phone</Label>
                      <Input
                        id="new-phone"
                        value={newTraveller.phone}
                        onChange={(e) => setNewTraveller((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-city">City</Label>
                      <Input
                        id="new-city"
                        value={newTraveller.city}
                        onChange={(e) => setNewTraveller((p) => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-country">Country</Label>
                      <Input
                        id="new-country"
                        value={newTraveller.country}
                        onChange={(e) => setNewTraveller((p) => ({ ...p, country: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-dob">Date of Birth</Label>
                    <Input
                      id="new-dob"
                      type="date"
                      value={newTraveller.dob}
                      onChange={(e) => setNewTraveller((p) => ({ ...p, dob: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !newTraveller.full_legal_name.trim()}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <button
              className="crm-btn"
              style={{ padding: '0 10px', flexShrink: 0 }}
              onClick={() => { setImportOpen(true); setImportState('idle'); setImportResult(null); }}
              title="Import CSV"
            >
              <Upload size={14} />
            </button>
          </div>
          <div className="crm-caption" style={{ padding: '8px 4px 6px', fontSize: 11.5 }}>
            {listLoading ? 'Loading...' : `${travellers.length} travellers`}
          </div>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 12px' }}>
          {listLoading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <span className="crm-caption">Loading...</span>
            </div>
          ) : travellers.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <span className="crm-caption">No travellers found</span>
            </div>
          ) : (
            travellers.map((t) => {
              const isActive = t.id === selectedId;
              const initials = getInitials(t.preferred_name || t.full_legal_name);
              const displayName = t.preferred_name || t.full_legal_name;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--crm-radius-sm)',
                    cursor: 'default',
                    userSelect: 'none',
                    background: isActive ? 'var(--crm-accent-bg)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--crm-accent)' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--crm-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {t.passport_front_url ? (
                    <div className="crm-avatar sm" style={{ padding: 0, overflow: 'hidden' }}>
                      <img src={t.passport_front_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div
                      className="crm-avatar sm"
                      style={{
                        background: `linear-gradient(135deg, ${hashHue(t.full_legal_name)}, ${hashHue(initials)})`,
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--crm-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {displayName}
                      {isPassportExpiringSoon(t.passport_expiry_date) && (
                        <AlertTriangle
                          size={12}
                          style={{ marginLeft: 4, color: 'var(--crm-amber)', verticalAlign: '-1px' }}
                        />
                      )}
                    </div>
                    <div className="crm-caption" style={{ fontSize: 11.5 }}>
                      {t.city || t.country || 'No location'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ───── Right panel ───── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!selectedId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--crm-text-3)' }}>
            <UserPlus size={48} style={{ marginBottom: 16, color: 'var(--crm-text-4)' }} />
            <span className="crm-caption">Select a traveller to view details</span>
          </div>
        ) : detailLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-caption">Loading traveller...</span>
          </div>
        ) : !selected ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-caption">Traveller not found</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
              {selected.passport_front_url ? (
                <div className="crm-avatar lg" style={{ padding: 0, overflow: 'hidden' }}>
                  <img src={selected.passport_front_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div
                  className="crm-avatar lg"
                  style={{
                    background: `linear-gradient(135deg, ${hashHue(selected.full_legal_name)}, ${hashHue(getInitials(selected.full_legal_name))})`,
                  }}
                >
                  {getInitials(selected.preferred_name || selected.full_legal_name)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h1 className="crm-title-1" style={{ margin: 0 }}>
                    {selected.preferred_name || selected.full_legal_name}
                  </h1>
                  {(selected.tags ?? []).map((tag) => (
                    <span key={tag} className={`crm-pill ${tagColor(tag)}`}>
                      <span className="dot" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="crm-dim" style={{ fontSize: 13, marginTop: 4 }}>
                  {[selected.city, selected.country].filter(Boolean).join(', ') || 'No location'}
                  {selected.dob && ` · Age ${Math.floor((Date.now() - new Date(selected.dob).getTime()) / 31557600000)}`}
                  {selected.gender && ` · ${selected.gender.charAt(0).toUpperCase() + selected.gender.slice(1)}`}
                  {selected.nationality && ` · ${selected.nationality}`}
                </div>
                <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
                  {selected.email && <span>{selected.email}</span>}
                  {selected.phone && <span>{selected.email ? ' · ' : ''}{selected.phone}</span>}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                {selected.fitness_level != null && (
                  <div style={{ textAlign: 'right' }}>
                    <div className="crm-eyebrow">Fitness</div>
                    <div className="crm-title-3 crm-tabular" style={{ marginTop: 2 }}>{selected.fitness_level}/10</div>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div className="crm-eyebrow">Status</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`crm-pill ${selected.status === 'active' ? 'green' : ''}`}>{selected.status}</span>
                  </div>
                </div>
              </div>

              <button className="crm-btn ghost sm" onClick={openEdit}>Edit</button>
            </div>

            {/* 2-column grid of cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* ── Card 1: Passport & identity ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Passport &amp; identity</h3>
                  <button className="crm-btn ghost sm" onClick={openPassportEdit}>Edit</button>
                </div>
                <div className="crm-card-pad">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Passport no.</div>
                      <div className="crm-mono">{selected.passport_number || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Country</div>
                      <div style={{ fontSize: 13.5 }}>{selected.passport_issuing_country || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Expiry</div>
                      <div style={{ fontSize: 13.5, color: isPassportExpiringSoon(selected.passport_expiry_date) ? 'var(--crm-red)' : undefined }}>
                        {formatDate(selected.passport_expiry_date)}
                        {isPassportExpiringSoon(selected.passport_expiry_date) && (
                          <AlertTriangle size={12} style={{ marginLeft: 4, verticalAlign: '-1px' }} />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Place of issue</div>
                      <div style={{ fontSize: 13.5 }}>{selected.passport_place_of_issue || '--'}</div>
                    </div>
                  </div>

                  <div className="crm-sep-h" style={{ margin: '16px 0' }} />

                  <div className="crm-eyebrow" style={{ marginBottom: 10 }}>Scans</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FileUpload
                      value={selected.passport_front_url}
                      onChange={(url) => updateTravellerField('passport_front_url', url)}
                      accept="image/*,.pdf"
                      label="Front"
                      compact
                    />
                    <FileUpload
                      value={selected.passport_back_url}
                      onChange={(url) => updateTravellerField('passport_back_url', url)}
                      accept="image/*,.pdf"
                      label="Back"
                      compact
                    />
                  </div>
                </div>
              </div>

              {/* ── Card 2: Visa library ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Visa library</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {activeVisas > 0 && (
                      <span className="crm-pill blue">{activeVisas} active</span>
                    )}
                    <button className="crm-btn ghost sm" onClick={() => setAddVisaOpen(true)}>
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
                <div>
                  {visasLoading ? (
                    <div className="crm-card-pad" style={{ textAlign: 'center' }}>
                      <span className="crm-caption">Loading...</span>
                    </div>
                  ) : visas.length === 0 ? (
                    <div className="crm-card-pad" style={{ textAlign: 'center' }}>
                      <span className="crm-dim" style={{ fontSize: 13 }}>No visa records</span>
                    </div>
                  ) : (
                    visas.map((v, i) => {
                      const active = isVisaActive(v);
                      return (
                        <div
                          key={v.id}
                          style={{
                            padding: '10px 20px',
                            borderTop: i > 0 ? '1px solid var(--crm-hairline)' : undefined,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.country}</div>
                              <div className="crm-caption">{v.visa_type || 'Tourist'}</div>
                              <div className="crm-caption">{formatDate(v.validity_from)} -- {formatDate(v.validity_to)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`crm-pill ${active ? 'green' : 'amber'}`}>
                                <span className="dot" />
                                {active ? 'Active' : 'Expired'}
                              </span>
                              <button
                                className="crm-btn ghost sm"
                                onClick={() => deleteVisaMutation.mutate(v.id)}
                                style={{ padding: 4, color: 'var(--crm-text-3)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <FileUpload
                              value={v.visa_scan_url}
                              onChange={async (url) => {
                                await api.put(`/travellers/${selectedId}/visas/${v.id}`, { ...v, visa_scan_url: url });
                                queryClient.invalidateQueries({ queryKey: ['traveller-visas', selectedId] });
                              }}
                              accept="image/*,.pdf"
                              label="Visa scan"
                              compact
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Card 3: Preferences & medical ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Preferences &amp; medical</h3>
                  <button className="crm-btn ghost sm" onClick={openPrefsEdit}>Edit</button>
                </div>
                <div className="crm-card-pad">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Diet</div>
                      <span className="crm-pill">{selected.dietary || '--'}</span>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Alcohol</div>
                      <div style={{ fontSize: 13.5 }}>{selected.alcohol === true ? 'Yes' : selected.alcohol === false ? 'No' : '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Allergies</div>
                      <div style={{ fontSize: 13.5 }}>
                        {selected.allergies?.length ? (
                          <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {selected.allergies.map((a) => <span key={a} className="crm-pill amber">{a}</span>)}
                          </span>
                        ) : 'None'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Blood group</div>
                      <div style={{ fontSize: 13.5 }}>{selected.blood_group || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Medical</div>
                      <div style={{ fontSize: 13.5 }}>
                        {selected.medical_conditions?.length ? selected.medical_conditions.join(', ') : 'None'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Medications</div>
                      <div style={{ fontSize: 13.5 }}>
                        {selected.medications?.length ? selected.medications.join(', ') : 'None'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Seat</div>
                      <div style={{ fontSize: 13.5 }}>{selected.seat_preference || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Roommate</div>
                      <div style={{ fontSize: 13.5 }}>{selected.roommate_preference || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>T-shirt size</div>
                      <div style={{ fontSize: 13.5 }}>{selected.tshirt_size || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Insurance</div>
                      <div style={{ fontSize: 13.5 }}>{selected.insurance_provider || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Adventure</div>
                      <div style={{ fontSize: 13.5 }}>{selected.adventure_experience || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Fears</div>
                      <div style={{ fontSize: 13.5 }}>
                        {selected.fears?.length ? selected.fears.join(', ') : 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 4: Emergency contacts ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Emergency contacts</h3>
                  <button className="crm-btn ghost sm" onClick={() => setAddContactOpen(true)}>
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div>
                  {contacts.length === 0 ? (
                    <div className="crm-card-pad" style={{ textAlign: 'center' }}>
                      <span className="crm-dim" style={{ fontSize: 13 }}>No emergency contacts</span>
                    </div>
                  ) : (
                    contacts.map((c, i) => (
                      <div
                        key={c.id}
                        style={{
                          padding: '10px 20px',
                          borderTop: i > 0 ? '1px solid var(--crm-hairline)' : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                          <div className="crm-caption">{c.relation}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} /> {c.phone}
                          </span>
                          <button
                            className="crm-btn ghost sm"
                            onClick={() => deleteContactMutation.mutate(c.id)}
                            style={{ padding: 4, color: 'var(--crm-text-3)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Card 5: Groups ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Groups</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="crm-btn ghost sm" onClick={() => setAddToGroupOpen(true)}>
                      <Plus size={12} /> Add to Group
                    </button>
                    <button className="crm-btn ghost sm" onClick={() => setCreateGroupOpen(true)}>
                      <Plus size={12} /> Create Group
                    </button>
                  </div>
                </div>
                <div>
                  {travellerGroups.length === 0 ? (
                    <div className="crm-card-pad" style={{ textAlign: 'center' }}>
                      <span className="crm-dim" style={{ fontSize: 13 }}>Not in any groups yet</span>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="crm-btn sm" onClick={() => setAddToGroupOpen(true)}>Add to existing group</button>
                        <button className="crm-btn primary sm" onClick={() => setCreateGroupOpen(true)}>Create new group</button>
                      </div>
                    </div>
                  ) : (
                    travellerGroups.map((g, i) => (
                      <Link
                        key={g.id}
                        href={`/groups/${g.id}`}
                        style={{
                          padding: '10px 20px',
                          borderTop: i > 0 ? '1px solid var(--crm-hairline)' : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={14} style={{ color: 'var(--crm-text-3)' }} />
                          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{g.name}</span>
                          {g.members?.[0]?.is_primary_coordinator && (
                            <Star size={12} style={{ color: 'var(--crm-amber)', fill: 'var(--crm-amber)' }} />
                          )}
                        </div>
                        <span className={`crm-pill ${g.type === 'family' ? 'purple' : g.type === 'friends' ? 'blue' : g.type === 'couple' ? 'pink' : 'teal'}`}>
                          {g.type}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* ── Card 6: Co-travellers ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Co-travellers</h3>
                  {coTravellers.length > 0 && (
                    <span className="crm-pill blue">{new Set(coTravellers.map(c => c.traveller_id)).size} people</span>
                  )}
                </div>
                <div>
                  {coTravellers.length === 0 ? (
                    <div className="crm-card-pad" style={{ textAlign: 'center' }}>
                      <span className="crm-dim" style={{ fontSize: 13 }}>No shared trips yet</span>
                    </div>
                  ) : (
                    (() => {
                      const byDeparture = new Map<string, { tripName: string; departureDate: string; travellers: CoTraveller[] }>();
                      coTravellers.forEach(ct => {
                        const key = ct.departure_id;
                        if (!byDeparture.has(key)) {
                          byDeparture.set(key, { tripName: ct.trip_name, departureDate: ct.departure_date, travellers: [] });
                        }
                        byDeparture.get(key)!.travellers.push(ct);
                      });
                      return Array.from(byDeparture.entries()).map(([depId, dep], i) => (
                        <div key={depId} style={{ borderTop: i > 0 ? '1px solid var(--crm-hairline)' : undefined, padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <MapPin size={12} style={{ color: 'var(--crm-text-3)' }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-2)' }}>{dep.tripName}</span>
                            <span className="crm-caption">· {formatDateFull(dep.departureDate)}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {dep.travellers.map(ct => (
                              <span
                                key={ct.traveller_id}
                                onClick={() => setSelectedId(ct.traveller_id)}
                                className="crm-pill"
                                style={{ cursor: 'pointer' }}
                              >
                                {ct.preferred_name || ct.full_legal_name}
                                {ct.city && <span className="crm-caption" style={{ marginLeft: 4 }}>({ct.city})</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>

              {/* ── Card 7: Social & dates ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Social &amp; dates</h3>
                  <button className="crm-btn ghost sm" onClick={openEdit}>Edit</button>
                </div>
                <div className="crm-card-pad">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Birthday</div>
                      <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Cake size={13} style={{ color: 'var(--crm-text-3)' }} />
                        {selected.dob ? new Date(selected.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Anniversary</div>
                      <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Heart size={13} style={{ color: 'var(--crm-text-3)' }} />
                        {selected.anniversary ? new Date(selected.anniversary).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Instagram</div>
                      <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AtSign size={13} style={{ color: 'var(--crm-text-3)' }} />
                        {selected.instagram_handle ? `@${selected.instagram_handle.replace(/^@/, '')}` : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>NPS Score</div>
                      <div style={{ fontSize: 13.5 }}>
                        {selected.nps_score != null ? (
                          <span className={`crm-pill ${selected.nps_score >= 9 ? 'green' : selected.nps_score >= 7 ? 'blue' : selected.nps_score >= 5 ? 'amber' : 'red'}`}>
                            {selected.nps_score}/10
                          </span>
                        ) : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Referral source</div>
                      <div style={{ fontSize: 13.5 }}>{selected.referral_source || '--'}</div>
                    </div>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Marital status</div>
                      <div style={{ fontSize: 13.5 }}>{selected.marital_status ? selected.marital_status.charAt(0).toUpperCase() + selected.marital_status.slice(1) : '--'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 8: Internal notes (inline editable) ── */}
              <div className="crm-card">
                <div className="crm-card-hd">
                  <h3>Internal notes</h3>
                </div>
                <div className="crm-card-pad">
                  <textarea
                    defaultValue={selected.internal_notes ?? ''}
                    key={`notes-${selected.id}-${selected.updated_at}`}
                    onBlur={(e) => {
                      const newVal = e.target.value;
                      if (newVal !== (selected.internal_notes ?? '')) {
                        updateTravellerField('internal_notes', newVal || null);
                      }
                    }}
                    placeholder="Add private notes about this traveller..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--crm-radius-sm, 6px)',
                      border: '1px solid var(--crm-border)',
                      background: 'var(--crm-bg)',
                      color: 'var(--crm-text)',
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ─── Edit Profile Dialog ─── */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Traveller</DialogTitle>
                  <DialogDescription>Update traveller profile details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Full Legal Name</Label>
                    <Input
                      id="edit-name"
                      value={(editForm.full_legal_name as string) ?? ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, full_legal_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-pref">Preferred Name</Label>
                      <Input
                        id="edit-pref"
                        value={(editForm.preferred_name as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, preferred_name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-gender">Gender</Label>
                      <Select
                        value={(editForm.gender as string) || undefined}
                        onValueChange={(val) => val !== null && setEditForm((p) => ({ ...p, gender: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={(editForm.email as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={(editForm.phone as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-dob">Date of Birth</Label>
                      <Input
                        id="edit-dob"
                        type="date"
                        value={(editForm.dob as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, dob: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nationality">Nationality</Label>
                      <Input
                        id="edit-nationality"
                        value={(editForm.nationality as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, nationality: e.target.value }))}
                        placeholder="e.g. Indian"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-city">City</Label>
                      <Input
                        id="edit-city"
                        value={(editForm.city as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-country">Country</Label>
                      <Input
                        id="edit-country"
                        value={(editForm.country as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-marital">Marital Status</Label>
                      <Select
                        value={(editForm.marital_status as string) || undefined}
                        onValueChange={(val) => val !== null && setEditForm((p) => ({ ...p, marital_status: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-anniversary">Anniversary</Label>
                      <Input
                        id="edit-anniversary"
                        type="date"
                        value={(editForm.anniversary as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, anniversary: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-instagram">Instagram Handle</Label>
                      <Input
                        id="edit-instagram"
                        value={(editForm.instagram_handle as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, instagram_handle: e.target.value }))}
                        placeholder="e.g. @traveller"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nps">NPS Score (0-10)</Label>
                      <Input
                        id="edit-nps"
                        type="number"
                        min={0}
                        max={10}
                        value={editForm.nps_score ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, nps_score: e.target.value ? parseInt(e.target.value) : undefined }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-referral">Referral Source</Label>
                      <Input
                        id="edit-referral"
                        value={(editForm.referral_source as string) ?? ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, referral_source: e.target.value }))}
                        placeholder="e.g. Instagram, Friend"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                      <Input
                        id="edit-tags"
                        value={Array.isArray(editForm.tags) ? (editForm.tags as string[]).join(', ') : ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
                        placeholder="e.g. VIP, Repeat"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-notes">Internal Notes</Label>
                    <textarea
                      id="edit-notes"
                      value={(editForm.internal_notes as string) ?? ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, internal_notes: e.target.value }))}
                      placeholder="Private notes about this traveller"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--crm-radius-sm, 6px)',
                        border: '1px solid var(--crm-border)',
                        background: 'var(--crm-bg)',
                        color: 'var(--crm-text)',
                        fontSize: 13,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Edit Passport Dialog ─── */}
            <Dialog open={editPassportOpen} onOpenChange={setEditPassportOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Passport</DialogTitle>
                  <DialogDescription>Update passport details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pp-num">Passport Number</Label>
                    <Input
                      id="pp-num"
                      value={(passportForm.passport_number as string) ?? ''}
                      onChange={(e) => setPassportForm((p) => ({ ...p, passport_number: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pp-country">Issuing Country</Label>
                      <Input
                        id="pp-country"
                        value={(passportForm.passport_issuing_country as string) ?? ''}
                        onChange={(e) => setPassportForm((p) => ({ ...p, passport_issuing_country: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pp-place">Place of Issue</Label>
                      <Input
                        id="pp-place"
                        value={(passportForm.passport_place_of_issue as string) ?? ''}
                        onChange={(e) => setPassportForm((p) => ({ ...p, passport_place_of_issue: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pp-issue">Issue Date</Label>
                      <Input
                        id="pp-issue"
                        type="date"
                        value={(passportForm.passport_issue_date as string) ?? ''}
                        onChange={(e) => setPassportForm((p) => ({ ...p, passport_issue_date: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pp-expiry">Expiry Date</Label>
                      <Input
                        id="pp-expiry"
                        type="date"
                        value={(passportForm.passport_expiry_date as string) ?? ''}
                        onChange={(e) => setPassportForm((p) => ({ ...p, passport_expiry_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleSavePassport}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Add Visa Dialog ─── */}
            <Dialog open={addVisaOpen} onOpenChange={setAddVisaOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Visa</DialogTitle>
                  <DialogDescription>Add a new visa record.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="visa-country">Country *</Label>
                    <Input
                      id="visa-country"
                      value={visaForm.country}
                      onChange={(e) => setVisaForm((p) => ({ ...p, country: e.target.value }))}
                      placeholder="e.g. Thailand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="visa-type">Visa Type</Label>
                      <Input
                        id="visa-type"
                        value={visaForm.visa_type}
                        onChange={(e) => setVisaForm((p) => ({ ...p, visa_type: e.target.value }))}
                        placeholder="e.g. Tourist"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="visa-entry">Entry Type</Label>
                      <Select
                        value={visaForm.entry_type || undefined}
                        onValueChange={(val) => val !== null && setVisaForm((p) => ({ ...p, entry_type: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="multiple">Multiple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="visa-from">Valid From</Label>
                      <Input
                        id="visa-from"
                        type="date"
                        value={visaForm.validity_from}
                        onChange={(e) => setVisaForm((p) => ({ ...p, validity_from: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="visa-to">Valid To</Label>
                      <Input
                        id="visa-to"
                        type="date"
                        value={visaForm.validity_to}
                        onChange={(e) => setVisaForm((p) => ({ ...p, validity_to: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleAddVisa}
                    disabled={addVisaMutation.isPending || !visaForm.country.trim()}
                  >
                    {addVisaMutation.isPending ? 'Adding...' : 'Add Visa'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Add Contact Dialog ─── */}
            <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Emergency Contact</DialogTitle>
                  <DialogDescription>Add an emergency contact for this traveller.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ec-name">Name *</Label>
                    <Input
                      id="ec-name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ec-relation">Relation</Label>
                      <Input
                        id="ec-relation"
                        value={contactForm.relation}
                        onChange={(e) => setContactForm((p) => ({ ...p, relation: e.target.value }))}
                        placeholder="e.g. Spouse"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ec-phone">Phone *</Label>
                      <Input
                        id="ec-phone"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ec-priority">Priority</Label>
                    <Input
                      id="ec-priority"
                      type="number"
                      min={1}
                      value={contactForm.priority}
                      onChange={(e) => setContactForm((p) => ({ ...p, priority: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleAddContact}
                    disabled={addContactMutation.isPending || !contactForm.name.trim() || !contactForm.phone.trim()}
                  >
                    {addContactMutation.isPending ? 'Adding...' : 'Add Contact'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Edit Preferences Dialog ─── */}
            <Dialog open={editPrefsOpen} onOpenChange={setEditPrefsOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Preferences &amp; Medical</DialogTitle>
                  <DialogDescription>Update dietary, medical, and travel preferences.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-diet">Dietary</Label>
                      <Select
                        value={(prefsForm.dietary as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, dietary: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vegetarian">Vegetarian</SelectItem>
                          <SelectItem value="non_veg">Non-veg</SelectItem>
                          <SelectItem value="vegan">Vegan</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                          <SelectItem value="halal">Halal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-blood">Blood Group</Label>
                      <Select
                        value={(prefsForm.blood_group as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, blood_group: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pref-allergies">Allergies (comma-separated)</Label>
                    <Input
                      id="pref-allergies"
                      value={Array.isArray(prefsForm.allergies) ? (prefsForm.allergies as string[]).join(', ') : ''}
                      onChange={(e) => setPrefsForm((p) => ({ ...p, allergies: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
                      placeholder="e.g. Peanuts, Shellfish"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pref-alcohol">Alcohol</Label>
                    <Select
                      value={prefsForm.alcohol === true ? 'yes' : prefsForm.alcohol === false ? 'no' : undefined}
                      onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, alcohol: val === 'yes' }))}
                    >
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pref-medical">Medical Conditions (comma-separated)</Label>
                    <Input
                      id="pref-medical"
                      value={Array.isArray(prefsForm.medical_conditions) ? (prefsForm.medical_conditions as string[]).join(', ') : ''}
                      onChange={(e) => setPrefsForm((p) => ({ ...p, medical_conditions: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
                      placeholder="e.g. Asthma, Diabetes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-meds">Medications (comma-separated)</Label>
                      <Input
                        id="pref-meds"
                        value={Array.isArray(prefsForm.medications) ? (prefsForm.medications as string[]).join(', ') : ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, medications: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
                        placeholder="e.g. Inhaler, Insulin"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-fears">Fears (comma-separated)</Label>
                      <Input
                        id="pref-fears"
                        value={Array.isArray(prefsForm.fears) ? (prefsForm.fears as string[]).join(', ') : ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, fears: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
                        placeholder="e.g. Heights, Water"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-fitness">Fitness Level (1–10)</Label>
                      <Input
                        id="pref-fitness"
                        type="number"
                        min={1}
                        max={10}
                        value={prefsForm.fitness_level ?? ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, fitness_level: e.target.value ? parseInt(e.target.value) : undefined }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-adventure">Adventure Experience</Label>
                      <Select
                        value={(prefsForm.adventure_experience as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, adventure_experience: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="experienced">Experienced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-seat">Seat Preference</Label>
                      <Select
                        value={(prefsForm.seat_preference as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, seat_preference: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="window">Window</SelectItem>
                          <SelectItem value="aisle">Aisle</SelectItem>
                          <SelectItem value="no_preference">No preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-berth">Berth Preference</Label>
                      <Select
                        value={(prefsForm.berth_preference as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, berth_preference: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upper">Upper</SelectItem>
                          <SelectItem value="lower">Lower</SelectItem>
                          <SelectItem value="no_preference">No preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-roommate">Roommate Preference</Label>
                      <Select
                        value={(prefsForm.roommate_preference as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, roommate_preference: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="share_anyone">Share with anyone</SelectItem>
                          <SelectItem value="same_gender">Same gender</SelectItem>
                          <SelectItem value="solo">Solo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-tshirt">T-shirt Size</Label>
                      <Select
                        value={(prefsForm.tshirt_size as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, tshirt_size: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XS">XS</SelectItem>
                          <SelectItem value="S">S</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                          <SelectItem value="XXL">XXL</SelectItem>
                          <SelectItem value="XXXL">XXXL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-jacket">Jacket Size</Label>
                      <Select
                        value={(prefsForm.jacket_size as string) || undefined}
                        onValueChange={(val) => val !== null && setPrefsForm((p) => ({ ...p, jacket_size: val as string }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XS">XS</SelectItem>
                          <SelectItem value="S">S</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                          <SelectItem value="XXL">XXL</SelectItem>
                          <SelectItem value="XXXL">XXXL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-insurance-prov">Insurance Provider</Label>
                      <Input
                        id="pref-insurance-prov"
                        value={(prefsForm.insurance_provider as string) ?? ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, insurance_provider: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-insurance-num">Insurance Number</Label>
                      <Input
                        id="pref-insurance-num"
                        value={(prefsForm.insurance_number as string) ?? ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, insurance_number: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pref-insurance-from">Valid From</Label>
                      <Input
                        id="pref-insurance-from"
                        type="date"
                        value={(prefsForm.insurance_valid_from as string) ?? ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, insurance_valid_from: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pref-insurance-to">Valid To</Label>
                      <Input
                        id="pref-insurance-to"
                        type="date"
                        value={(prefsForm.insurance_valid_to as string) ?? ''}
                        onChange={(e) => setPrefsForm((p) => ({ ...p, insurance_valid_to: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={handleSavePrefs}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Add to Group Dialog ─── */}
            <Dialog open={addToGroupOpen} onOpenChange={setAddToGroupOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add to Group</DialogTitle>
                  <DialogDescription>Add this traveller to an existing group.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Group</Label>
                    <Select value={selectedGroupId || undefined} onValueChange={(val) => setSelectedGroupId(val ?? '')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select group...">
                          {(() => { const g = allGroups.find((gr: { id: string }) => gr.id === selectedGroupId); return g ? g.name : 'Select group...'; })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent style={{ minWidth: 400 }}>
                        {allGroups.map((g: { id: string; name: string; type: string }) => (
                          <SelectItem key={g.id} value={g.id}>{g.name} ({g.type})</SelectItem>
                        ))}
                        {allGroups.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--crm-text-3)' }}>No groups available</div>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id="add-coordinator"
                      type="checkbox"
                      checked={addAsCoordinator}
                      onChange={(e) => setAddAsCoordinator(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <Label htmlFor="add-coordinator">Primary coordinator</Label>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={() => addToGroupMutation.mutate({ groupId: selectedGroupId, traveller_id: selectedId!, is_primary_coordinator: addAsCoordinator })}
                    disabled={addToGroupMutation.isPending || !selectedGroupId}
                  >
                    {addToGroupMutation.isPending ? 'Adding...' : 'Add to Group'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Create Group Dialog ─── */}
            <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Group</DialogTitle>
                  <DialogDescription>Create a new group with this traveller as a member.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-group-name">Group Name *</Label>
                    <Input
                      id="new-group-name"
                      value={newGroupForm.name}
                      onChange={(e) => setNewGroupForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Sharma Family"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={newGroupForm.type} onValueChange={(val) => val !== null && setNewGroupForm(p => ({ ...p, type: val }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="friends">Friends</SelectItem>
                        <SelectItem value="couple">Couple</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    className="crm-btn primary"
                    onClick={() => createGroupMutation.mutate(newGroupForm)}
                    disabled={createGroupMutation.isPending || !newGroupForm.name.trim()}
                  >
                    {createGroupMutation.isPending ? 'Creating...' : 'Create & Add'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ─── Import CSV Dialog ─── */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Import Travellers</DialogTitle>
                  <DialogDescription>Upload a CSV file to bulk-import traveller records.</DialogDescription>
                </DialogHeader>
                <div style={{ padding: '16px 0' }}>
                  {importState === 'idle' && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <button className="crm-btn" onClick={downloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Download size={14} />
                          Download CSV Template
                        </button>
                        <div className="crm-caption" style={{ marginTop: 6 }}>
                          Fill in the template, then upload it below. Use semicolons to separate multiple values (allergies, tags, etc).
                        </div>
                      </div>
                      <div
                        onClick={() => csvInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) handleCsvUpload(file);
                        }}
                        style={{
                          border: '2px dashed var(--crm-border)',
                          borderRadius: 8,
                          padding: '32px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'var(--crm-bg-2)',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <Upload size={24} style={{ color: 'var(--crm-text-3)', margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Click or drag CSV file here</div>
                        <div className="crm-caption" style={{ marginTop: 4 }}>Supports .csv files up to 500 rows</div>
                      </div>
                      <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCsvUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </>
                  )}

                  {importState === 'uploading' && (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <Loader2 size={32} style={{ color: 'var(--crm-accent)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Importing travellers...</div>
                      <div className="crm-caption" style={{ marginTop: 4 }}>This may take a moment</div>
                    </div>
                  )}

                  {importState === 'done' && importResult && (
                    <div>
                      {/* Summary */}
                      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                        <div className="crm-card crm-card-pad" style={{ flex: 1, textAlign: 'center' }}>
                          <CheckCircle2 size={20} style={{ color: 'var(--crm-green, #248a3d)', margin: '0 auto 6px' }} />
                          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--crm-green, #248a3d)' }}>{importResult.created}</div>
                          <div className="crm-caption">Created</div>
                        </div>
                        <div className="crm-card crm-card-pad" style={{ flex: 1, textAlign: 'center' }}>
                          <XCircle size={20} style={{ color: importResult.failed > 0 ? 'var(--crm-red, #d70015)' : 'var(--crm-text-4)', margin: '0 auto 6px' }} />
                          <div style={{ fontSize: 24, fontWeight: 700, color: importResult.failed > 0 ? 'var(--crm-red, #d70015)' : 'var(--crm-text-3)' }}>{importResult.failed}</div>
                          <div className="crm-caption">Failed</div>
                        </div>
                        <div className="crm-card crm-card-pad" style={{ flex: 1, textAlign: 'center' }}>
                          <FileText size={20} style={{ color: 'var(--crm-text-3)', margin: '0 auto 6px' }} />
                          <div style={{ fontSize: 24, fontWeight: 700 }}>{importResult.total}</div>
                          <div className="crm-caption">Total rows</div>
                        </div>
                      </div>

                      {/* Errors list */}
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div>
                          <div className="crm-eyebrow" style={{ marginBottom: 8 }}>Errors</div>
                          <div style={{ maxHeight: 160, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--crm-border)' }}>
                            {importResult.errors.map((err, i) => (
                              <div key={i} style={{
                                padding: '8px 12px', fontSize: 12,
                                borderTop: i > 0 ? '1px solid var(--crm-hairline)' : undefined,
                                display: 'flex', gap: 8, alignItems: 'baseline',
                              }}>
                                <span style={{ fontWeight: 600, color: 'var(--crm-red)', flexShrink: 0 }}>Row {err.row}</span>
                                {err.name && <span style={{ color: 'var(--crm-text-2)' }}>{err.name}:</span>}
                                <span className="crm-caption">{err.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {importState === 'done' ? (
                    <button className="crm-btn primary" onClick={() => setImportOpen(false)}>Done</button>
                  ) : importState === 'idle' ? (
                    <button className="crm-btn" onClick={() => setImportOpen(false)}>Cancel</button>
                  ) : null}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
