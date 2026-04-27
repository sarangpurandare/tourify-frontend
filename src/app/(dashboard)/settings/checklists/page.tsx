'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { APIResponse } from '@/types/api';
import type { ChecklistTemplate, ChecklistTemplateItem } from '@/types/checklist';
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
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Shield,
  ArrowLeft,
  Sprout,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Constants ────────────────────────────────── */

const CATEGORY_OPTIONS = [
  { value: 'logistics', label: 'Logistics' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'operations', label: 'Operations' },
  { value: 'post_trip', label: 'Post Trip' },
  { value: 'general', label: 'General' },
];

const ASSIGNEE_ROLES = [
  { value: '', label: 'Unassigned' },
  { value: 'trip_leader', label: 'Trip Leader' },
  { value: 'co_leader', label: 'Co-Leader' },
  { value: 'ops_owner', label: 'Ops Owner' },
  { value: 'admin', label: 'Admin' },
];

/* ─── Page ─────────────────────────────────────── */

export default function ChecklistTemplatesPage() {
  const queryClient = useQueryClient();
  const [scopeTab, setScopeTab] = useState<'departure' | 'traveller'>('departure');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Template dialogs
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);

  // Item dialogs
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemTemplateId, setAddItemTemplateId] = useState<string | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistTemplateItem | null>(null);
  const [editItemTemplateId, setEditItemTemplateId] = useState<string | null>(null);

  /* ─── Queries ────────────────────────────────── */

  const templatesQuery = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: () => api.get<APIResponse<ChecklistTemplate[]>>('/checklist-templates'),
  });

  const templates = templatesQuery.data?.data ?? [];
  const filteredTemplates = templates.filter((t) => t.scope === scopeTab);

  /* ─── Template mutations ─────────────────────── */

  const createTemplateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<ChecklistTemplate>>('/checklist-templates', body),
    onSuccess: () => {
      toast.success('Template created');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      setAddTemplateOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create template');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<ChecklistTemplate>>(`/checklist-templates/${id}`, body),
    onSuccess: () => {
      toast.success('Template updated');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      setEditTemplateOpen(false);
      setEditingTemplate(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/checklist-templates/${id}`),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      if (expandedTemplateId) setExpandedTemplateId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete template');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.put<APIResponse<ChecklistTemplate>>(`/checklist-templates/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update template');
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: () =>
      api.post<APIResponse<{ message: string }>>('/checklist-templates/seed-defaults'),
    onSuccess: () => {
      toast.success('Default templates seeded successfully');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to seed defaults');
    },
  });

  /* ─── Item mutations ─────────────────────────── */

  const createItemMutation = useMutation({
    mutationFn: ({ templateId, body }: { templateId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<ChecklistTemplateItem>>(
        `/checklist-templates/${templateId}/items`,
        body
      ),
    onSuccess: (_, variables) => {
      toast.success('Item added');
      queryClient.invalidateQueries({ queryKey: ['checklist-template-items', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      setAddItemOpen(false);
      setAddItemTemplateId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add item');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      templateId,
      itemId,
      body,
    }: {
      templateId: string;
      itemId: string;
      body: Record<string, unknown>;
    }) =>
      api.put<APIResponse<ChecklistTemplateItem>>(
        `/checklist-templates/${templateId}/items/${itemId}`,
        body
      ),
    onSuccess: (_, variables) => {
      toast.success('Item updated');
      queryClient.invalidateQueries({ queryKey: ['checklist-template-items', variables.templateId] });
      setEditItemOpen(false);
      setEditingItem(null);
      setEditItemTemplateId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update item');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ templateId, itemId }: { templateId: string; itemId: string }) =>
      api.delete(`/checklist-templates/${templateId}/items/${itemId}`),
    onSuccess: (_, variables) => {
      toast.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: ['checklist-template-items', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete item');
    },
  });

  /* ─── Handlers ───────────────────────────────── */

  function openEditTemplate(t: ChecklistTemplate) {
    setEditingTemplate(t);
    setEditTemplateOpen(true);
  }

  function openAddItem(templateId: string) {
    setAddItemTemplateId(templateId);
    setAddItemOpen(true);
  }

  function openEditItem(templateId: string, item: ChecklistTemplateItem) {
    setEditItemTemplateId(templateId);
    setEditingItem(item);
    setEditItemOpen(true);
  }

  /* ─── Render ─────────────────────────────────── */

  return (
    <div>
      <div style={{ padding: '24px 24px 0' }}>
        <Link
          href="/settings"
          className="crm-btn ghost sm"
          style={{ marginBottom: 12, textDecoration: 'none', display: 'inline-flex' }}
        >
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div>
            <h1 className="crm-display" style={{ marginBottom: 4 }}>
              Checklist Templates
            </h1>
            <p className="crm-dim" style={{ fontSize: 14, marginBottom: 0 }}>
              Define reusable checklist templates for departure operations
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {templates.length === 0 && (
              <button
                className="crm-btn"
                onClick={() => seedDefaultsMutation.mutate()}
                disabled={seedDefaultsMutation.isPending}
                style={{ gap: 6 }}
              >
                <Sprout size={14} />
                {seedDefaultsMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
              </button>
            )}
            <button
              className="crm-btn primary"
              onClick={() => setAddTemplateOpen(true)}
            >
              <Plus size={14} /> Add Template
            </button>
          </div>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="crm-tabs">
        <div
          className={`crm-tab${scopeTab === 'departure' ? ' active' : ''}`}
          onClick={() => setScopeTab('departure')}
        >
          Departure
          {filteredTemplates.length > 0 && scopeTab === 'departure' && (
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
              ({filteredTemplates.length})
            </span>
          )}
        </div>
        <div
          className={`crm-tab${scopeTab === 'traveller' ? ' active' : ''}`}
          onClick={() => setScopeTab('traveller')}
        >
          Traveller
          {templates.filter((t) => t.scope === 'traveller').length > 0 &&
            scopeTab === 'traveller' && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                ({templates.filter((t) => t.scope === 'traveller').length})
              </span>
            )}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {templatesQuery.isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-caption">Loading templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
            <ListChecks
              size={36}
              style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }}
            />
            {templates.length === 0 ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                  No templates yet
                </div>
                <div className="crm-caption" style={{ marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>
                  Seed default templates to get started, or create your own from scratch.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    className="crm-btn primary"
                    onClick={() => seedDefaultsMutation.mutate()}
                    disabled={seedDefaultsMutation.isPending}
                    style={{ gap: 6 }}
                  >
                    <Sprout size={14} />
                    {seedDefaultsMutation.isPending ? 'Seeding...' : 'Seed Default Templates'}
                  </button>
                  <button
                    className="crm-btn"
                    onClick={() => setAddTemplateOpen(true)}
                  >
                    <Plus size={14} /> Create from Scratch
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                  No {scopeTab} templates yet
                </div>
                <div className="crm-caption" style={{ marginBottom: 16 }}>
                  Create a template to define reusable checklist items for {scopeTab === 'departure' ? 'departure operations' : 'traveller tasks'}.
                </div>
                <button
                  className="crm-btn primary"
                  onClick={() => setAddTemplateOpen(true)}
                >
                  <Plus size={14} /> Create Template
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTemplates
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isExpanded={expandedTemplateId === template.id}
                  onToggleExpand={() =>
                    setExpandedTemplateId(
                      expandedTemplateId === template.id ? null : template.id
                    )
                  }
                  onEdit={() => openEditTemplate(template)}
                  onDelete={() => {
                    if (
                      confirm(
                        `Delete template "${template.name}"? This cannot be undone.`
                      )
                    ) {
                      deleteTemplateMutation.mutate(template.id);
                    }
                  }}
                  onToggleActive={(active) =>
                    toggleActiveMutation.mutate({
                      id: template.id,
                      is_active: active,
                    })
                  }
                  onAddItem={() => openAddItem(template.id)}
                  onEditItem={(item) => openEditItem(template.id, item)}
                  onDeleteItem={(itemId) => {
                    if (confirm('Delete this item?')) {
                      deleteItemMutation.mutate({
                        templateId: template.id,
                        itemId,
                      });
                    }
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* ─── Add Template Dialog ─────────────────── */}
      <TemplateFormDialog
        open={addTemplateOpen}
        onOpenChange={setAddTemplateOpen}
        title="Create Template"
        defaultScope={scopeTab}
        onSubmit={(body) => createTemplateMutation.mutate(body)}
        submitting={createTemplateMutation.isPending}
      />

      {/* ─── Edit Template Dialog ────────────────── */}
      {editingTemplate && (
        <TemplateFormDialog
          open={editTemplateOpen}
          onOpenChange={(v) => {
            setEditTemplateOpen(v);
            if (!v) setEditingTemplate(null);
          }}
          title="Edit Template"
          initial={editingTemplate}
          defaultScope={editingTemplate.scope}
          onSubmit={(body) =>
            updateTemplateMutation.mutate({ id: editingTemplate.id, body })
          }
          submitting={updateTemplateMutation.isPending}
        />
      )}

      {/* ─── Add Item Dialog ─────────────────────── */}
      {addItemTemplateId && (
        <ItemFormDialog
          open={addItemOpen}
          onOpenChange={(v) => {
            setAddItemOpen(v);
            if (!v) setAddItemTemplateId(null);
          }}
          title="Add Item"
          onSubmit={(body) =>
            createItemMutation.mutate({ templateId: addItemTemplateId, body })
          }
          submitting={createItemMutation.isPending}
        />
      )}

      {/* ─── Edit Item Dialog ────────────────────── */}
      {editingItem && editItemTemplateId && (
        <ItemFormDialog
          open={editItemOpen}
          onOpenChange={(v) => {
            setEditItemOpen(v);
            if (!v) {
              setEditingItem(null);
              setEditItemTemplateId(null);
            }
          }}
          title="Edit Item"
          initial={editingItem}
          onSubmit={(body) =>
            updateItemMutation.mutate({
              templateId: editItemTemplateId,
              itemId: editingItem.id,
              body,
            })
          }
          submitting={updateItemMutation.isPending}
        />
      )}
    </div>
  );
}

/* ─── TemplateCard ─────────────────────────────── */

function TemplateCard({
  template,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: {
  template: ChecklistTemplate;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onAddItem: () => void;
  onEditItem: (item: ChecklistTemplateItem) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const itemsQuery = useQuery({
    queryKey: ['checklist-template-items', template.id],
    queryFn: () =>
      api.get<APIResponse<ChecklistTemplateItem[]>>(
        `/checklist-templates/${template.id}/items`
      ),
    enabled: isExpanded,
  });

  const items = itemsQuery.data?.data ?? [];
  const catLabel =
    CATEGORY_OPTIONS.find((c) => c.value === template.category)?.label ||
    template.category;

  return (
    <div
      className="crm-card"
      style={{
        overflow: 'hidden',
        opacity: template.is_active ? 1 : 0.6,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{template.name}</span>
            {template.is_default && (
              <span
                className="crm-pill blue"
                style={{ fontSize: 10 }}
              >
                <Shield size={9} style={{ marginRight: 2 }} />
                Default
              </span>
            )}
            <span className="crm-pill" style={{ fontSize: 10 }}>
              {catLabel}
            </span>
          </div>
          {template.description && (
            <div className="crm-caption" style={{ marginTop: 2, fontSize: 12 }}>
              {template.description}
            </div>
          )}
        </div>
        <span className="crm-caption" style={{ fontSize: 12, flexShrink: 0 }}>
          {template.item_count ?? 0} items
        </span>

        {/* Active toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={template.is_active}
            onChange={(e) => onToggleActive(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: 'var(--crm-text-3)' }}>Active</span>
        </label>

        {/* Actions */}
        <div
          style={{ display: 'flex', gap: 4, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="crm-btn ghost sm"
            onClick={onEdit}
            title="Edit template"
            style={{ padding: '4px 6px' }}
          >
            <Pencil size={13} />
          </button>
          <button
            className="crm-btn ghost sm"
            onClick={onDelete}
            title="Delete template"
            style={{ padding: '4px 6px', color: 'var(--crm-pink, #e11d48)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded items */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--crm-hairline)' }}>
          {itemsQuery.isLoading ? (
            <div
              style={{ padding: 20, textAlign: 'center' }}
              className="crm-caption"
            >
              Loading items...
            </div>
          ) : items.length === 0 ? (
            <div
              style={{ padding: 20, textAlign: 'center' }}
              className="crm-caption"
            >
              No items yet.
              <button
                className="crm-btn ghost sm"
                onClick={onAddItem}
                style={{ marginLeft: 8 }}
              >
                <Plus size={12} /> Add first item
              </button>
            </div>
          ) : (
            <>
              {items
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '20px 1fr auto auto auto auto',
                      gap: 10,
                      padding: '10px 16px 10px 32px',
                      alignItems: 'center',
                      borderTop:
                        idx > 0 ? '1px solid var(--crm-hairline)' : undefined,
                      fontSize: 13,
                    }}
                  >
                    <GripVertical
                      size={13}
                      style={{ color: 'var(--crm-text-4)', cursor: 'grab' }}
                    />
                    <div>
                      <span style={{ fontWeight: item.is_required ? 600 : 400 }}>
                        {item.title}
                      </span>
                      {item.description && (
                        <div
                          className="crm-caption"
                          style={{ fontSize: 11, marginTop: 2 }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.is_required && (
                      <span
                        className="crm-pill pink"
                        style={{ fontSize: 10 }}
                      >
                        Required
                      </span>
                    )}
                    {item.due_offset_days != null && (
                      <span
                        className="crm-caption"
                        style={{ fontSize: 11, flexShrink: 0 }}
                      >
                        D{item.due_offset_days >= 0 ? '+' : ''}{item.due_offset_days}
                      </span>
                    )}
                    {item.default_assignee_role && (
                      <span
                        className="crm-caption"
                        style={{ fontSize: 11, flexShrink: 0 }}
                      >
                        {ASSIGNEE_ROLES.find(
                          (r) => r.value === item.default_assignee_role
                        )?.label || item.default_assignee_role}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        className="crm-btn ghost sm"
                        onClick={() => onEditItem(item)}
                        style={{ padding: '3px 5px' }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="crm-btn ghost sm"
                        onClick={() => onDeleteItem(item.id)}
                        style={{
                          padding: '3px 5px',
                          color: 'var(--crm-pink, #e11d48)',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
            </>
          )}

          {/* Add Item button */}
          <div
            style={{
              padding: '10px 16px 10px 32px',
              borderTop: '1px solid var(--crm-hairline)',
            }}
          >
            <button className="crm-btn ghost sm" onClick={onAddItem}>
              <Plus size={12} /> Add Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TemplateFormDialog ───────────────────────── */

function TemplateFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  defaultScope,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: ChecklistTemplate;
  defaultScope: 'departure' | 'traveller';
  onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [scope, setScope] = useState<string>(initial?.scope ?? defaultScope);
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);

  // Reset form when dialog opens/closes
  function resetOnOpen() {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setScope(initial?.scope ?? defaultScope);
    setCategory(initial?.category ?? 'general');
    setIsDefault(initial?.is_default ?? false);
    setSortOrder(initial?.sort_order ?? 0);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetOnOpen();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initial ? 'Update template details.' : 'Create a new checklist template.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pre-departure logistics"
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid var(--crm-hairline)',
                background: 'var(--crm-bg)',
                color: 'var(--crm-text)',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => { if (v) setScope(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departure">Departure</SelectItem>
                  <SelectItem value="traveller">Traveller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Default Template</Label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  height: 40,
                }}
              >
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Auto-apply on initialize
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            className="crm-btn primary"
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                scope,
                category,
                is_default: isDefault,
                is_active: initial?.is_active ?? true,
                sort_order: sortOrder,
              })
            }
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Saving...' : initial ? 'Save Changes' : 'Create Template'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── ItemFormDialog ───────────────────────────── */

function ItemFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: ChecklistTemplateItem;
  onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [itemTitle, setItemTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isRequired, setIsRequired] = useState(initial?.is_required ?? false);
  const [dueOffsetDays, setDueOffsetDays] = useState<string>(
    initial?.due_offset_days?.toString() ?? ''
  );
  const [assigneeRole, setAssigneeRole] = useState(
    initial?.default_assignee_role ?? ''
  );
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);

  function resetOnOpen() {
    setItemTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setIsRequired(initial?.is_required ?? false);
    setDueOffsetDays(initial?.due_offset_days?.toString() ?? '');
    setAssigneeRole(initial?.default_assignee_role ?? '');
    setSortOrder(initial?.sort_order ?? 0);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetOnOpen();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initial ? 'Update item details.' : 'Add a new checklist item to this template.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Title *</Label>
            <Input
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="e.g. Book transport"
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional instructions"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid var(--crm-hairline)',
                background: 'var(--crm-bg)',
                color: 'var(--crm-text)',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Due Offset (days from departure)</Label>
              <Input
                type="number"
                value={dueOffsetDays}
                onChange={(e) => setDueOffsetDays(e.target.value)}
                placeholder="e.g. -7 for 7 days before"
              />
            </div>
            <div className="grid gap-2">
              <Label>Default Assignee Role</Label>
              <Select
                value={assigneeRole || 'none'}
                onValueChange={(v) => setAssigneeRole(!v || v === 'none' ? '' : v as string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {ASSIGNEE_ROLES.filter((r) => r.value).map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Required</Label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  height: 40,
                }}
              >
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                />
                Required item
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            className="crm-btn primary"
            onClick={() =>
              onSubmit({
                title: itemTitle.trim(),
                description: description.trim() || undefined,
                is_required: isRequired,
                due_offset_days: dueOffsetDays ? parseInt(dueOffsetDays) : undefined,
                default_assignee_role: assigneeRole || undefined,
                sort_order: sortOrder,
              })
            }
            disabled={submitting || !itemTitle.trim()}
          >
            {submitting ? 'Saving...' : initial ? 'Save Changes' : 'Add Item'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
