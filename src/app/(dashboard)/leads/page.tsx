'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Lead, LeadActivity, LeadStageCount } from '@/types/lead';
import type { TripMaster } from '@/types/trip';
import type { StaffUser } from '@/types/staff';
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
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  MessageCircle,
  UserCheck,
  X,
  Clock,
  Target,
} from 'lucide-react';

const STAGES = [
  { key: 'new', label: 'New', color: 'var(--crm-accent)' },
  { key: 'contacted', label: 'Contacted', color: '#5856d6' },
  { key: 'qualified', label: 'Qualified', color: '#007d8a' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#ff9f0a' },
  { key: 'negotiating', label: 'Negotiating', color: '#d93775' },
  { key: 'won', label: 'Won', color: 'var(--crm-green)' },
  { key: 'lost', label: 'Lost', color: 'var(--crm-text-3)' },
] as const;

const SOURCES: Record<string, string> = {
  website: 'Website',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  walk_in: 'Walk-in',
  email: 'Email',
  phone: 'Phone',
  other: 'Other',
};

const PRIORITIES: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'var(--crm-red)' },
  high: { label: 'High', color: 'var(--crm-amber)' },
  medium: { label: 'Medium', color: 'var(--crm-accent)' },
  low: { label: 'Low', color: 'var(--crm-text-3)' },
};

