'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { thumbUrl } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { Document } from '@/types/document';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/types/document';
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
import { FileUpload } from '@/components/ui/file-upload';
import {
  Plus,
  Trash2,
  FileText,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  Check,
  X,
  Pencil,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────── */

function statusPillClass(status: string): string {
  switch (status) {
    case 'verified': return 'green';
    case 'uploaded': return 'blue';
    case 'pending': return 'amber';
    case 'rejected': return 'pink';
    case 'expired': return '';
    default: return '';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'verified': return <ShieldCheck size={12} />;
    case 'uploaded': return <Shield size={12} />;
    case 'pending': return <Clock size={12} />;
    case 'rejected': return <ShieldX size={12} />;
    case 'expired': return <AlertTriangle size={12} />;
    default: return null;
  }
}

function docTypeIcon(type: string) {
  switch (type) {
    case 'passport': return '🛂';
    case 'visa': return '📋';
    case 'travel_insurance': return '🏥';
    case 'vaccination': return '💉';
    case 'id_card': return '🪪';
    case 'flight_ticket': return '✈️';
    case 'hotel_voucher': return '🏨';
    case 'booking_confirmation': return '📄';
    case 'medical_certificate': return '⚕️';
    default: return '📎';
  }
}

function isExpiringSoon(expiry?: string): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return exp <= threeMonths && exp > new Date();
}

function isExpired(expiry?: string): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url);
}

/* ─── Empty form ─────────────────────────────────── */

const EMPTY_DOC_FORM = {
  document_type: 'passport' as string,
  label: '',
  document_number: '',
  issuing_authority: '',
  issue_date: '',
  expiry_date: '',
  country: '',
  notes: '',
};

/* ─── Component ──────────────────────────────────── */

interface TravellerDocumentsProps {
  travellerId: string;
}

