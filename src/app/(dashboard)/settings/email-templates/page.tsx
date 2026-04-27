'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { EmailTemplate } from '@/types/email-template';
import { TRIGGER_EVENTS, TEMPLATE_VARIABLES } from '@/types/email-template';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ArrowLeft, Plus, Mail, Eye, Pencil, Trash2, Power, PowerOff, Copy, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/* ─── Page ────────────────────────────────────── */

export default function EmailTemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    trigger_event: '',
    is_active: true,
    variables: [] as string[],
  });

  /* ─── Queries ─────────────────────────────── */

  const { data, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.get<APIResponse<EmailTemplate[]>>('/email-templates'),
  });

  const templates = data?.data ?? [];

  /* ─── Mutations ───────────────────────────── */

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<EmailTemplate>>('/email-templates', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setEditOpen(false);
      resetForm();
      toast.success('Template created');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to create template'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<EmailTemplate>>(`/email-templates/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setEditOpen(false);
      setEditingTemplate(null);
      resetForm();
      toast.success('Template updated');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to update template'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setDeleteConfirm(null);
      toast.success('Template deleted');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to delete template'); },
  });

  const previewMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<APIResponse<{ subject: string; body_html: string }>>(`/email-templates/${id}/preview`, { sample_data: {} }),
    onSuccess: (res) => {
      setPreviewSubject(res.data.subject);
      setPreviewHtml(res.data.body_html);
      setPreviewOpen(true);
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to preview template'); },
  });

  /* ─── Helpers ─────────────────────────────── */

  function resetForm() {
    setForm({ name: '', subject: '', body_html: '', body_text: '', trigger_event: '', is_active: true, variables: [] });
  }

  function openCreate() {
    setEditingTemplate(null);
    resetForm();
    setEditOpen(true);
  }

  function openEdit(tmpl: EmailTemplate) {
    setEditingTemplate(tmpl);
    setForm({
      name: tmpl.name,
      subject: tmpl.subject,
      body_html: tmpl.body_html,
      body_text: tmpl.body_text || '',
      trigger_event: tmpl.trigger_event || '',
      is_active: tmpl.is_active,
      variables: tmpl.variables || [],
    });
    setEditOpen(true);
  }

  function handleSave() {
    const body: Record<string, unknown> = {
      name: form.name,
      subject: form.subject,
      body_html: form.body_html,
      body_text: form.body_text || undefined,
      trigger_event: form.trigger_event || undefined,
      is_active: form.is_active,
      variables: form.variables.length > 0 ? form.variables : undefined,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function insertVariable(key: string) {
    const placeholder = `{{${key}}}`;
    setForm(p => ({ ...p, body_html: p.body_html + placeholder }));
    if (!form.variables.includes(key)) {
      setForm(p => ({ ...p, variables: [...p.variables, key] }));
    }
  }

  function getTriggerLabel(event: string | undefined) {
    if (!event) return 'None';
    return TRIGGER_EVENTS.find(e => e.value === event)?.label || event;
  }

  /* ─── Render ──────────────────────────────── */

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading templates...</span></div>;
  }

  return (
    <div>
      <div style={{ padding: '24px 24px 0' }}>
        <button className="crm-btn ghost sm" style={{ marginBottom: 12 }} onClick={() => router.push('/settings')}>
          <ArrowLeft size={14} /> Back to settings
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 className="crm-display" style={{ marginBottom: 4 }}>Email Templates</h1>
            <p className="crm-dim" style={{ fontSize: 14, marginBottom: 0 }}>
              Create and manage email templates for automated and manual communication
            </p>
          </div>
          <button className="crm-btn primary" onClick={openCreate}>
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {templates.length === 0 ? (
          <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
            <Mail size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No email templates yet</div>
            <div className="crm-caption" style={{ marginBottom: 16 }}>Create templates for booking confirmations, payment reminders, and more.</div>
            <button className="crm-btn primary" onClick={openCreate}>
              <Plus size={14} /> Create First Template
            </button>
          </div>
        ) : (
          <div className="crm-card">
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 0.8fr 120px',
              gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--crm-hairline)',
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--crm-text-3)',
            }}>
              <div>Name</div>
              <div>Subject</div>
              <div>Trigger</div>
              <div>Status</div>
              <div />
            </div>

            {templates.map((tmpl) => (
              <div key={tmpl.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 0.8fr 120px',
                gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--crm-hairline)',
                alignItems: 'center', fontSize: 13,
              }}>
                <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                <div className="crm-dim" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tmpl.subject}
                </div>
                <div>
                  {tmpl.trigger_event ? (
                    <span className="crm-pill blue"><span className="dot" />{getTriggerLabel(tmpl.trigger_event)}</span>
                  ) : (
                    <span className="crm-caption">Manual</span>
                  )}
                </div>
                <div>
                  <span className={`crm-pill ${tmpl.is_active ? 'green' : ''}`}>
                    <span className="dot" />{tmpl.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="crm-btn ghost sm" title="Preview"
                    onClick={() => previewMutation.mutate(tmpl.id)}
                    style={{ padding: '4px 6px' }}>
                    <Eye size={13} />
                  </button>
                  <button className="crm-btn ghost sm" title="Edit"
                    onClick={() => openEdit(tmpl)}
                    style={{ padding: '4px 6px' }}>
                    <Pencil size={13} />
                  </button>
                  <button className="crm-btn ghost sm" title="Delete"
                    onClick={() => setDeleteConfirm(tmpl.id)}
                    style={{ padding: '4px 6px', color: 'var(--crm-pink)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create/Edit Dialog ──────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              Use {'{{variable_name}}'} placeholders for dynamic content.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 16, padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Booking Confirmation" />
              </div>
              <div className="grid gap-2">
                <Label>Trigger Event</Label>
                <Select value={form.trigger_event || '__none__'} onValueChange={(v) => { if (v) setForm(p => ({ ...p, trigger_event: v === '__none__' ? '' : v })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (manual only)</SelectItem>
                    {TRIGGER_EVENTS.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Your booking for {{trip_name}} is confirmed!" />
            </div>

            <div className="grid gap-2">
              <Label>Body HTML *</Label>
              <textarea
                value={form.body_html}
                onChange={(e) => setForm(p => ({ ...p, body_html: e.target.value }))}
                rows={10}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8,
                  border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
                  color: 'var(--crm-text)', fontFamily: 'monospace', resize: 'vertical',
                }}
                placeholder="<h1>Hello {{traveller_name}}</h1><p>Your booking for {{trip_name}} on {{departure_date}} is confirmed.</p>"
              />
            </div>

            <div className="grid gap-2">
              <Label>Body Text (plain text fallback)</Label>
              <textarea
                value={form.body_text}
                onChange={(e) => setForm(p => ({ ...p, body_text: e.target.value }))}
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8,
                  border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
                  color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical',
                }}
                placeholder="Plain text version (optional)"
              />
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                className={`crm-btn sm ${form.is_active ? 'green' : 'ghost'}`}
                style={{ gap: 6 }}
              >
                {form.is_active ? <Power size={13} /> : <PowerOff size={13} />}
                {form.is_active ? 'Active' : 'Inactive'}
              </button>
              <span className="crm-caption">
                {form.is_active ? 'Template will be used for automated sending' : 'Template is disabled'}
              </span>
            </div>

            {/* Available variables */}
            <div style={{ background: 'var(--crm-bg-2)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--crm-text-2)' }}>
                <Info size={13} /> Available Variables (click to insert)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TEMPLATE_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="crm-btn ghost sm"
                    style={{ fontSize: 11, padding: '3px 8px', fontFamily: 'monospace' }}
                    title={v.description}
                  >
                    <Copy size={10} /> {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="crm-btn" onClick={() => setEditOpen(false)}>Cancel</button>
            <button
              className="crm-btn primary"
              onClick={handleSave}
              disabled={!form.name || !form.subject || !form.body_html || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ──────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Subject: {previewSubject}</DialogDescription>
          </DialogHeader>
          <iframe
            sandbox=""
            srcDoc={previewHtml}
            style={{ width: '100%', height: 400, border: '1px solid var(--crm-border)', borderRadius: 8 }}
            title="Email Preview"
          />
          <DialogFooter>
            <button className="crm-btn primary" onClick={() => setPreviewOpen(false)}>Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>This action cannot be undone. Any automations using this template will stop working.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button className="crm-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button
              className="crm-btn primary"
              style={{ background: 'var(--crm-pink)', borderColor: 'var(--crm-pink)' }}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