const ACTIVITY_TYPES: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meeting: 'Meeting',
  stage_change: 'Stage Change',
  assignment: 'Assignment',
  follow_up: 'Follow-up',
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_LEAD_FORM = {
  full_name: '',
  email: '',
  phone: '',
  whatsapp: '',
  city: '',
  country: '',
  source: '',
  source_detail: '',
  interested_trip_id: '',
  budget_range: '',
  group_size: 1,
  preferred_dates: '',
  special_requests: '',
  priority: 'medium',
  assigned_to: '',
  next_follow_up: '',
  notes: '',
};

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_LEAD_FORM);
  const [newStage, setNewStage] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [activityType, setActivityType] = useState('note');
  const [activityDesc, setActivityDesc] = useState('');
  const [convertTravellerId, setConvertTravellerId] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', search, stageFilter, sourceFilter],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '200' });
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      return api.get<APIResponse<Lead[]>>(`/leads?${params}`);
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => api.get<APIResponse<LeadStageCount[]>>('/leads/stats'),
  });

  const { data: tripsData } = useQuery({
    queryKey: ['all-trips-for-leads'],
    queryFn: () => api.get<APIResponse<TripMaster[]>>('/trips?per_page=100'),
  });

  const { data: staffData } = useQuery({
    queryKey: ['all-staff-for-leads'],
    queryFn: () => api.get<APIResponse<StaffUser[]>>('/staff'),
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['lead-activities', selectedId],
    queryFn: () => api.get<APIResponse<LeadActivity[]>>(`/leads/${selectedId}/activities`),
    enabled: !!selectedId,
  });

  const leads = leadsData?.data ?? [];
  const stats = statsData?.data ?? [];
  const trips = tripsData?.data ?? [];
  const staff = staffData?.data ?? [];
  const activities = activitiesData?.data ?? [];
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const totalLeads = stats.reduce((sum, s) => sum + s.count, 0);
  const stageCount = (stage: string) => stats.find((s) => s.stage === stage)?.count ?? 0;

  const createMutation = useMutation({
    mutationFn: (body: typeof newLead) =>
      api.post<APIResponse<Lead>>('/leads', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      setAddOpen(false);
      setNewLead(EMPTY_LEAD_FORM);
      setSelectedId(res.data.id);
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage, lost_reason }: { id: string; stage: string; lost_reason?: string }) =>
      api.patch<APIResponse<Lead>>(`/leads/${id}/stage`, { stage, lost_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', selectedId] });
      setStageDialogOpen(false);
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: ({ id, type, description }: { id: string; type: string; description: string }) =>
      api.post<APIResponse<LeadActivity>>(`/leads/${id}/activities`, { type, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', selectedId] });
      setActivityOpen(false);
      setActivityDesc('');
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, traveller_id }: { id: string; traveller_id?: string }) =>
      api.post<APIResponse<Lead>>(`/leads/${id}/convert`, traveller_id ? { traveller_id } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['travellers'] });
      setConvertOpen(false);
      setConvertTravellerId('');
    },
  });

  function handleCreate() {
    if (!newLead.full_name.trim() || !newLead.source) return;
    createMutation.mutate(newLead);
  }

  function openStageDialog() {
    if (!selected) return;
    setNewStage(selected.stage);
    setLostReason('');
    setStageDialogOpen(true);
  }

  function handleStageChange() {
    if (!selected || !newStage) return;
    updateStageMutation.mutate({
      id: selected.id,
      stage: newStage,
      lost_reason: newStage === 'lost' ? lostReason : undefined,
    });
  }

  function handleAddActivity() {
    if (!selected || !activityDesc.trim()) return;
    createActivityMutation.mutate({ id: selected.id, type: activityType, description: activityDesc });
  }

  function handleConvert() {
    if (!selected) return;
    convertMutation.mutate({ id: selected.id, traveller_id: convertTravellerId || undefined });
  }

  function getNextStages(current: string): string[] {
    const order = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost'];
    const idx = order.indexOf(current);
    if (current === 'won' || current === 'lost') return [];
    return order.filter((_, i) => i > idx);
  }

  const pipelineStages = STAGES.filter((s) => s.key !== 'won' && s.key !== 'lost');

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 className="crm-title-1" style={{ margin: 0, fontSize: 18 }}>Leads</h1>
            <span className="crm-caption">{totalLeads} total · {stageCount('new')} new</span>
          </div>
          <div className="crm-sidebar-search" style={{ margin: 0, width: 220 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', font: 'inherit', color: 'var(--crm-text)', width: '100%', fontSize: 13 }}
            />
          </div>
          <Select value={sourceFilter || undefined} onValueChange={(val) => setSourceFilter(!val || val === 'all' ? '' : val)}>
            <SelectTrigger style={{ width: 130 }}><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {Object.entries(SOURCES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div style={{ display: 'flex', gap: 2, background: 'var(--crm-bg-secondary)', borderRadius: 6, padding: 2 }}>
            <button
              className={`crm-btn sm ${viewMode === 'pipeline' ? 'primary' : 'ghost'}`}
              onClick={() => setViewMode('pipeline')}
              style={{ fontSize: 12 }}
            >
              Pipeline
            </button>
            <button
              className={`crm-btn sm ${viewMode === 'list' ? 'primary' : 'ghost'}`}
              onClick={() => setViewMode('list')}
              style={{ fontSize: 12 }}
            >
              List
            </button>
          </div>
          <button className="crm-btn primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Lead
          </button>
        </div>

        {/* Pipeline stats bar */}
        <div style={{ display: 'flex', gap: 1, padding: '0 24px', background: 'var(--crm-bg-secondary)', borderBottom: '1px solid var(--crm-hairline)' }}>
          {STAGES.map((s) => {
            const count = stageCount(s.key);
            const isActive = stageFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStageFilter(isActive ? '' : s.key)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: 'none',
                  background: isActive ? 'var(--crm-bg)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  font: 'inherit',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                <span className="crm-caption" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content area */}
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><span className="crm-caption">Loading leads...</span></div>
        ) : viewMode === 'pipeline' ? (
          /* ── Pipeline / Kanban view ── */
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 24px', display: 'flex', gap: 12 }}>
            {pipelineStages.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage.key);
              const isDropTarget = dropTargetStage === stage.key && draggedLeadId !== null;
              const draggedLead = draggedLeadId ? leads.find((l) => l.id === draggedLeadId) : null;
              const isValidDrop = isDropTarget && draggedLead?.stage !== stage.key;
              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDragEnter={(e) => { e.preventDefault(); setDropTargetStage(stage.key); }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetStage(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTargetStage(null);
                    const leadId = e.dataTransfer.getData('text/plain');
                    const lead = leads.find((l) => l.id === leadId);
                    if (lead && lead.stage !== stage.key) {
                      updateStageMutation.mutate({ id: leadId, stage: stage.key });
                    }
                  }}
                  style={{
                    minWidth: 240,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: isValidDrop ? `color-mix(in srgb, ${stage.color} 8%, var(--crm-bg-secondary))` : 'var(--crm-bg-secondary)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    outline: isValidDrop ? `2px dashed ${stage.color}` : 'none',
                    outlineOffset: -2,
                    transition: 'background 0.15s, outline 0.15s',
                  }}
                >
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${stage.color}` }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: stage.color }}>{stage.label}</span>
                    <span className="crm-caption crm-tabular" style={{ fontSize: 12 }}>{stageLeads.length}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                    {stageLeads.length === 0 && !isValidDrop ? (
                      <div style={{ padding: 24, textAlign: 'center' }}><span className="crm-caption" style={{ fontSize: 11.5 }}>No leads</span></div>
                    ) : stageLeads.length === 0 && isValidDrop ? (
                      <div style={{ padding: 24, textAlign: 'center' }}><span className="crm-caption" style={{ fontSize: 11.5, color: stage.color }}>Drop here</span></div>
                    ) : (
                      stageLeads.map((lead) => {
                        const pri = PRIORITIES[lead.priority ?? 'medium'];
                        const isSelected = lead.id === selectedId;
                        const isDragging = lead.id === draggedLeadId;
                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedLeadId(lead.id);
                              e.dataTransfer.setData('text/plain', lead.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => { setDraggedLeadId(null); setDropTargetStage(null); }}
                            onClick={() => setSelectedId(lead.id)}
                            className="crm-card"
                            style={{
                              padding: '10px 12px',
                              cursor: 'grab',
                              borderLeft: `3px solid ${pri.color}`,
                              background: isSelected ? 'var(--crm-accent-bg)' : 'var(--crm-bg)',
                              opacity: isDragging ? 0.4 : 1,
                              transition: 'background 0.1s, opacity 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{lead.full_name}</span>
                              <span className="crm-caption crm-tabular" style={{ fontSize: 10.5, flexShrink: 0 }}>{timeAgo(lead.created_at)}</span>
                            </div>
                            {lead.city && (
                              <div className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 11.5 }}>
                                <MapPin size={10} /> {lead.city}{lead.country ? `, ${lead.country}` : ''}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span className="crm-pill" style={{ fontSize: 10 }}>{SOURCES[lead.source] ?? lead.source}</span>
                              {lead.group_size && lead.group_size > 1 && (
                                <span className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
                                  <Users size={10} /> {lead.group_size}
                                </span>
                              )}
                              {lead.trip_name && (
                                <span className="crm-pill blue" style={{ fontSize: 10 }}>{lead.trip_name}</span>
                              )}
                            </div>
                            {lead.next_follow_up && (
                              <div className="crm-caption" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: new Date(lead.next_follow_up) < new Date() ? 'var(--crm-red)' : undefined }}>
                                <Clock size={10} /> Follow up: {formatDateShort(lead.next_follow_up)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List view ── */
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--crm-hairline)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 20px', fontWeight: 500 }} className="crm-eyebrow">Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Source</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Stage</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Priority</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Location</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Trip</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Follow-up</th>
                  <th style={{ padding: '10px 12px', fontWeight: 500 }} className="crm-eyebrow">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const pri = PRIORITIES[lead.priority ?? 'medium'];
                  const stageInfo = STAGES.find((s) => s.key === lead.stage);
                  const isSelected = lead.id === selectedId;
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedId(lead.id)}
                      style={{
                        borderBottom: '1px solid var(--crm-hairline)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--crm-accent-bg)' : undefined,
                      }}
                    >
                      <td style={{ padding: '10px 20px', fontWeight: 500 }}>{lead.full_name}</td>
                      <td style={{ padding: '10px 12px' }}><span className="crm-pill" style={{ fontSize: 11 }}>{SOURCES[lead.source]}</span></td>
                      <td style={{ padding: '10px 12px' }}><span style={{ color: stageInfo?.color, fontWeight: 500, fontSize: 12 }}>{stageInfo?.label}</span></td>
                      <td style={{ padding: '10px 12px' }}><span style={{ color: pri.color, fontWeight: 500, fontSize: 12 }}>{pri.label}</span></td>
                      <td style={{ padding: '10px 12px' }} className="crm-caption">{[lead.city, lead.country].filter(Boolean).join(', ') || '--'}</td>
                      <td style={{ padding: '10px 12px' }} className="crm-caption">{lead.trip_name || '--'}</td>
                      <td style={{ padding: '10px 12px' }} className="crm-caption">{lead.next_follow_up ? formatDateShort(lead.next_follow_up) : '--'}</td>
                      <td style={{ padding: '10px 12px' }} className="crm-caption">{timeAgo(lead.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail sidebar ── */}
      {selected && (
        <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid var(--crm-hairline)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--crm-bg)' }}>
          {/* Detail header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--crm-hairline)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{selected.full_name}</h2>
              <button className="crm-btn ghost sm" onClick={() => setSelectedId(null)} style={{ padding: 4 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="crm-pill" style={{ background: STAGES.find((s) => s.key === selected.stage)?.color, color: '#fff', fontSize: 11 }}>
                {STAGES.find((s) => s.key === selected.stage)?.label}
              </span>
              <span className="crm-pill" style={{ fontSize: 11, borderColor: PRIORITIES[selected.priority ?? 'medium'].color, color: PRIORITIES[selected.priority ?? 'medium'].color }}>
                {PRIORITIES[selected.priority ?? 'medium'].label}
              </span>
              <span className="crm-pill" style={{ fontSize: 11 }}>{SOURCES[selected.source]}</span>
            </div>

            {/* Contact info */}
            <div className="crm-stack" style={{ gap: 4 }}>
              {selected.email && (
                <div className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <Mail size={12} /> {selected.email}
                </div>
              )}
              {selected.phone && (
                <div className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <Phone size={12} /> {selected.phone}
                </div>
              )}
              {selected.whatsapp && (
                <div className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <MessageCircle size={12} /> {selected.whatsapp}
                </div>
              )}
              {(selected.city || selected.country) && (
                <div className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <MapPin size={12} /> {[selected.city, selected.country].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Detail body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.stage !== 'won' && selected.stage !== 'lost' && (
                <>
                  <button className="crm-btn sm primary" onClick={openStageDialog}>
                    <ChevronRight size={12} /> Move Stage
                  </button>
                  <button className="crm-btn sm ghost" style={{ color: 'var(--crm-green)' }} onClick={() => setConvertOpen(true)}>
                    <UserCheck size={12} /> Convert
                  </button>
                </>
              )}
              <button className="crm-btn sm ghost" onClick={() => { setActivityType('note'); setActivityOpen(true); }}>
                <Plus size={12} /> Activity
              </button>
            </div>

            {/* Details grid */}
            <div className="crm-stack" style={{ gap: 12, marginBottom: 20 }}>
              {selected.source_detail && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Source Detail</div>
                  <div style={{ fontSize: 13 }}>{selected.source_detail}</div>
                </div>
              )}
              {selected.trip_name && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Interested Trip</div>
                  <div style={{ fontSize: 13 }}>{selected.trip_name}</div>
                </div>
              )}
              {selected.group_size && selected.group_size > 1 && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Group Size</div>
                  <div style={{ fontSize: 13 }}>{selected.group_size} people</div>
                </div>
              )}
              {selected.budget_range && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Budget</div>
                  <div style={{ fontSize: 13 }}>{selected.budget_range}</div>
                </div>
              )}
              {selected.special_requests && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Special Requests</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selected.special_requests}</div>
                </div>
              )}
              {selected.notes && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}
              {selected.next_follow_up && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Next Follow-up</div>
                  <div style={{ fontSize: 13, color: new Date(selected.next_follow_up) < new Date() ? 'var(--crm-red)' : undefined }}>
                    {formatDateShort(selected.next_follow_up)}
                  </div>
                </div>
              )}
              {selected.assigned_to_name && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Assigned To</div>
                  <div style={{ fontSize: 13 }}>{selected.assigned_to_name}</div>
                </div>
              )}
              {selected.traveller_id && (
                <div>
                  <div className="crm-eyebrow" style={{ marginBottom: 3 }}>Converted</div>
                  <div style={{ fontSize: 13, color: 'var(--crm-green)' }}>
                    Traveller created · {selected.converted_at ? formatDateShort(selected.converted_at) : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Activity timeline */}
            <div style={{ borderTop: '1px solid var(--crm-hairline)', paddingTop: 14 }}>
              <div className="crm-eyebrow" style={{ marginBottom: 10 }}>Activity</div>
              {activities.length === 0 ? (
                <span className="crm-caption" style={{ fontSize: 12 }}>No activity yet</span>
              ) : (
                <div className="crm-stack" style={{ gap: 0 }}>
                  {activities.map((a, i) => (
                    <div key={a.id} style={{ padding: '8px 0', borderBottom: i < activities.length - 1 ? '1px solid var(--crm-hairline)' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span className="crm-pill" style={{ fontSize: 10 }}>{ACTIVITY_TYPES[a.type] ?? a.type}</span>
                        <span className="crm-caption crm-tabular" style={{ fontSize: 10.5 }}>{timeAgo(a.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--crm-text-2)' }}>{a.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Lead Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
            <DialogDescription>Create a new lead in the pipeline.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input value={newLead.full_name} onChange={(e) => setNewLead((p) => ({ ...p, full_name: e.target.value }))} placeholder="Contact name" />
              </div>
              <div className="grid gap-2">
                <Label>Source *</Label>
                <Select value={newLead.source || undefined} onValueChange={(val) => val !== null && setNewLead((p) => ({ ...p, source: val as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={newLead.phone} onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={newLead.city} onChange={(e) => setNewLead((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input value={newLead.country} onChange={(e) => setNewLead((p) => ({ ...p, country: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Source Detail</Label>
              <Input value={newLead.source_detail} onChange={(e) => setNewLead((p) => ({ ...p, source_detail: e.target.value }))} placeholder="e.g. Instagram DM, website contact form" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Interested Trip</Label>
                <Select value={newLead.interested_trip_id || undefined} onValueChange={(val) => val !== null && setNewLead((p) => ({ ...p, interested_trip_id: val as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select trip" /></SelectTrigger>
                  <SelectContent>
                    {trips.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={newLead.priority || undefined} onValueChange={(val) => val !== null && setNewLead((p) => ({ ...p, priority: val as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Group Size</Label>
                <Input type="number" min={1} value={newLead.group_size} onChange={(e) => setNewLead((p) => ({ ...p, group_size: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Assigned To</Label>
                <Select value={newLead.assigned_to || undefined} onValueChange={(val) => val !== null && setNewLead((p) => ({ ...p, assigned_to: val as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staff.filter((s) => s.is_active).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Special Requests / Notes</Label>
              <Input value={newLead.special_requests} onChange={(e) => setNewLead((p) => ({ ...p, special_requests: e.target.value }))} placeholder="Any specific requirements" />
            </div>
            <div className="grid gap-2">
              <Label>Next Follow-up</Label>
              <Input type="date" value={newLead.next_follow_up} onChange={(e) => setNewLead((p) => ({ ...p, next_follow_up: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <button className="crm-btn primary" onClick={handleCreate} disabled={createMutation.isPending || !newLead.full_name.trim() || !newLead.source}>
              {createMutation.isPending ? 'Creating...' : 'Create Lead'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Move Stage Dialog ── */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move Lead Stage</DialogTitle>
            <DialogDescription>Change the pipeline stage for {selected?.full_name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New Stage</Label>
              <Select value={newStage || undefined} onValueChange={(val) => val !== null && setNewStage(val as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {selected && getNextStages(selected.stage).map((s) => {
                    const info = STAGES.find((st) => st.key === s);
                    return <SelectItem key={s} value={s}>{info?.label ?? s}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {newStage === 'lost' && (
              <div className="grid gap-2">
                <Label>Reason for losing</Label>
                <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="e.g. Budget too high, chose competitor" />
              </div>
            )}
          </div>
          <DialogFooter>
            <button className="crm-btn primary" onClick={handleStageChange} disabled={updateStageMutation.isPending || !newStage || newStage === selected?.stage}>
              {updateStageMutation.isPending ? 'Moving...' : 'Move'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Activity Dialog ── */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>Add a note or log an interaction.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={activityType} onValueChange={(val) => val !== null && setActivityType(val as string)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={activityDesc} onChange={(e) => setActivityDesc(e.target.value)} placeholder="What happened?" />
            </div>
          </div>
          <DialogFooter>
            <button className="crm-btn primary" onClick={handleAddActivity} disabled={createActivityMutation.isPending || !activityDesc.trim()}>
              {createActivityMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert Dialog ── */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert Lead</DialogTitle>
            <DialogDescription>Create a traveller profile from this lead or link to an existing one.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--crm-text-2)' }}>
              Converting will create a new traveller profile using {selected?.full_name}&apos;s contact details and mark this lead as Won.
            </p>
            <div className="grid gap-2">
              <Label>Or link to existing traveller ID (optional)</Label>
              <Input value={convertTravellerId} onChange={(e) => setConvertTravellerId(e.target.value)} placeholder="Leave empty to create new" />
            </div>
          </div>
          <DialogFooter>
            <button className="crm-btn primary" onClick={handleConvert} disabled={convertMutation.isPending}>
              {convertMutation.isPending ? 'Converting...' : 'Convert to Traveller'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
