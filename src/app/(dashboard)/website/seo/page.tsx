'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@/lib/templates';
import type { SiteConfig } from '@/types/website-template';

interface WebsiteConfigResponse {
  data: {
    template_id: string;
    config: SiteConfig;
  };
}
import {
  Save,
  Search,
  Globe,
  Image,
  Code,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

const template = getTemplate(DEFAULT_TEMPLATE_ID)!;

function Field({
  label,
  value,
  onChange,
  multiline,
  mono,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  mono?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const shared = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    placeholder,
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid var(--crm-hairline)',
      borderRadius: 'var(--crm-radius-sm)',
      fontSize: 13,
      fontFamily: mono ? 'monospace' : 'inherit',
      background: 'var(--crm-bg-canvas)',
      color: 'var(--crm-text)',
      lineHeight: 1.5,
      resize: 'vertical' as const,
    },
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 5 }}>
        {label}
      </label>
      {multiline ? <textarea {...shared} rows={3} /> : <input type="text" {...shared} />}
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--crm-text-4)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Info size={11} /> {hint}
        </div>
      )}
    </div>
  );
}

function ScoreIndicator({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? 'var(--crm-green)' : pct >= 50 ? 'var(--crm-amber)' : 'var(--crm-red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ height: 4, background: 'var(--crm-bg-3)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color, minWidth: 40, textAlign: 'right' }}>{score}/{max}</div>
    </div>
  );
}

function SeoCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
      {ok ? <CheckCircle2 size={15} style={{ color: 'var(--crm-green)', flexShrink: 0 }} /> : <AlertCircle size={15} style={{ color: 'var(--crm-amber)', flexShrink: 0 }} />}
      <span style={{ color: ok ? 'var(--crm-text-2)' : 'var(--crm-text)' }}>{label}</span>
    </div>
  );
}