export function TravellerDocuments({ travellerId }: TravellerDocumentsProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [form, setForm] = useState(EMPTY_DOC_FORM);

  /* ─── Query ────────────────────────────────────── */
  const { data, isLoading } = useQuery({
    queryKey: ['traveller-documents', travellerId],
    queryFn: () => api.get<APIResponse<Document[]>>(`/travellers/${travellerId}/documents`),
  });

  const documents = data?.data ?? [];

  /* ─── Mutations ────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<Document>>('/documents', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-documents', travellerId] });
      setAddOpen(false);
      setForm(EMPTY_DOC_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<Document>>(`/documents/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-documents', travellerId] });
      setEditDoc(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete<APIResponse<unknown>>(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-documents', travellerId] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) =>
      api.put<APIResponse<Document>>(`/documents/${id}`, { status: 'verified' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-documents', travellerId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      api.put<APIResponse<Document>>(`/documents/${id}`, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traveller-documents', travellerId] });
    },
  });

  /* ─── Handlers ─────────────────────────────────── */
  function handleCreate() {
    if (!form.document_type || !form.label.trim()) return;
    createMutation.mutate({
      traveller_id: travellerId,
      document_type: form.document_type,
      label: form.label.trim(),
      document_number: form.document_number || undefined,
      issuing_authority: form.issuing_authority || undefined,
      issue_date: form.issue_date || undefined,
      expiry_date: form.expiry_date || undefined,
      country: form.country || undefined,
      notes: form.notes || undefined,
    });
  }

  function openAdd() {
    setForm(EMPTY_DOC_FORM);
    setAddOpen(true);
  }

  function openEdit(doc: Document) {
    setEditDoc(doc);
  }

  const handleFileChange = useCallback((docId: string, field: 'file_url' | 'file_back_url', url: string | null) => {
    updateMutation.mutate({
      id: docId,
      body: { [field]: url || '' },
    });
  }, [updateMutation]);

  /* ─── Render ───────────────────────────────────── */

  // Group documents by type
  const passportDocs = documents.filter(d => d.document_type === 'passport');
  const otherDocs = documents.filter(d => d.document_type !== 'passport');

  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const pendingCount = documents.filter(d => d.status === 'pending' || d.status === 'uploaded').length;

  return (
    <div className="crm-card" style={{ gridColumn: '1 / -1' }}>
      <div className="crm-card-hd">
        <h3>
          <FileText size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Documents
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {verifiedCount > 0 && (
            <span className="crm-pill green">{verifiedCount} verified</span>
          )}
          {pendingCount > 0 && (
            <span className="crm-pill amber">{pendingCount} pending</span>
          )}
          <button className="crm-btn ghost sm" onClick={openAdd}>
            <Plus size={12} /> Add document
          </button>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="crm-card-pad" style={{ textAlign: 'center' }}>
            <span className="crm-caption">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="crm-card-pad" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <FileText size={32} style={{ color: 'var(--crm-text-3)', marginBottom: 8 }} />
            <div className="crm-dim" style={{ fontSize: 13, marginBottom: 12 }}>No documents yet</div>
            <button className="crm-btn primary sm" onClick={openAdd}>
              <Plus size={12} /> Add first document
            </button>
          </div>
        ) : (
          <>
            {/* Passport section */}
            {passportDocs.map((doc, i) => (
              <div
                key={doc.id}
                style={{
                  padding: '16px 20px',
                  borderTop: i > 0 || otherDocs.length > 0 ? '1px solid var(--crm-hairline)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{docTypeIcon(doc.document_type)}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{doc.label}</div>
                      <div className="crm-caption">
                        {doc.document_number && <span className="crm-mono">{doc.document_number}</span>}
                        {doc.country && <span> · {doc.country}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {doc.expiry_date && isExpired(doc.expiry_date) && (
                      <span className="crm-pill pink" style={{ fontSize: 11 }}>
                        <AlertTriangle size={10} /> Expired
                      </span>
                    )}
                    {doc.expiry_date && isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                      <span className="crm-pill amber" style={{ fontSize: 11 }}>
                        <AlertTriangle size={10} /> Expiring soon
                      </span>
                    )}
                    <span className={`crm-pill ${statusPillClass(doc.status)}`} style={{ fontSize: 11 }}>
                      {statusIcon(doc.status)}
                      <span style={{ marginLeft: 3 }}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</span>
                    </span>
                    {doc.status === 'uploaded' && (
                      <>
                        <button
                          className="crm-btn ghost sm"
                          onClick={() => verifyMutation.mutate(doc.id)}
                          title="Verify"
                          style={{ padding: 4, color: 'var(--crm-green)' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="crm-btn ghost sm"
                          onClick={() => rejectMutation.mutate(doc.id)}
                          title="Reject"
                          style={{ padding: 4, color: 'var(--crm-red)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="crm-btn ghost sm"
                      onClick={() => openEdit(doc)}
                      style={{ padding: 4, color: 'var(--crm-text-3)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="crm-btn ghost sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      style={{ padding: 4, color: 'var(--crm-text-3)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Passport details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div className="crm-eyebrow" style={{ marginBottom: 2 }}>Issue date</div>
                    <div style={{ fontSize: 12.5 }}>{formatDate(doc.issue_date)}</div>
                  </div>
                  <div>
                    <div className="crm-eyebrow" style={{ marginBottom: 2 }}>Expiry date</div>
                    <div style={{
                      fontSize: 12.5,
                      color: isExpired(doc.expiry_date) ? 'var(--crm-red)' : isExpiringSoon(doc.expiry_date) ? 'var(--crm-amber)' : undefined,
                      fontWeight: isExpired(doc.expiry_date) || isExpiringSoon(doc.expiry_date) ? 600 : undefined,
                    }}>
                      {formatDate(doc.expiry_date)}
                    </div>
                  </div>
                  <div>
                    <div className="crm-eyebrow" style={{ marginBottom: 2 }}>Issuing authority</div>
                    <div style={{ fontSize: 12.5 }}>{doc.issuing_authority || '--'}</div>
                  </div>
                </div>

                {/* Passport scans: front + back */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <FileUpload
                    value={doc.file_url}
                    onChange={(url) => handleFileChange(doc.id, 'file_url', url)}
                    accept="image/*,.pdf"
                    label="Front"
                    compact
                  />
                  <FileUpload
                    value={doc.file_back_url}
                    onChange={(url) => handleFileChange(doc.id, 'file_back_url', url)}
                    accept="image/*,.pdf"
                    label="Back"
                    compact
                  />
                </div>

                {doc.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--crm-text-2)', fontStyle: 'italic' }}>
                    {doc.notes}
                  </div>
                )}
              </div>
            ))}

            {/* Other documents */}
            {otherDocs.map((doc, i) => (
              <div
                key={doc.id}
                style={{
                  padding: '12px 20px',
                  borderTop: (i > 0 || passportDocs.length > 0) ? '1px solid var(--crm-hairline)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{docTypeIcon(doc.document_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{doc.label}</span>
                        <span className="crm-caption">{DOCUMENT_TYPE_LABELS[doc.document_type]}</span>
                      </div>
                      <div className="crm-caption" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {doc.document_number && <span className="crm-mono">{doc.document_number}</span>}
                        {doc.country && <span>{doc.country}</span>}
                        {doc.expiry_date && (
                          <span style={{
                            color: isExpired(doc.expiry_date) ? 'var(--crm-red)' : isExpiringSoon(doc.expiry_date) ? 'var(--crm-amber)' : undefined,
                          }}>
                            Expires {formatDate(doc.expiry_date)}
                            {isExpired(doc.expiry_date) && ' (expired)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {/* File thumbnail */}
                    {doc.file_url && isImage(doc.file_url) && (
                      <div style={{
                        width: 36, height: 36, borderRadius: 6, overflow: 'hidden',
                        border: '1px solid var(--crm-border)',
                      }}>
                        <img src={thumbUrl(doc.file_url, 72)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <span className={`crm-pill ${statusPillClass(doc.status)}`} style={{ fontSize: 11 }}>
                      {statusIcon(doc.status)}
                      <span style={{ marginLeft: 3 }}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</span>
                    </span>

                    {doc.status === 'uploaded' && (
                      <>
                        <button
                          className="crm-btn ghost sm"
                          onClick={() => verifyMutation.mutate(doc.id)}
                          title="Verify"
                          style={{ padding: 4, color: 'var(--crm-green)' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="crm-btn ghost sm"
                          onClick={() => rejectMutation.mutate(doc.id)}
                          title="Reject"
                          style={{ padding: 4, color: 'var(--crm-red)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}

                    <button
                      className="crm-btn ghost sm"
                      onClick={() => openEdit(doc)}
                      style={{ padding: 4, color: 'var(--crm-text-3)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="crm-btn ghost sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      style={{ padding: 4, color: 'var(--crm-text-3)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* File upload area for non-passport docs without files */}
                {!doc.file_url && (
                  <div style={{ marginTop: 8 }}>
                    <FileUpload
                      value={doc.file_url}
                      onChange={(url) => handleFileChange(doc.id, 'file_url', url)}
                      accept="image/*,.pdf"
                      label="Upload file"
                      compact
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ─── Add Document Dialog ─── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>Add a new document for this traveller.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Document Type *</Label>
                <Select
                  value={form.document_type}
                  onValueChange={(val) => {
                    if (!val) return;
                    setForm((p) => ({
                      ...p,
                      document_type: val,
                      label: DOCUMENT_TYPE_LABELS[val] || p.label,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Label *</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Passport, Thailand Visa"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Document Number</Label>
                <Input
                  value={form.document_number}
                  onChange={(e) => setForm((p) => ({ ...p, document_number: e.target.value }))}
                  placeholder="e.g. A12345678"
                />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. India"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Issuing Authority</Label>
              <Input
                value={form.issuing_authority}
                onChange={(e) => setForm((p) => ({ ...p, issuing_authority: e.target.value }))}
                placeholder="e.g. Passport Seva Kendra, Mumbai"
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                style={{
                  width: '100%', minHeight: 60, padding: '8px 12px', fontSize: 13,
                  border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)',
                  background: 'var(--crm-bg)', color: 'var(--crm-text)', resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <button
              className="crm-btn primary"
              onClick={handleCreate}
              disabled={createMutation.isPending || !form.document_type || !form.label.trim()}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Document'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Document Dialog ─── */}
      <Dialog open={!!editDoc} onOpenChange={(open) => { if (!open) setEditDoc(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update document details.</DialogDescription>
          </DialogHeader>
          {editDoc && (
            <EditDocumentForm
              doc={editDoc}
              onSave={(body) => {
                updateMutation.mutate({ id: editDoc.id, body });
              }}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Edit form sub-component ────────────────────── */

function EditDocumentForm({
  doc,
  onSave,
  isPending,
}: {
  doc: Document;
  onSave: (body: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    label: doc.label,
    document_number: doc.document_number || '',
    issuing_authority: doc.issuing_authority || '',
    issue_date: doc.issue_date ? doc.issue_date.substring(0, 10) : '',
    expiry_date: doc.expiry_date ? doc.expiry_date.substring(0, 10) : '',
    country: doc.country || '',
    notes: doc.notes || '',
    status: doc.status,
  });

  return (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="crm-pill" style={{ display: 'inline-block' }}>
              {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Document Number</Label>
            <Input
              value={form.document_number}
              onChange={(e) => setForm((p) => ({ ...p, document_number: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Country</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Issue Date</Label>
            <Input
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Issuing Authority</Label>
          <Input
            value={form.issuing_authority}
            onChange={(e) => setForm((p) => ({ ...p, issuing_authority: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) => { if (val) setForm((p) => ({ ...p, status: val })); }}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            style={{
              width: '100%', minHeight: 60, padding: '8px 12px', fontSize: 13,
              border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)',
              background: 'var(--crm-bg)', color: 'var(--crm-text)', resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* File uploads */}
        <div className="grid gap-2">
          <Label>File attachments</Label>
          <div style={{ display: 'flex', gap: 12 }}>
            <FileUpload
              value={doc.file_url}
              onChange={(url) => {
                onSave({ file_url: url || '' });
              }}
              accept="image/*,.pdf"
              label={doc.document_type === 'passport' ? 'Front' : 'File'}
              compact
            />
            {doc.document_type === 'passport' && (
              <FileUpload
                value={doc.file_back_url}
                onChange={(url) => {
                  onSave({ file_back_url: url || '' });
                }}
                accept="image/*,.pdf"
                label="Back"
                compact
              />
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <button
          className="crm-btn primary"
          onClick={() => onSave({
            label: form.label,
            document_number: form.document_number || undefined,
            issuing_authority: form.issuing_authority || undefined,
            issue_date: form.issue_date || undefined,
            expiry_date: form.expiry_date || undefined,
            country: form.country || undefined,
            notes: form.notes || undefined,
            status: form.status,
          })}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </DialogFooter>
    </>
  );
}
