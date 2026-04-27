'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { BlogPost } from '@/types/blog';
import Link from 'next/link';
import {
  PenLine,
  Search,
  Eye,
  Clock,
  Plus,
  FileText,
  Tag,
  User,
} from 'lucide-react';

/* ── helpers ────────────────────────────────────── */

const STATUS_OPTIONS = ['all', 'draft', 'published', 'scheduled', 'archived'] as const;

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'var(--crm-text-3)', bg: 'var(--crm-text-3)' },
  published: { label: 'Published', color: 'var(--crm-green)', bg: 'var(--crm-green)' },
  scheduled: { label: 'Scheduled', color: 'var(--crm-amber)', bg: 'var(--crm-amber)' },
  archived: { label: 'Archived', color: 'var(--crm-red)', bg: 'var(--crm-red)' },
};

function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

/* ── page ───────────────────────────────────────── */

export default function BlogListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch blog posts
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['blog-posts', statusFilter, categoryFilter, search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search) params.set('search', search);
      params.set('sort', 'created_at');
      params.set('order', 'desc');
      params.set('page', String(page));
      params.set('per_page', '30');
      return api.get<APIResponse<BlogPost[]>>(`/blog?${params}`);
    },
  });

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => api.get<APIResponse<string[]>>('/blog/categories'),
  });

  const posts = postsData?.data ?? [];
  const total = postsData?.meta?.total ?? 0;
  const categories = categoriesData?.data ?? [];

  // Client-side search fallback (server does it, but filter visible too)
  const filtered = posts;

  // Stats
  const draftCount = posts.filter(p => p.status === 'draft').length;
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0);

  return (
    <div style={{ padding: '32px 36px 48px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="crm-page-title">Blog Posts</h1>
          <p className="crm-caption" style={{ marginTop: 4 }}>{total} post{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/blog/new" style={{ textDecoration: 'none' }}>
          <button className="crm-btn primary" style={{ gap: 6 }}>
            <Plus size={14} />
            New post
          </button>
        </Link>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total posts', value: String(total), icon: FileText, color: 'var(--crm-accent)', bg: 'var(--crm-accent-bg)' },
          { label: 'Published', value: String(publishedCount), icon: Eye, color: 'var(--crm-green)', bg: 'var(--crm-green-bg)' },
          { label: 'Drafts', value: String(draftCount), icon: PenLine, color: 'var(--crm-amber)', bg: 'var(--crm-amber-bg)' },
          { label: 'Total views', value: totalViews.toLocaleString(), icon: Eye, color: 'var(--crm-accent)', bg: 'var(--crm-accent-bg)' },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="crm-card crm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="crm-eyebrow">{k.label}</span>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: k.bg,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon size={14} style={{ color: k.color }} />
                </span>
              </div>
              <span className="crm-title-1 crm-tabular">{isLoading ? '...' : k.value}</span>
            </div>
          );
        })}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="crm-seg">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              className={statusFilter === s ? 'on' : ''}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            style={{
              background: 'var(--crm-bg-elev)',
              border: '1px solid var(--crm-hairline)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              color: 'var(--crm-text)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            <option value="">All categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div className="crm-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
          <Search size={14} style={{ color: 'var(--crm-text-3)' }} />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--crm-text)',
              width: 200,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <span className="crm-caption">Loading posts...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <PenLine size={40} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--crm-text)' }}>
            {search || statusFilter !== 'all' ? 'No posts match your filters' : 'Start your blog'}
          </h3>
          <p className="crm-caption" style={{ marginBottom: 16, maxWidth: 360, margin: '0 auto 16px' }}>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Share destination guides, trip stories, and travel tips with your audience. Your first post is just a click away.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link href="/blog/new" style={{ textDecoration: 'none' }}>
              <button className="crm-btn primary" style={{ gap: 6 }}>
                <Plus size={14} />
                Write your first post
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Post grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map((post) => {
              const sc = STATUS_COLORS[post.status] ?? STATUS_COLORS.draft;
              return (
                <div
                  key={post.id}
                  className="crm-card"
                  style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  onClick={() => router.push(`/blog/${post.id}`)}
                >
                  {/* Featured image */}
                  {post.featured_image_url ? (
                    <div style={{ height: 160, overflow: 'hidden', background: 'var(--crm-bg-canvas)' }}>
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      height: 80,
                      background: 'linear-gradient(135deg, var(--crm-bg-elev) 0%, var(--crm-hairline) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <PenLine size={24} style={{ color: 'var(--crm-text-4)' }} />
                    </div>
                  )}

                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Status + category row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className={`crm-pill ${post.status === 'published' ? 'green' : post.status === 'scheduled' ? 'amber' : post.status === 'archived' ? 'red' : ''}`}>
                        <span className="dot" />
                        {sc.label}
                      </span>
                      {post.category && (
                        <span className="crm-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Tag size={10} />
                          {post.category}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.008em', lineHeight: 1.3 }}>
                      {post.title || 'Untitled post'}
                    </div>

                    {/* Excerpt */}
                    {post.excerpt && (
                      <div style={{
                        fontSize: 13,
                        color: 'var(--crm-text-2)',
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {post.excerpt}
                      </div>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'var(--crm-bg-elev)',
                            color: 'var(--crm-text-3)',
                            fontWeight: 500,
                          }}>
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span style={{ fontSize: 10, color: 'var(--crm-text-4)' }}>+{post.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Meta row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 12,
                      color: 'var(--crm-text-3)',
                      marginTop: 4,
                      flexWrap: 'wrap',
                    }}>
                      {post.author_name && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <User size={11} />
                          {post.author_name}
                        </span>
                      )}
                      {post.reading_time_minutes > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} />
                          {post.reading_time_minutes} min read
                        </span>
                      )}
                      {post.view_count > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Eye size={11} />
                          {post.view_count.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="crm-caption" style={{ fontSize: 11 }}>
                      {post.status === 'published' && post.published_at
                        ? `Published ${timeAgo(post.published_at)}`
                        : post.status === 'scheduled' && post.scheduled_at
                          ? `Scheduled for ${formatDate(post.scheduled_at)}`
                          : `Updated ${timeAgo(post.updated_at)}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {postsData?.meta && postsData.meta.total > postsData.meta.per_page && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button
                className="crm-btn sm ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="crm-caption" style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                Page {page} of {Math.ceil(postsData.meta.total / postsData.meta.per_page)}
              </span>
              <button
                className="crm-btn sm ghost"
                disabled={page >= Math.ceil(postsData.meta.total / postsData.meta.per_page)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