export default function SeoPage() {
  const [fullConfig, setFullConfig] = useState<SiteConfig>(
    JSON.parse(JSON.stringify(template.defaults))
  );
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [seo, setSeo] = useState(JSON.parse(JSON.stringify(template.defaults.seo)) as SiteConfig['seo']);
  const [keywords, setKeywords] = useState(seo.keywords.join(', '));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get<WebsiteConfigResponse>('/website/config');
        if (cancelled) return;
        if (resp?.data?.config && Object.keys(resp.data.config).length > 0) {
          const merged: SiteConfig = {
            ...JSON.parse(JSON.stringify(template.defaults)),
            ...resp.data.config,
          };
          setFullConfig(merged);
          setTemplateId(resp.data.template_id || DEFAULT_TEMPLATE_ID);
          if (merged.seo) {
            setSeo(merged.seo);
            setKeywords((merged.seo.keywords || []).join(', '));
          }
        }
      } catch (err) {
        if (!(err instanceof Error && /not found|no website config/i.test(err.message))) {
          console.warn('Failed to load website config:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const nextConfig: SiteConfig = { ...fullConfig, seo };
      await api.put('/website/config', {
        template_id: templateId,
        config: nextConfig,
      });
      setFullConfig(nextConfig);
      toast.success('SEO settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [fullConfig, seo, templateId]);

  const titleLen = seo.title.length;
  const descLen = seo.description.length;
  const titleOk = titleLen >= 30 && titleLen <= 70;
  const descOk = descLen >= 120 && descLen <= 160;
  const hasKeywords = seo.keywords.length >= 3;
  const hasOgImage = !!seo.ogImage;
  const hasStructuredData = !!seo.structuredData;
  const checksPass = [titleOk, descOk, hasKeywords, hasStructuredData].filter(Boolean).length;

  return (
    <div className="crm-stack" style={{ gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '32px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="crm-eyebrow">Website</div>
          <h1 className="crm-title-1" style={{ marginTop: 4 }}>SEO Settings</h1>
          <p style={{ color: 'var(--crm-text-3)', marginTop: 6, maxWidth: 520, lineHeight: 1.55 }}>
            Configure how your landing page appears in search engines and social media shares. Trip-level SEO is managed within each trip.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="crm-btn crm-btn-sm crm-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, opacity: saving || loading ? 0.6 : 1, cursor: saving || loading ? 'not-allowed' : 'pointer' }}
        >
          <Save size={14} /> {saving ? 'Saving…' : loading ? 'Loading…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Main form */}
        <div>
          {/* Basic Meta */}
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={13} /> Meta Tags
            </div>
            <Field
              label={`Page Title (${titleLen}/70 chars)`}
              value={seo.title}
              onChange={(v) => setSeo({ ...seo, title: v })}
              hint="Recommended: 30-70 characters. This appears as the clickable headline in search results."
            />
            <Field
              label={`Meta Description (${descLen}/160 chars)`}
              value={seo.description}
              onChange={(v) => setSeo({ ...seo, description: v })}
              multiline
              hint="Recommended: 120-160 characters. This appears below the title in search results."
            />
            <Field
              label="Keywords"
              value={keywords}
              onChange={(v) => { setKeywords(v); setSeo({ ...seo, keywords: v.split(',').map(k => k.trim()).filter(Boolean) }); }}
              hint="Comma-separated keywords. 5-10 keywords recommended."
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field
                label="Robots"
                value={seo.robots}
                onChange={(v) => setSeo({ ...seo, robots: v })}
                mono
                hint="e.g. index, follow"
              />
              <Field
                label="Locale"
                value={seo.locale}
                onChange={(v) => setSeo({ ...seo, locale: v })}
                mono
                hint="e.g. en_IN, en_US"
              />
            </div>
            <Field
              label="Canonical URL"
              value={seo.canonicalUrl || ''}
              onChange={(v) => setSeo({ ...seo, canonicalUrl: v || undefined })}
              mono
              placeholder="https://www.yourdomain.com"
              hint="Set this to avoid duplicate content issues if you have multiple URLs pointing to the same page."
            />
          </div>

          {/* Open Graph */}
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={13} /> Open Graph (Social Sharing)
            </div>
            <Field
              label="OG Type"
              value={seo.ogType}
              onChange={(v) => setSeo({ ...seo, ogType: v })}
              mono
              hint="Usually 'website' for landing pages"
            />
            <Field
              label="OG Image URL"
              value={seo.ogImage || ''}
              onChange={(v) => setSeo({ ...seo, ogImage: v || undefined })}
              mono
              placeholder="https://... (1200×630px recommended)"
              hint="The image shown when your page is shared on social media. Recommended: 1200×630px."
            />
          </div>

          {/* Structured Data */}
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code size={13} /> Structured Data (JSON-LD)
            </div>
            {seo.structuredData && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Field
                    label="Schema Type"
                    value={seo.structuredData.type}
                    onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, type: v } })}
                    mono
                    hint="e.g. TravelAgency, LocalBusiness, Organization"
                  />
                  <Field
                    label="Business Name"
                    value={seo.structuredData.name}
                    onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, name: v } })}
                  />
                </div>
                <Field
                  label="Business Description"
                  value={seo.structuredData.description}
                  onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, description: v } })}
                  multiline
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Field
                    label="Website URL"
                    value={seo.structuredData.url || ''}
                    onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, url: v || undefined } })}
                    mono
                  />
                  <Field
                    label="Phone"
                    value={seo.structuredData.phone || ''}
                    onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, phone: v || undefined } })}
                  />
                </div>
                <Field
                  label="Price Range"
                  value={seo.structuredData.priceRange || ''}
                  onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, priceRange: v || undefined } })}
                  hint="e.g. $$, $$$"
                />
                {seo.structuredData.address && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-4)', margin: '16px 0 8px' }}>Address</div>
                    <Field label="Street" value={seo.structuredData.address.street} onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, address: { ...seo.structuredData!.address!, street: v } } })} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
                      <Field label="City" value={seo.structuredData.address.city} onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, address: { ...seo.structuredData!.address!, city: v } } })} />
                      <Field label="Region" value={seo.structuredData.address.region} onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, address: { ...seo.structuredData!.address!, region: v } } })} />
                      <Field label="Postal Code" value={seo.structuredData.address.postalCode} onChange={(v) => setSeo({ ...seo, structuredData: { ...seo.structuredData!, address: { ...seo.structuredData!.address!, postalCode: v } } })} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar: Score + Preview */}
        <div>
          {/* SEO Score */}
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 12 }}>
              SEO Score
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: checksPass >= 3 ? 'var(--crm-green)' : 'var(--crm-amber)' }}>
              {checksPass}/4
            </div>
            <div style={{ marginTop: 12 }}>
              <SeoCheck ok={titleOk} label={titleOk ? 'Title length is optimal' : `Title is ${titleLen < 30 ? 'too short' : 'too long'} (${titleLen} chars)`} />
              <SeoCheck ok={descOk} label={descOk ? 'Description length is optimal' : `Description is ${descLen < 120 ? 'too short' : 'too long'} (${descLen} chars)`} />
              <SeoCheck ok={hasKeywords} label={hasKeywords ? `${seo.keywords.length} keywords set` : 'Add at least 3 keywords'} />
              <SeoCheck ok={hasStructuredData} label={hasStructuredData ? 'Structured data configured' : 'Add structured data'} />
            </div>
          </div>

          {/* Google Preview */}
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={13} /> Google Preview
            </div>
            <div style={{ background: '#fff', border: '1px solid #dfe1e5', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#202124', fontFamily: 'Arial, sans-serif', marginBottom: 2 }}>
                {seo.canonicalUrl || 'www.yourdomain.com'}
              </div>
              <div style={{ fontSize: 18, color: '#1a0dab', fontFamily: 'Arial, sans-serif', lineHeight: 1.3, marginBottom: 4, cursor: 'pointer' }}>
                {seo.title || 'Page Title'}
              </div>
              <div style={{ fontSize: 13, color: '#4d5156', fontFamily: 'Arial, sans-serif', lineHeight: 1.4 }}>
                {seo.description ? seo.description.slice(0, 160) : 'Page description will appear here...'}
              </div>
            </div>
          </div>

          {/* Social Preview */}
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image size={13} /> Social Share Preview
            </div>
            <div style={{ border: '1px solid #dfe1e5', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: 120, background: seo.ogImage ? `url(${seo.ogImage}) center/cover` : 'linear-gradient(135deg, #f0ebe3, #d4c5b0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!seo.ogImage && <Image size={32} style={{ color: '#999' }} />}
              </div>
              <div style={{ padding: '10px 14px', background: '#f0f0f0' }}>
                <div style={{ fontSize: 11, color: '#65676b', textTransform: 'uppercase' }}>
                  {seo.canonicalUrl?.replace(/https?:\/\//, '').split('/')[0] || 'yourdomain.com'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1e21', marginTop: 2 }}>{seo.title || 'Page Title'}</div>
                <div style={{ fontSize: 12, color: '#65676b', marginTop: 2 }}>{seo.description?.slice(0, 100) || 'Description...'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
