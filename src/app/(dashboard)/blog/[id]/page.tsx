'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { APIResponse } from '@/types/api';
import type { BlogPost } from '@/types/blog';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Send,
  Bold,
  Italic,
  Link2,
  Heading,
  List,
  Quote,
  Clock,
  CalendarClock,
  X,
  AlertTriangle,
} from 'lucide-react';

/* ── helpers ────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Minimal markdown to HTML renderer. Handles the basics:
 * headings, bold, italic, links, lists, blockquotes, paragraphs, hr, code.
 */
function renderMarkdown(md: string): string {
  let html = md
    // code blocks
    .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--crm-bg-elev);padding:12px 16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.5"><code>$1</code></pre>')
    // inline code
    .replace(/`([^`]+)`/g, '<code style="background:var(--crm-bg-elev);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>')
    // headings
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 8px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:20px 0 8px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:700;margin:24px 0 10px">$1</h1>')
    // hr
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--crm-hairline);margin:20px 0" />')
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--crm-accent);padding-left:12px;margin:12px 0;color:var(--crm-text-2);font-style:italic">$1</blockquote>')
    // unordered list
    .replace(/^- (.+)$/gm, '<li style="margin-left:20px;list-style-type:disc">$1</li>')
    // ordered list
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;list-style-type:decimal">$1</li>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--crm-accent);text-decoration:underline">$1</a>')
    // images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:12px 0" />');

  // Wrap orphan lines in <p> tags
  html = html
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|blockquote|pre|hr|ul|ol|li|div|img)/.test(trimmed)) return trimmed;
      return `<p style="margin:0 0 12px;line-height:1.65">${trimmed}</p>`;
    })
    .join('\n');

  return html;
}

/* ── status configs ─────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  draft: '',
  published: 'green',
  scheduled: 'amber',
  archived: 'red',
};

/* ── page ───────────────────────────────────────── */

export default function BlogEditorPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const postId = params.id as string;
  const isNew = postId === 'new';

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Loaded post data for status, dates, counts
  const [currentStatus, setCurrentStatus] = useState<BlogPost['status']>('draft');
  const [publishedAt, setPublishedAt] = useState<string | undefined>();
  const [viewCount, setViewCount] = useState(0);
  const [authorName, setAuthorName] = useState('');

  // Reading time
  const readingTime = useMemo(() => estimateReadingTime(body), [body]);

  // Fetch existing post
  const { data: postData, isLoading } = useQuery({
    queryKey: ['blog-post', postId],
    queryFn: () => api.get<APIResponse<BlogPost>>(`/blog/${postId}`),
    enabled: !isNew,
  });

  // Fetch categories for autocomplete
  const { data: categoriesData } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => api.get<APIResponse<string[]>>('/blog/categories'),
  });

  // Fetch tags for autocomplete
  const { data: tagsData } = useQuery({
    queryKey: ['blog-tags'],
    queryFn: () => api.get<APIResponse<string[]>>('/blog/tags'),
  });

  const existingCategories = categoriesData?.data ?? [];
  const existingTags = tagsData?.data ?? [];

  // Load post data into form
  useEffect(() => {
    if (postData?.data) {
      const p = postData.data;
      setTitle(p.title);
      setSlug(p.slug);
      setBody(p.body || '');
      setExcerpt(p.excerpt || '');
      setFeaturedImageUrl(p.featured_image_url || null);
      setCategory(p.category || '');
      setTags(p.tags || []);
      setMetaTitle(p.meta_title || '');
      setMetaDescription(p.meta_description || '');
      setIsFeatured(p.is_featured);
      setAllowComments(p.allow_comments);
      setScheduledAt(p.scheduled_at || '');
      setCurrentStatus(p.status);
      setPublishedAt(p.published_at);
      setViewCount(p.view_count);
      setAuthorName(p.author_name || '');
      setDirty(false);
    }
  }, [postData]);

  // Set author name for new posts
  useEffect(() => {
    if (isNew && user?.name) {
      setAuthorName(user.name);
    }
  }, [isNew, user]);

  // Auto-generate slug from title (debounced)
  useEffect(() => {
    if (slugManual) return;
    const timer = setTimeout(() => {
      setSlug(slugify(title));
    }, 300);
    return () => clearTimeout(timer);
  }, [title, slugManual]);

  // Mark dirty on any change
  const markDirty = useCallback(() => setDirty(true), []);

  // Wrap setters to mark dirty
  function updateTitle(v: string) { setTitle(v); markDirty(); }
  function updateBody(v: string) { setBody(v); markDirty(); }
  function updateExcerpt(v: string) { setExcerpt(v); markDirty(); }
  function updateCategory(v: string) { setCategory(v); markDirty(); }
  function updateMetaTitle(v: string) { setMetaTitle(v); markDirty(); }
  function updateMetaDescription(v: string) { setMetaDescription(v); markDirty(); }

  // Build payload
  function buildPayload(): Record<string, unknown> {
    return {
      title,
      slug,
      body,
      excerpt: excerpt || undefined,
      featured_image_url: featuredImageUrl || undefined,
      category: category || undefined,
      tags,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
      is_featured: isFeatured,
      allow_comments: allowComments,
      scheduled_at: scheduledAt || undefined,
    };
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<BlogPost>>('/blog', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Post created');
      setDirty(false);
      router.replace(`/blog/${res.data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create post');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.put<APIResponse<BlogPost>>(`/blog/${postId}`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      const p = res.data;
      setCurrentStatus(p.status);
      setPublishedAt(p.published_at);
      setDirty(false);
      toast.success('Post saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save post');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post<APIResponse<BlogPost>>(`/blog/${postId}/publish`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      setCurrentStatus(res.data.status);
      setPublishedAt(res.data.published_at);
      toast.success('Post published');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to publish');
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => api.post<APIResponse<BlogPost>>(`/blog/${postId}/unpublish`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['blog-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      setCurrentStatus(res.data.status);
      toast.success('Post unpublished');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to unpublish');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<APIResponse<null>>(`/blog/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Post deleted');
      router.push('/blog');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete');
    },
  });

  // Save handler
  const handleSave = useCallback(() => {
    const payload = buildPayload();
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  }, [isNew, title, slug, body, excerpt, featuredImageUrl, category, tags, metaTitle, metaDescription, isFeatured, allowComments, scheduledAt, postId]);

  // Cmd+S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Markdown toolbar insert helpers
  function insertMarkdown(prefix: string, suffix: string = '', placeholder: string = '') {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const insertion = selected || placeholder;
    const newText = body.substring(0, start) + prefix + insertion + suffix + body.substring(end);
    updateBody(newText);
    // Refocus and set cursor
    setTimeout(() => {
      ta.focus();
      const cursorPos = start + prefix.length + insertion.length + suffix.length;
      ta.setSelectionRange(
        selected ? cursorPos : start + prefix.length,
        selected ? cursorPos : start + prefix.length + insertion.length
      );
    }, 0);
  }

  // Tags handling
  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      markDirty();
    }
    setTagsInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
    markDirty();
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagsInput);
    }
    if (e.key === 'Backspace' && !tagsInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  // SEO preview
  const seoTitle = metaTitle || title || 'Post title';
  const seoDesc = metaDescription || excerpt || 'Your post description will appear here...';
  const seoUrl = `yoursite.com/blog/${slug || 'post-slug'}`;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div style={{ padding: '32px 36px', textAlign: 'center' }}>
        <span className="crm-caption">Loading post...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 36px 48px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link href="/blog" style={{ textDecoration: 'none', color: 'var(--crm-text-2)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ArrowLeft size={14} />
          All posts
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dirty && (
            <span className="crm-caption" style={{ color: 'var(--crm-amber)' }}>Unsaved changes</span>
          )}
          <button
            className="crm-btn primary"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            style={{ gap: 6 }}
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : isNew ? 'Create post' : 'Save'}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* ─── Left column: Content ───────────────── */}
        <div className="crm-stack crm-gap-16">
          {/* Title */}
          <div className="crm-card crm-card-pad">
            <input
              type="text"
              placeholder="Post title"
              value={title}
              onChange={(e) => updateTitle(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--crm-text)',
                background: 'transparent',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.3,
              }}
            />

            {/* Slug */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span className="crm-caption" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>/blog/</span>
              {slugEditing ? (
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true); markDirty(); }}
                  onBlur={() => setSlugEditing(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSlugEditing(false); }}
                  autoFocus
                  style={{
                    border: 'none',
                    borderBottom: '1px solid var(--crm-accent)',
                    outline: 'none',
                    fontSize: 12,
                    color: 'var(--crm-text-2)',
                    background: 'transparent',
                    fontFamily: 'var(--font-sans)',
                    flex: 1,
                    padding: '2px 0',
                  }}
                />
              ) : (
                <span
                  className="crm-caption"
                  style={{ cursor: 'pointer', fontSize: 12, borderBottom: '1px dashed var(--crm-hairline)' }}
                  onClick={() => setSlugEditing(true)}
                  title="Click to edit slug"
                >
                  {slug || 'post-slug'}
                </span>
              )}
            </div>
          </div>

          {/* Body editor */}
          <div className="crm-card" style={{ overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '8px 16px',
              borderBottom: '1px solid var(--crm-hairline)',
              flexWrap: 'wrap',
            }}>
              <button
                className="crm-btn ghost sm"
                onClick={() => insertMarkdown('**', '**', 'bold text')}
                title="Bold (Cmd+B)"
                style={{ minWidth: 32 }}
              >
                <Bold size={14} />
              </button>
              <button
                className="crm-btn ghost sm"
                onClick={() => insertMarkdown('*', '*', 'italic text')}
                title="Italic"
                style={{ minWidth: 32 }}
              >
                <Italic size={14} />
              </button>
              <button
                className="crm-btn ghost sm"
                onClick={() => insertMarkdown('[', '](url)', 'link text')}
                title="Link"
                style={{ minWidth: 32 }}
              >
                <Link2 size={14} />
              </button>
              <span style={{ width: 1, height: 16, background: 'var(--crm-hairline)', margin: '0 4px' }} />
              <button
                className="crm-btn ghost sm"
                onClick={() => insertMarkdown('## ', '', 'Heading')}
                title="Heading"
                style={{ minWidth: 32 }}
              >
                <Heading size={14} />
              </button>
              <button
                className="crm-btn ghost sm"
                onClick={() => insertMarkdown('- ', '', 'List item')}
                title="List"
                style={{ minWidth: 32 }}
              >
                <List size={14} />
              </button>
              <button
                className="crm-btn ghost sm"
                onClick={() => insertMarkdown('> ', '', 'Quote')}
                title="Quote"
                style={{ minWidth: 32 }}
              >
                <Quote size={14} />
              </button>

              <div style={{ flex: 1 }} />

              <button
                className={`crm-btn sm ${showPreview ? 'primary' : 'ghost'}`}
                onClick={() => setShowPreview(!showPreview)}
                style={{ gap: 4 }}
              >
                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {/* Content area */}
            {showPreview ? (
              <div
                style={{
                  padding: '24px 24px',
                  minHeight: 400,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: 'var(--crm-text)',
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(body) || '<p style="color:var(--crm-text-3)">Nothing to preview yet...</p>' }}
              />
            ) : (
              <textarea
                ref={bodyRef}
                placeholder="Write your post content here... (Markdown supported)"
                value={body}
                onChange={(e) => updateBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 400,
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--crm-text)',
                  background: 'transparent',
                  fontFamily: 'var(--font-sans)',
                  padding: '20px 24px',
                  display: 'block',
                }}
              />
            )}
          </div>

          {/* Excerpt */}
          <div className="crm-card crm-card-pad">
            <label className="crm-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Excerpt</label>
            <textarea
              placeholder="Write a short summary for this post... (shown in listings and social shares)"
              value={excerpt}
              onChange={(e) => updateExcerpt(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--crm-text)',
                background: 'transparent',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </div>

        {/* ─── Right column: Sidebar ─────────────── */}
        <div className="crm-stack crm-gap-16">
          {/* Status card */}
          <div className="crm-card crm-card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>Status</h3>
              <span className={`crm-pill ${STATUS_COLORS[currentStatus] ?? ''}`}>
                <span className="dot" />
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </span>
            </div>

            {publishedAt && (
              <div className="crm-caption" style={{ marginBottom: 10, fontSize: 12 }}>
                Published {formatDate(publishedAt)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* For new posts: just save */}
              {isNew ? (
                <button
                  className="crm-btn primary"
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  style={{ gap: 6, width: '100%', justifyContent: 'center' }}
                >
                  <Save size={14} />
                  {isSaving ? 'Creating...' : 'Save as draft'}
                </button>
              ) : (
                <>
                  {/* Save draft */}
                  <button
                    className="crm-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ gap: 6, width: '100%', justifyContent: 'center' }}
                  >
                    <Save size={14} />
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>

                  {/* Publish / Unpublish */}
                  {currentStatus === 'published' ? (
                    <button
                      className="crm-btn ghost"
                      onClick={() => unpublishMutation.mutate()}
                      disabled={unpublishMutation.isPending}
                      style={{ gap: 6, width: '100%', justifyContent: 'center' }}
                    >
                      <EyeOff size={14} />
                      {unpublishMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
                    </button>
                  ) : (
                    <button
                      className="crm-btn primary"
                      onClick={() => {
                        // Save first, then publish
                        updateMutation.mutate(buildPayload(), {
                          onSuccess: () => publishMutation.mutate(),
                        });
                      }}
                      disabled={publishMutation.isPending || updateMutation.isPending}
                      style={{ gap: 6, width: '100%', justifyContent: 'center' }}
                    >
                      <Send size={14} />
                      {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Schedule option */}
            {!isNew && currentStatus !== 'published' && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--crm-hairline)' }}>
                <label className="crm-caption" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <CalendarClock size={12} />
                  Schedule publication
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt ? scheduledAt.slice(0, 16) : ''}
                  onChange={(e) => {
                    setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : '');
                    markDirty();
                  }}
                  style={{
                    width: '100%',
                    border: '1px solid var(--crm-hairline)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    color: 'var(--crm-text)',
                    background: 'var(--crm-bg-elev)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Featured Image card */}
          <div className="crm-card crm-card-pad">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.005em' }}>Featured Image</h3>
            {featuredImageUrl ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={featuredImageUrl}
                  alt="Featured"
                  style={{
                    width: '100%',
                    height: 180,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid var(--crm-hairline)',
                  }}
                />
                <button
                  onClick={() => { setFeaturedImageUrl(null); markDirty(); }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <FileUpload
                value={null}
                onChange={(url) => { setFeaturedImageUrl(url); markDirty(); }}
                accept="image/*"
                label=""
              />
            )}
          </div>

          {/* Organisation card */}
          <div className="crm-card crm-card-pad">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.005em' }}>Organisation</h3>

            {/* Author */}
            <div style={{ marginBottom: 12 }}>
              <label className="crm-caption" style={{ display: 'block', marginBottom: 4 }}>Author</label>
              <div style={{ fontSize: 13, color: 'var(--crm-text-2)' }}>
                {authorName || user?.name || 'Unknown'}
              </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 12 }}>
              <label className="crm-caption" style={{ display: 'block', marginBottom: 4 }}>Category</label>
              <input
                type="text"
                list="blog-categories-list"
                placeholder="e.g. Destinations"
                value={category}
                onChange={(e) => updateCategory(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--crm-hairline)',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 13,
                  color: 'var(--crm-text)',
                  background: 'var(--crm-bg-elev)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              />
              <datalist id="blog-categories-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Tags */}
            <div>
              <label className="crm-caption" style={{ display: 'block', marginBottom: 4 }}>Tags</label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: '6px 10px',
                border: '1px solid var(--crm-hairline)',
                borderRadius: 6,
                background: 'var(--crm-bg-elev)',
                minHeight: 36,
                alignItems: 'center',
              }}>
                {tags.map(tag => (
                  <span key={tag} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: 'var(--crm-accent-bg, rgba(59,130,246,0.1))',
                    color: 'var(--crm-accent)',
                    fontSize: 11,
                    fontWeight: 500,
                  }}>
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--crm-accent)',
                      }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  list="blog-tags-list"
                  placeholder={tags.length === 0 ? 'Type and press Enter...' : ''}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagsInput.trim()) addTag(tagsInput); }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    color: 'var(--crm-text)',
                    background: 'transparent',
                    fontFamily: 'var(--font-sans)',
                    flex: 1,
                    minWidth: 80,
                    padding: 0,
                  }}
                />
                <datalist id="blog-tags-list">
                  {existingTags.filter(t => !tags.includes(t)).map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* SEO card */}
          <div className="crm-card crm-card-pad">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.005em' }}>SEO</h3>

            {/* Meta title */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="crm-caption">Meta title</label>
                <span className="crm-caption" style={{
                  color: (metaTitle || title).length > 60 ? 'var(--crm-red)' : 'var(--crm-text-4)',
                }}>
                  {(metaTitle || title).length}/60
                </span>
              </div>
              <input
                type="text"
                placeholder={title || 'Post title'}
                value={metaTitle}
                onChange={(e) => updateMetaTitle(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--crm-hairline)',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 13,
                  color: 'var(--crm-text)',
                  background: 'var(--crm-bg-elev)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Meta description */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="crm-caption">Meta description</label>
                <span className="crm-caption" style={{
                  color: (metaDescription || excerpt).length > 160 ? 'var(--crm-red)' : 'var(--crm-text-4)',
                }}>
                  {(metaDescription || excerpt).length}/160
                </span>
              </div>
              <textarea
                placeholder={excerpt || 'A brief description for search engines...'}
                value={metaDescription}
                onChange={(e) => updateMetaDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid var(--crm-hairline)',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--crm-text)',
                  background: 'var(--crm-bg-elev)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Google preview */}
            <div style={{
              padding: 16,
              borderRadius: 8,
              background: 'var(--crm-bg-canvas)',
              border: '1px solid var(--crm-hairline)',
            }}>
              <div className="crm-caption" style={{ marginBottom: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Search preview
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1a0dab', marginBottom: 2, lineHeight: 1.3 }}>
                {seoTitle.length > 60 ? seoTitle.slice(0, 60) + '...' : seoTitle}
              </div>
              <div style={{ fontSize: 12, color: '#006621', marginBottom: 4 }}>
                {seoUrl}
              </div>
              <div style={{ fontSize: 12, color: '#545454', lineHeight: 1.5 }}>
                {seoDesc.length > 160 ? seoDesc.slice(0, 160) + '...' : seoDesc}
              </div>
            </div>
          </div>

          {/* Settings card */}
          <div className="crm-card crm-card-pad">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.005em' }}>Settings</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Featured toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => { setIsFeatured(e.target.checked); markDirty(); }}
                  style={{ width: 16, height: 16, accentColor: 'var(--crm-accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13 }}>Featured post</span>
              </label>

              {/* Allow comments toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => { setAllowComments(e.target.checked); markDirty(); }}
                  style={{ width: 16, height: 16, accentColor: 'var(--crm-accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13 }}>Allow comments</span>
              </label>

              {/* Reading time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} style={{ color: 'var(--crm-text-3)' }} />
                <span className="crm-caption">{readingTime} min read (estimated)</span>
              </div>

              {/* View count */}
              {!isNew && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Eye size={14} style={{ color: 'var(--crm-text-3)' }} />
                  <span className="crm-caption">{viewCount.toLocaleString()} view{viewCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Danger zone */}
          {!isNew && (
            <div className="crm-card crm-card-pad" style={{ borderColor: 'var(--crm-red)', borderWidth: 1 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--crm-red)', letterSpacing: '-0.005em' }}>Danger Zone</h3>
              <p className="crm-caption" style={{ marginBottom: 12, fontSize: 12 }}>
                Deleting a post is permanent and cannot be undone.
              </p>
              <button
                className="crm-btn ghost sm"
                onClick={() => setDeleteOpen(true)}
                style={{ color: 'var(--crm-red)', gap: 6 }}
              >
                <Trash2 size={13} />
                Delete post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <AlertTriangle size={20} style={{ color: 'var(--crm-red)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  Are you sure you want to delete <strong>{title || 'this post'}</strong>?
                </p>
                <p className="crm-caption">This action cannot be undone.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{ background: 'var(--crm-red)', color: '#fff', gap: 6 }}
            >
              <Trash2 size={13} />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
