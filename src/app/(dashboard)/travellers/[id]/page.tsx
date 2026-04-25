'use client';

import { use, useState } from 'react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Group } from '@/types/group';
import Link from 'next/link';
import { FileUpload } from '@/components/ui/file-upload';
import { AlertTriangle, FileText, Plus, Trash2, Phone, Users, Star, AtSign, Heart, Cake, MapPin } from 'lucide-react';
import { TravellerDocuments } from '@/components/documents/traveller-documents';

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

/* ─── Empty form state ───────────────────────────── */
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
export default function TravellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPassportOpen, setEditPassportOpen] = useState(false);
  const [addVisaOpen, setAddVisaOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [addAsCoordinator, setAddAsCoordinator] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: '', type: 'family', comm_preference: 'primary_only' });

  // Form state
  const [editForm, setEditForm] = useState<Partial<Traveller>>({});
  const [passportForm, setPassportForm] = useState<Partial<Traveller>>({});
  const [visaForm, setVisaForm] = useState(EMPTY_VISA_FORM);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);

  /* ─── Queries ──────────────────────────────────── */
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['traveller', id],
    queryFn: () => api.get<APIResponse<Traveller>>(`/travellers/${id}`),
  });

  const { data: visasData, isLoading: visasLoading } = useQuery({
    queryKey: ['traveller-visas', id],
    queryFn: () => api.get<APIResponse<VisaRecord[]>>(`/travellers/${id}/visas`),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['traveller-groups', id],
    queryFn: () => api.get<APIResponse<Group[]>>(`/travellers/${id}/groups`),
  });

  const { data: coTravellersData } = useQuery({
    queryKey: ['traveller-co-travellers', id],
    queryFn: () => api.get<APIResponse<CoTraveller[]>>(`/travellers/${id}/co-travellers`),
  });
  const coTravellers = coTravellersData?.data ?? [];

  const { data: allGroupsData } = useQuery({
    queryKey: ['all-groups-for-add'],
    queryFn: () => api.get<APIResponse<{ id: string; name: string; type: string }[]>>('/groups?per_page=200'),
    enabled: addToGroupOpen,
  });

  const traveller = detailData?.data ?? null;
  const visas = visasData?.data ?? [];
  const travellerGroups = groupsData?.data ?? [];
  const allGroups = (allGroupsData?.data ?? []).filter((g: { id: string }) => !travellerGroups.some(tg => tg.id === g.id));

  /* ─── Mutations ────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: (body: Partial<Traveller>) =>
      api.put<APIResponse<Traveller>>(`/travellers/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller', id] });
      setEditDialogOpen(false);
      setEditPassportOpen(false);
    },
  });

  const addVisaMutation = useMutation({
    mutationFn: (body: typeof visaForm) =>
      api.post<APIResponse<VisaRecord>>(`/travellers/${id}/visas`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-visas', id] });
      setAddVisaOpen(false);
      setVisaForm(EMPTY_VISA_FORM);
    },
  });

  const deleteVisaMutation = useMutation({
    mutationFn: (visaId: string) =>
      api.delete<APIResponse<null>>(`/travellers/${id}/visas/${visaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-visas', id] });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (body: typeof contactForm) =>
      api.post<APIResponse<EmergencyContact>>(`/travellers/${id}/emergency-contacts`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller', id] });
      setAddContactOpen(false);
      setContactForm(EMPTY_CONTACT_FORM);
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) =>
      api.delete<APIResponse<null>>(`/travellers/${id}/emergency-contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller', id] });
    },
  });

  const addToGroupMutation = useMutation({
    mutationFn: (body: { groupId: string; traveller_id: string; is_primary_coordinator: boolean }) =>
      api.post<APIResponse<unknown>>(`/groups/${body.groupId}/members`, { traveller_id: body.traveller_id, is_primary_coordinator: body.is_primary_coordinator }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-groups', id] });
      setAddToGroupOpen(false);
      setSelectedGroupId('');
      setAddAsCoordinator(false);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (body: { name: string; type: string; comm_preference: string }) => {
      const res = await api.post<APIResponse<{ id: string }>>('/groups', body);
      await api.post(`/groups/${res.data.id}/members`, { traveller_id: id, is_primary_coordinator: true });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-groups', id] });
      setCreateGroupOpen(false);
      setNewGroupForm({ name: '', type: 'family', comm_preference: 'primary_only' });
    },
  });

  /* ─── Handlers ─────────────────────────────────── */
  function openEdit() {
    if (!traveller) return;
    setEditForm({
      full_legal_name: traveller.full_legal_name,
      preferred_name: traveller.preferred_name ?? '',
      email: traveller.email ?? '',
      phone: traveller.phone ?? '',
      city: traveller.city ?? '',
      country: traveller.country ?? '',
      dob: traveller.dob ?? '',
      gender: traveller.gender ?? '',
      dietary: traveller.dietary ?? '',
      allergies: traveller.allergies ?? [],
      blood_group: traveller.blood_group ?? '',
      fitness_level: traveller.fitness_level,
      anniversary: traveller.anniversary ?? '',
      instagram_handle: traveller.instagram_handle ?? '',
      nps_score: traveller.nps_score,
      internal_notes: traveller.internal_notes ?? '',
    });
    setEditDialogOpen(true);
  }

  function openPassportEdit() {
    if (!traveller) return;
    setPassportForm({
      passport_number: traveller.passport_number ?? '',
      passport_issuing_country: traveller.passport_issuing_country ?? '',
      passport_expiry_date: traveller.passport_expiry_date ?? '',
      passport_place_of_issue: traveller.passport_place_of_issue ?? '',
      passport_issue_date: traveller.passport_issue_date ?? '',
    });
    setEditPassportOpen(true);
  }

  function handleSaveEdit() {
    updateMutation.mutate(editForm);
  }

  function handleSavePassport() {
    updateMutation.mutate(passportForm);
  }

  function handleAddVisa() {
    if (!visaForm.country.trim()) return;
    addVisaMutation.mutate(visaForm);
  }

  function handleAddContact() {
    if (!contactForm.name.trim() || !contactForm.phone.trim()) return;
    addContactMutation.mutate(contactForm);
  }

  const updateTravellerField = async (field: string, value: string | null) => {
    if (!traveller) return;
    await api.put(`/travellers/${id}`, { ...traveller, [field]: value });
    queryClient.invalidateQueries({ queryKey: ['traveller', id] });
  };

  /* ─── Loading / Not found states ───────────────── */
  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <span className="crm-caption">Loading traveller...</span>
      </div>
    );
  }

  if (!traveller) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div className="crm-title-1" style={{ marginBottom: 8 }}>
          Traveller not found
        </div>
        <div className="crm-dim" style={{ marginBottom: 20 }}>
          No traveller with ID {id}
        </div>
        <a href="/travellers" className="crm-btn primary" style={{ textDecoration: 'none' }}>
          Back to travellers
        </a>
      </div>
    );
  }

  const activeVisas = visas.filter((v) => isVisaActive(v)).length;
  const contacts = traveller.emergency_contacts ?? [];
  const initials = getInitials(traveller.preferred_name || traveller.full_legal_name);
  const displayName = traveller.preferred_name || traveller.full_legal_name;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', overflowY: 'auto' }}>
      {/* Back link */}
      <a
        href="/travellers"
        className="crm-caption"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          textDecoration: 'none',
          marginBottom: 16,
          color: 'var(--crm-accent)',
          fontSize: 13,
        }}
      >
        &larr; All travellers
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div
          className="crm-avatar lg"
          style={{
            background: `linear-gradient(135deg, ${hashHue(traveller.full_legal_name)}, ${hashHue(initials)})`,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 className="crm-title-1" style={{ margin: 0 }}>{displayName}</h1>
            {displayName !== traveller.full_legal_name && (
              <span className="crm-dim" style={{ fontSize: 13 }}>({traveller.full_legal_name})</span>
            )}
            {(traveller.tags ?? []).map((tag) => (
              <span key={tag} className={`crm-pill ${tagColor(tag)}`}>
                <span className="dot" />
                {tag}
              </span>
            ))}
          </div>
          <div className="crm-dim" style={{ fontSize: 13, marginTop: 4 }}>
            {[traveller.city, traveller.country].filter(Boolean).join(', ') || 'No location'}
            {traveller.dob && ` · Age ${Math.floor((Date.now() - new Date(traveller.dob).getTime()) / 31557600000)}`}
            {traveller.email && ` · ${traveller.email}`}
            {traveller.phone && ` · ${traveller.phone}`}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
          {traveller.fitness_level != null && (
            <div style={{ textAlign: 'right' }}>
              <div className="crm-eyebrow">Fitness</div>
              <div className="crm-title-3 crm-tabular" style={{ marginTop: 2 }}>{traveller.fitness_level}/10</div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div className="crm-eyebrow">Status</div>
            <div style={{ marginTop: 4 }}>
              <span className={`crm-pill ${traveller.status === 'active' ? 'green' : ''}`}>{traveller.status}</span>
            </div>
          </div>
        </div>

        <button className="crm-btn primary" onClick={openEdit}>Edit profile</button>
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
                <div className="crm-mono">{traveller.passport_number || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Country</div>
                <div style={{ fontSize: 13.5 }}>{traveller.passport_issuing_country || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Expiry</div>
                <div style={{ fontSize: 13.5, color: isPassportExpiringSoon(traveller.passport_expiry_date) ? 'var(--crm-red)' : undefined }}>
                  {formatDate(traveller.passport_expiry_date)}
                  {isPassportExpiringSoon(traveller.passport_expiry_date) && (
                    <AlertTriangle size={12} style={{ marginLeft: 4, verticalAlign: '-1px' }} />
                  )}
                </div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Place of issue</div>
                <div style={{ fontSize: 13.5 }}>{traveller.passport_place_of_issue || '--'}</div>
              </div>
            </div>

            <div className="crm-sep-h" style={{ margin: '16px 0' }} />

            <div className="crm-eyebrow" style={{ marginBottom: 10 }}>Scans</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <FileUpload
                value={traveller.passport_front_url}
                onChange={(url) => updateTravellerField('passport_front_url', url)}
                accept="image/*,.pdf"
                label="Front"
                compact
              />
              <FileUpload
                value={traveller.passport_back_url}
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
                          await api.put(`/travellers/${id}/visas/${v.id}`, { ...v, visa_scan_url: url });
                          queryClient.invalidateQueries({ queryKey: ['traveller-visas', id] });
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

        {/* ── Documents ── */}
        <TravellerDocuments travellerId={id} />

        {/* ── Card 3: Preferences & medical ── */}
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3>Preferences &amp; medical</h3>
          </div>
          <div className="crm-card-pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Diet</div>
                <span className="crm-pill">{traveller.dietary || '--'}</span>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Alcohol</div>
                <div style={{ fontSize: 13.5 }}>{traveller.alcohol === true ? 'Yes' : traveller.alcohol === false ? 'No' : '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Allergies</div>
                <div style={{ fontSize: 13.5 }}>
                  {traveller.allergies?.length ? (
                    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {traveller.allergies.map((a) => <span key={a} className="crm-pill amber">{a}</span>)}
                    </span>
                  ) : 'None'}
                </div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Blood group</div>
                <div style={{ fontSize: 13.5 }}>{traveller.blood_group || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Seat</div>
                <div style={{ fontSize: 13.5 }}>{traveller.seat_preference || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Roommate</div>
                <div style={{ fontSize: 13.5 }}>{traveller.roommate_preference || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>T-shirt size</div>
                <div style={{ fontSize: 13.5 }}>{traveller.tshirt_size || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Insurance</div>
                <div style={{ fontSize: 13.5 }}>{traveller.insurance_provider || '--'}</div>
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
                      <span className="crm-caption">· {formatDate(dep.departureDate)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {dep.travellers.map(ct => (
                        <Link
                          key={ct.traveller_id}
                          href={`/travellers/${ct.traveller_id}`}
                          className="crm-pill"
                          style={{ textDecoration: 'none', cursor: 'pointer' }}
                        >
                          {ct.preferred_name || ct.full_legal_name}
                          {ct.city && <span className="crm-caption" style={{ marginLeft: 4 }}>({ct.city})</span>}
                        </Link>
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
          </div>
          <div className="crm-card-pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Birthday</div>
                <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Cake size={13} style={{ color: 'var(--crm-text-3)' }} />
                  {traveller.dob ? new Date(traveller.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '--'}
                </div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Anniversary</div>
                <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Heart size={13} style={{ color: 'var(--crm-text-3)' }} />
                  {traveller.anniversary ? new Date(traveller.anniversary).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '--'}
                </div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Instagram</div>
                <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AtSign size={13} style={{ color: 'var(--crm-text-3)' }} />
                  {traveller.instagram_handle ? `@${traveller.instagram_handle.replace(/^@/, '')}` : '--'}
                </div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>NPS Score</div>
                <div style={{ fontSize: 13.5 }}>
                  {traveller.nps_score != null ? (
                    <span className={`crm-pill ${traveller.nps_score >= 9 ? 'green' : traveller.nps_score >= 7 ? 'blue' : traveller.nps_score >= 5 ? 'amber' : 'red'}`}>
                      {traveller.nps_score}/10
                    </span>
                  ) : '--'}
                </div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Referral source</div>
                <div style={{ fontSize: 13.5 }}>{traveller.referral_source || '--'}</div>
              </div>
              <div>
                <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Marital status</div>
                <div style={{ fontSize: 13.5 }}>{traveller.marital_status ? traveller.marital_status.charAt(0).toUpperCase() + traveller.marital_status.slice(1) : '--'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 8: Internal notes ── */}
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3>Internal notes</h3>
          </div>
          <div className="crm-card-pad">
            <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: traveller.internal_notes ? 'var(--crm-text)' : 'var(--crm-text-3)' }}>
              {traveller.internal_notes || 'No notes yet'}
            </div>
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
                <Label htmlFor="edit-diet">Dietary</Label>
                <Select
                  value={(editForm.dietary as string) || undefined}
                  onValueChange={(val) => val !== null && setEditForm((p) => ({ ...p, dietary: val as string }))}
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
                <Label htmlFor="edit-blood">Blood Group</Label>
                <Select
                  value={(editForm.blood_group as string) || undefined}
                  onValueChange={(val) => val !== null && setEditForm((p) => ({ ...p, blood_group: val as string }))}
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
              <Label htmlFor="edit-allergies">Allergies (comma-separated)</Label>
              <Input
                id="edit-allergies"
                value={Array.isArray(editForm.allergies) ? (editForm.allergies as string[]).join(', ') : ''}
                onChange={(e) => setEditForm((p) => ({ ...p, allergies: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
                placeholder="e.g. Peanuts, Shellfish"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-anniversary">Anniversary</Label>
                <Input
                  id="edit-anniversary"
                  type="date"
                  value={(editForm.anniversary as string) ?? ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, anniversary: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-instagram">Instagram</Label>
                <Input
                  id="edit-instagram"
                  value={(editForm.instagram_handle as string) ?? ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, instagram_handle: e.target.value }))}
                  placeholder="handle without @"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="edit-referral">Referral Source</Label>
                <Input
                  id="edit-referral"
                  value={(editForm.referral_source as string) ?? ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, referral_source: e.target.value }))}
                  placeholder="e.g. Instagram, Friend"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Internal Notes</Label>
              <textarea
                id="edit-notes"
                value={(editForm.internal_notes as string) ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, internal_notes: e.target.value }))}
                style={{ width: '100%', minHeight: 80, padding: '8px 12px', fontSize: 13, border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', background: 'var(--crm-bg)', color: 'var(--crm-text)', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Internal notes about this traveller..."
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
                id="add-coordinator-standalone"
                type="checkbox"
                checked={addAsCoordinator}
                onChange={(e) => setAddAsCoordinator(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <Label htmlFor="add-coordinator-standalone">Primary coordinator</Label>
            </div>
          </div>
          <DialogFooter>
            <button
              className="crm-btn primary"
              onClick={() => addToGroupMutation.mutate({ groupId: selectedGroupId, traveller_id: id, is_primary_coordinator: addAsCoordinator })}
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
              <Label htmlFor="new-group-name-standalone">Group Name *</Label>
              <Input
                id="new-group-name-standalone"
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
    </div>
  );
}
