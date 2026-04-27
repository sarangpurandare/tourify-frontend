'use client';

import { useState, useCallback, useEffect } from 'react';
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
  Eye,
  Save,
  ChevronDown,
  Building2,
  Type,
  BookOpen,
  Compass,
  Lightbulb,
  Star,
  Users,
  MessageSquareQuote,
  MapPin,
  BarChart3,
  Newspaper,
  HelpCircle,
  Megaphone,
  PanelBottom,
  Plane,
  Plus,
  Trash2,
} from 'lucide-react';

const template = getTemplate(DEFAULT_TEMPLATE_ID)!;

type Section =
  | 'brand'
  | 'nav'
  | 'opening'
  | 'hero'
  | 'manifesto'
  | 'tours'
  | 'philosophy'
  | 'spotlight'
  | 'who'
  | 'testimonials'
  | 'destinations'
  | 'stats'
  | 'journal'
  | 'faq'
  | 'cta'
  | 'footer';

const SECTIONS: { id: Section; label: string; icon: typeof Building2 }[] = [
  { id: 'brand', label: 'Brand & Identity', icon: Building2 },
  { id: 'nav', label: 'Navigation', icon: Type },
  { id: 'opening', label: 'Opening Animation', icon: Plane },
  { id: 'hero', label: 'Hero', icon: Star },
  { id: 'manifesto', label: 'Manifesto', icon: BookOpen },
  { id: 'tours', label: 'Tours', icon: Compass },
  { id: 'philosophy', label: 'Philosophy', icon: Lightbulb },
  { id: 'spotlight', label: 'Spotlight', icon: Star },
  { id: 'who', label: 'Who We\'re For', icon: Users },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { id: 'destinations', label: 'Destinations', icon: MapPin },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'journal', label: 'Journal / Blog', icon: Newspaper },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'cta', label: 'Call to Action', icon: Megaphone },
  { id: 'footer', label: 'Footer', icon: PanelBottom },
];

function Field({
  label,
  value,
  onChange,
  multiline,
  mono,
  placeholder,
  small,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  mono?: boolean;
  placeholder?: string;
  small?: boolean;
}) {
  const shared = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    placeholder,
    style: {
      width: '100%',
      padding: small ? '6px 10px' : '8px 12px',
      border: '1px solid var(--crm-hairline)',
      borderRadius: 'var(--crm-radius-sm)',
      fontSize: small ? 12 : 13,
      fontFamily: mono ? 'var(--crm-font-mono, monospace)' : 'inherit',
      background: 'var(--crm-bg-canvas)',
      color: 'var(--crm-text)',
      lineHeight: 1.5,
      resize: 'vertical' as const,
    },
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--crm-text-3)',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} />
      ) : (
        <input type="text" {...shared} />
      )}
    </div>
  );
}

function LinkField({
  label,
  link,
  onChange,
}: {
  label: string;
  link: { label: string; href: string };
  onChange: (v: { label: string; href: string }) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--crm-text-3)',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          type="text"
          value={link.label}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
          placeholder="Label"
          style={{
            padding: '6px 10px',
            border: '1px solid var(--crm-hairline)',
            borderRadius: 'var(--crm-radius-sm)',
            fontSize: 12,
            background: 'var(--crm-bg-canvas)',
            color: 'var(--crm-text)',
          }}
        />
        <input
          type="text"
          value={link.href}
          onChange={(e) => onChange({ ...link, href: e.target.value })}
          placeholder="/path or URL"
          style={{
            padding: '6px 10px',
            border: '1px solid var(--crm-hairline)',
            borderRadius: 'var(--crm-radius-sm)',
            fontSize: 12,
            fontFamily: 'monospace',
            background: 'var(--crm-bg-canvas)',
            color: 'var(--crm-text)',
          }}
        />
      </div>
    </div>
  );
}

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--crm-bg-2)',
        border: '1px solid var(--crm-hairline)',
        borderRadius: 'var(--crm-radius-sm)',
        padding: '18px 20px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--crm-text-3)',
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: '1px solid var(--crm-hairline)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function RepeatableList<T>({
  label,
  items: rawItems,
  onChange,
  renderItem,
  newItem,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (item: T) => void) => React.ReactNode;
  newItem: () => T;
}) {
  const items = rawItems ?? ([] as T[]);
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--crm-text-3)',
          }}
        >
          {label} ({items.length})
        </label>
        <button
          onClick={() => onChange([...items, newItem()])}
          className="crm-btn crm-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
        >
          <Plus size={12} /> Add
        </button>
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            border: '1px solid var(--crm-hairline)',
            borderRadius: 'var(--crm-radius-sm)',
            padding: '12px 14px',
            marginBottom: 8,
            background: 'var(--crm-bg-canvas)',
            position: 'relative',
          }}
        >
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--crm-text-4)',
              padding: 2,
            }}
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
          {renderItem(
            item,
            i,
            (updated) => onChange(items.map((it, j) => (j === i ? updated : it)))
          )}
        </div>
      ))}
    </div>
  );
}

export default function CustomizePage() {
  const [config, setConfig] = useState<SiteConfig>(
    JSON.parse(JSON.stringify(template.defaults))
  );
  const [activeSection, setActiveSection] = useState<Section>('brand');
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get<WebsiteConfigResponse>('/website/config');
        if (cancelled) return;
        if (resp?.data?.config && Object.keys(resp.data.config).length > 0) {
          // Merge over template defaults so newly added fields fall back gracefully.
          const merged: SiteConfig = {
            ...JSON.parse(JSON.stringify(template.defaults)),
            ...resp.data.config,
          };
          setConfig(merged);
          setTemplateId(resp.data.template_id || DEFAULT_TEMPLATE_ID);
        }
      } catch (err) {
        // 404 or other — fall back to template defaults silently.
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

  const set = useCallback(
    <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await api.put('/website/config', {
        template_id: templateId,
        config,
      });
      toast.success('Website saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [templateId, config]);

  const renderSection = () => {
    switch (activeSection) {
      case 'brand':
        return (
          <>
            <SectionPanel title="Brand Identity">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Brand Name" value={config.brand.name} onChange={(v) => set('brand', { ...config.brand, name: v })} />
                <Field label="Logo Initial" value={config.brand.logoInitial} onChange={(v) => set('brand', { ...config.brand, logoInitial: v })} />
              </div>
              <Field label="Tagline" value={config.brand.tagline} onChange={(v) => set('brand', { ...config.brand, tagline: v })} />
              <Field label="Subtitle" value={config.brand.subtitle} onChange={(v) => set('brand', { ...config.brand, subtitle: v })} placeholder="e.g. Small-group travel · Mumbai" />
              <Field label="Established" value={config.brand.established} onChange={(v) => set('brand', { ...config.brand, established: v })} />
            </SectionPanel>
            <SectionPanel title="Contact Details">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Phone" value={config.brand.phone} onChange={(v) => set('brand', { ...config.brand, phone: v })} />
                <Field label="WhatsApp Number" value={config.brand.whatsapp} onChange={(v) => set('brand', { ...config.brand, whatsapp: v })} mono placeholder="919600587100" />
              </div>
              <Field label="Email" value={config.brand.email} onChange={(v) => set('brand', { ...config.brand, email: v })} />
              <Field label="Address" value={config.brand.address} onChange={(v) => set('brand', { ...config.brand, address: v })} multiline />
              <Field label="Copyright" value={config.brand.copyright} onChange={(v) => set('brand', { ...config.brand, copyright: v })} />
            </SectionPanel>
            <SectionPanel title="Social Links">
              <RepeatableList
                label="Socials"
                items={config.brand.socials}
                onChange={(socials) => set('brand', { ...config.brand, socials })}
                newItem={() => ({ platform: '', url: '' })}
                renderItem={(s, _i, update) => (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, paddingRight: 24 }}>
                    <input type="text" value={s.platform} onChange={(e) => update({ ...s, platform: e.target.value })} placeholder="Platform" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={s.url} onChange={(e) => update({ ...s, url: e.target.value })} placeholder="URL" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontFamily: 'monospace', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  </div>
                )}
              />
            </SectionPanel>
          </>
        );

      case 'nav':
        return (
          <SectionPanel title="Navigation">
            <RepeatableList
              label="Nav Links"
              items={config.nav.links}
              onChange={(links) => set('nav', { ...config.nav, links })}
              newItem={() => ({ label: '', href: '/' })}
              renderItem={(l, _i, update) => (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingRight: 24 }}>
                  <input type="text" value={l.label} onChange={(e) => update({ ...l, label: e.target.value })} placeholder="Label" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  <input type="text" value={l.href} onChange={(e) => update({ ...l, href: e.target.value })} placeholder="/path" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontFamily: 'monospace', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
            <LinkField label="CTA Button" link={config.nav.cta} onChange={(cta) => set('nav', { ...config.nav, cta })} />
          </SectionPanel>
        );

      case 'hero':
        return (
          <>
            <SectionPanel title="Hero Content">
              <Field label="Eyebrow" value={config.hero.eyebrow} onChange={(v) => set('hero', { ...config.hero, eyebrow: v })} />
              <Field label="Title (HTML)" value={config.hero.titleHtml} onChange={(v) => set('hero', { ...config.hero, titleHtml: v })} mono placeholder="Small groups.<br/><em>Big adventures.</em>" />
              <Field label="Subtitle" value={config.hero.subtitle} onChange={(v) => set('hero', { ...config.hero, subtitle: v })} multiline />
              <Field label="Hand Note" value={config.hero.handNote} onChange={(v) => set('hero', { ...config.hero, handNote: v })} />
            </SectionPanel>
            <SectionPanel title="Hero CTAs">
              <LinkField label="Primary CTA" link={config.hero.primaryCta} onChange={(primaryCta) => set('hero', { ...config.hero, primaryCta })} />
              <LinkField label="Secondary CTA" link={config.hero.secondaryCta} onChange={(secondaryCta) => set('hero', { ...config.hero, secondaryCta })} />
            </SectionPanel>
            <SectionPanel title="Hero Images">
              <RepeatableList
                label="Polaroid Images"
                items={config.hero.images}
                onChange={(images) => set('hero', { ...config.hero, images })}
                newItem={() => ({ src: '', label: '', caption: '', coord: '' })}
                renderItem={(img, _i, update) => (
                  <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                    <input type="text" value={img.src} onChange={(e) => update({ ...img, src: e.target.value })} placeholder="Image URL" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontFamily: 'monospace', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <input type="text" value={img.label || ''} onChange={(e) => update({ ...img, label: e.target.value })} placeholder="Label" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={img.caption || ''} onChange={(e) => update({ ...img, caption: e.target.value })} placeholder="Caption" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={img.coord || ''} onChange={(e) => update({ ...img, coord: e.target.value })} placeholder="Coord" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    </div>
                  </div>
                )}
              />
            </SectionPanel>
          </>
        );

      case 'manifesto':
        return (
          <SectionPanel title="Manifesto">
            <Field label="Eyebrow" value={config.manifesto.eyebrow} onChange={(v) => set('manifesto', { ...config.manifesto, eyebrow: v })} />
            <Field label="Text (HTML — use <span class=&quot;strike&quot;> and <em> for formatting)" value={config.manifesto.textHtml} onChange={(v) => set('manifesto', { ...config.manifesto, textHtml: v })} multiline mono />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Founder Name" value={config.manifesto.founder} onChange={(v) => set('manifesto', { ...config.manifesto, founder: v })} />
              <Field label="Founder Role" value={config.manifesto.founderRole} onChange={(v) => set('manifesto', { ...config.manifesto, founderRole: v })} multiline />
            </div>
          </SectionPanel>
        );

      case 'tours':
        return (
          <>
            <SectionPanel title="Tours Section Header">
              <Field label="Eyebrow" value={config.tours.eyebrow} onChange={(v) => set('tours', { ...config.tours, eyebrow: v })} />
              <Field label="Title (HTML)" value={config.tours.titleHtml} onChange={(v) => set('tours', { ...config.tours, titleHtml: v })} mono />
              <Field label="Kicker" value={config.tours.kicker} onChange={(v) => set('tours', { ...config.tours, kicker: v })} multiline />
              <LinkField label="CTA" link={{ label: config.tours.ctaLabel, href: config.tours.ctaHref }} onChange={(l) => set('tours', { ...config.tours, ctaLabel: l.label, ctaHref: l.href })} />
            </SectionPanel>
            <SectionPanel title="Tour Items">
              <RepeatableList
                label="Tours"
                items={config.tours.items}
                onChange={(items) => set('tours', { ...config.tours, items })}
                newItem={() => ({ slug: '', code: '', dest: '', subtitle: '', tagline: '', days: '', nights: '', group: '', season: '', price: 'On Request', priceNum: 0, region: '', style: '', tags: [], tagClass: '', coord: '', stamp: '' })}
                renderItem={(t, _i, update) => (
                  <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
                      <input type="text" value={t.dest} onChange={(e) => update({ ...t, dest: e.target.value })} placeholder="Destination" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={t.code} onChange={(e) => update({ ...t, code: e.target.value })} placeholder="Code" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontFamily: 'monospace', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    </div>
                    <input type="text" value={t.tagline} onChange={(e) => update({ ...t, tagline: e.target.value })} placeholder="Tagline" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                      <input type="text" value={t.days} onChange={(e) => update({ ...t, days: e.target.value })} placeholder="Days" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={t.group} onChange={(e) => update({ ...t, group: e.target.value })} placeholder="Group" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={t.season} onChange={(e) => update({ ...t, season: e.target.value })} placeholder="Season" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={t.price} onChange={(e) => update({ ...t, price: e.target.value })} placeholder="Price" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    </div>
                  </div>
                )}
              />
            </SectionPanel>
          </>
        );

      case 'philosophy':
        return (
          <SectionPanel title="Philosophy">
            <Field label="Eyebrow" value={config.philosophy.eyebrow} onChange={(v) => set('philosophy', { ...config.philosophy, eyebrow: v })} />
            <Field label="Intro Text (HTML)" value={config.philosophy.introHtml} onChange={(v) => set('philosophy', { ...config.philosophy, introHtml: v })} multiline mono />
            <RepeatableList
              label="Philosophy Items"
              items={config.philosophy.items}
              onChange={(items) => set('philosophy', { ...config.philosophy, items })}
              newItem={() => ({ num: String(config.philosophy.items.length + 1).padStart(2, '0'), title: '', description: '' })}
              renderItem={(it, _i, update) => (
                <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 6 }}>
                    <input type="text" value={it.num} onChange={(e) => update({ ...it, num: e.target.value })} placeholder="01" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={it.title} onChange={(e) => update({ ...it, title: e.target.value })} placeholder="Title" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  </div>
                  <textarea value={it.description} onChange={(e) => update({ ...it, description: e.target.value })} placeholder="Description" rows={2} style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, resize: 'vertical', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'spotlight':
        return (
          <>
            <SectionPanel title="Spotlight Content">
              <Field label="Eyebrow" value={config.spotlight.eyebrow} onChange={(v) => set('spotlight', { ...config.spotlight, eyebrow: v })} />
              <Field label="Title (HTML)" value={config.spotlight.titleHtml} onChange={(v) => set('spotlight', { ...config.spotlight, titleHtml: v })} mono />
              <Field label="Description" value={config.spotlight.description} onChange={(v) => set('spotlight', { ...config.spotlight, description: v })} multiline />
            </SectionPanel>
            <SectionPanel title="Spotlight Details">
              <RepeatableList
                label="Info Cells"
                items={config.spotlight.infoCells}
                onChange={(infoCells) => set('spotlight', { ...config.spotlight, infoCells })}
                newItem={() => ({ label: '', value: '', valueSub: '' })}
                renderItem={(c, _i, update) => (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingRight: 24 }}>
                    <input type="text" value={c.label} onChange={(e) => update({ ...c, label: e.target.value })} placeholder="Label" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={c.value} onChange={(e) => update({ ...c, value: e.target.value })} placeholder="Value" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={c.valueSub} onChange={(e) => update({ ...c, valueSub: e.target.value })} placeholder="Sub" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  </div>
                )}
              />
              <RepeatableList
                label="Includes"
                items={config.spotlight.includes}
                onChange={(includes) => set('spotlight', { ...config.spotlight, includes })}
                newItem={() => ''}
                renderItem={(item, _i, update) => (
                  <input type="text" value={item} onChange={(e) => update(e.target.value)} placeholder="Include item" style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, paddingRight: 30, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                )}
              />
              <LinkField label="Primary CTA" link={config.spotlight.primaryCta} onChange={(primaryCta) => set('spotlight', { ...config.spotlight, primaryCta })} />
              <LinkField label="Secondary CTA" link={config.spotlight.secondaryCta} onChange={(secondaryCta) => set('spotlight', { ...config.spotlight, secondaryCta })} />
            </SectionPanel>
          </>
        );

      case 'who':
        return (
          <SectionPanel title="Who We're For">
            <Field label="Eyebrow" value={config.who.eyebrow} onChange={(v) => set('who', { ...config.who, eyebrow: v })} />
            <Field label="Title (HTML)" value={config.who.titleHtml} onChange={(v) => set('who', { ...config.who, titleHtml: v })} mono />
            <Field label="Subtitle" value={config.who.subtitle} onChange={(v) => set('who', { ...config.who, subtitle: v })} multiline />
            <RepeatableList
              label="Value Props"
              items={config.who.items}
              onChange={(items) => set('who', { ...config.who, items })}
              newItem={() => ({ tone: '', heading: '', text: '' })}
              renderItem={(it, _i, update) => (
                <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                  <input type="text" value={it.heading} onChange={(e) => update({ ...it, heading: e.target.value })} placeholder="Heading" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  <textarea value={it.text} onChange={(e) => update({ ...it, text: e.target.value })} placeholder="Description" rows={2} style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, resize: 'vertical', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'testimonials':
        return (
          <SectionPanel title="Testimonials">
            <Field label="Eyebrow" value={config.testimonials.eyebrow} onChange={(v) => set('testimonials', { ...config.testimonials, eyebrow: v })} />
            <Field label="Title (HTML)" value={config.testimonials.titleHtml} onChange={(v) => set('testimonials', { ...config.testimonials, titleHtml: v })} mono />
            <Field label="Review Source" value={config.testimonials.reviewSource} onChange={(v) => set('testimonials', { ...config.testimonials, reviewSource: v })} />
            <RepeatableList
              label="Testimonials"
              items={config.testimonials.items}
              onChange={(items) => set('testimonials', { ...config.testimonials, items })}
              newItem={() => ({ name: '', trip: '', color: '', quote: '' })}
              renderItem={(t, _i, update) => (
                <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <input type="text" value={t.name} onChange={(e) => update({ ...t, name: e.target.value })} placeholder="Name" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={t.trip} onChange={(e) => update({ ...t, trip: e.target.value })} placeholder="Trip" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  </div>
                  <textarea value={t.quote} onChange={(e) => update({ ...t, quote: e.target.value })} placeholder="Quote" rows={3} style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, resize: 'vertical', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'destinations':
        return (
          <SectionPanel title="Destinations">
            <Field label="Eyebrow" value={config.destinations.eyebrow} onChange={(v) => set('destinations', { ...config.destinations, eyebrow: v })} />
            <Field label="Title (HTML)" value={config.destinations.titleHtml} onChange={(v) => set('destinations', { ...config.destinations, titleHtml: v })} mono />
            <Field label="Kicker" value={config.destinations.kicker} onChange={(v) => set('destinations', { ...config.destinations, kicker: v })} multiline />
            <RepeatableList
              label="Destinations"
              items={config.destinations.items}
              onChange={(items) => set('destinations', { ...config.destinations, items })}
              newItem={() => ({ name: '', country: '', coord: '', coords: '', image: '' })}
              renderItem={(d, _i, update) => (
                <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <input type="text" value={d.name} onChange={(e) => update({ ...d, name: e.target.value })} placeholder="Name" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={d.country} onChange={(e) => update({ ...d, country: e.target.value })} placeholder="Country" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  </div>
                  <input type="text" value={d.image} onChange={(e) => update({ ...d, image: e.target.value })} placeholder="Image URL" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontFamily: 'monospace', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'stats':
        return (
          <SectionPanel title="Stats">
            <RepeatableList
              label="Stats"
              items={config.stats}
              onChange={(stats) => set('stats', stats)}
              newItem={() => ({ num: '', label: '' })}
              renderItem={(s, _i, update) => (
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 6, paddingRight: 24 }}>
                  <input type="text" value={s.num} onChange={(e) => update({ ...s, num: e.target.value })} placeholder="300+" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 700, textAlign: 'center', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  <input type="text" value={s.label} onChange={(e) => update({ ...s, label: e.target.value })} placeholder="Label" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'journal':
        return (
          <SectionPanel title="Journal / Blog">
            <Field label="Eyebrow" value={config.journal.eyebrow} onChange={(v) => set('journal', { ...config.journal, eyebrow: v })} />
            <Field label="Title (HTML)" value={config.journal.titleHtml} onChange={(v) => set('journal', { ...config.journal, titleHtml: v })} mono />
            <Field label="CTA Label" value={config.journal.ctaLabel} onChange={(v) => set('journal', { ...config.journal, ctaLabel: v })} />
            <RepeatableList
              label="Entries"
              items={config.journal.entries}
              onChange={(entries) => set('journal', { ...config.journal, entries })}
              newItem={() => ({ slug: '', tag: '', read: '', date: '', title: '', excerpt: '', image: '' })}
              renderItem={(j, _i, update) => (
                <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                  <input type="text" value={j.title} onChange={(e) => update({ ...j, title: e.target.value })} placeholder="Title" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  <textarea value={j.excerpt} onChange={(e) => update({ ...j, excerpt: e.target.value })} placeholder="Excerpt" rows={2} style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, resize: 'vertical', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <input type="text" value={j.tag} onChange={(e) => update({ ...j, tag: e.target.value })} placeholder="Tag" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={j.date} onChange={(e) => update({ ...j, date: e.target.value })} placeholder="Date" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                    <input type="text" value={j.read} onChange={(e) => update({ ...j, read: e.target.value })} placeholder="Read time" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  </div>
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'faq':
        return (
          <SectionPanel title="FAQ">
            <Field label="Eyebrow" value={config.faq.eyebrow} onChange={(v) => set('faq', { ...config.faq, eyebrow: v })} />
            <Field label="Title (HTML)" value={config.faq.titleHtml} onChange={(v) => set('faq', { ...config.faq, titleHtml: v })} mono />
            <Field label="Subtitle" value={config.faq.subtitle} onChange={(v) => set('faq', { ...config.faq, subtitle: v })} />
            <LinkField label="Contact Link" link={{ label: config.faq.contactLabel, href: config.faq.contactHref }} onChange={(l) => set('faq', { ...config.faq, contactLabel: l.label, contactHref: l.href })} />
            <RepeatableList
              label="Questions"
              items={config.faq.items}
              onChange={(items) => set('faq', { ...config.faq, items })}
              newItem={() => ({ q: '', a: '' })}
              renderItem={(f, _i, update) => (
                <div style={{ display: 'grid', gap: 6, paddingRight: 24 }}>
                  <input type="text" value={f.q} onChange={(e) => update({ ...f, q: e.target.value })} placeholder="Question" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  <textarea value={f.a} onChange={(e) => update({ ...f, a: e.target.value })} placeholder="Answer" rows={3} style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, resize: 'vertical', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'cta':
        return (
          <SectionPanel title="Call to Action">
            <Field label="Eyebrow" value={config.cta.eyebrow} onChange={(v) => set('cta', { ...config.cta, eyebrow: v })} />
            <Field label="Title (HTML)" value={config.cta.titleHtml} onChange={(v) => set('cta', { ...config.cta, titleHtml: v })} mono />
            <Field label="Subtitle" value={config.cta.subtitle} onChange={(v) => set('cta', { ...config.cta, subtitle: v })} multiline />
            <LinkField label="Primary CTA" link={config.cta.primaryCta} onChange={(primaryCta) => set('cta', { ...config.cta, primaryCta })} />
            <LinkField label="Secondary CTA" link={config.cta.secondaryCta} onChange={(secondaryCta) => set('cta', { ...config.cta, secondaryCta })} />
            <Field label="Fine Print" value={config.cta.finePrint} onChange={(v) => set('cta', { ...config.cta, finePrint: v })} />
          </SectionPanel>
        );

      case 'footer':
        return (
          <SectionPanel title="Footer">
            <Field label="Description" value={config.footer.description} onChange={(v) => set('footer', { ...config.footer, description: v })} multiline />
            <Field label="Tagline" value={config.footer.tagline} onChange={(v) => set('footer', { ...config.footer, tagline: v })} />
            <RepeatableList
              label="Footer Columns"
              items={config.footer.columns}
              onChange={(columns) => set('footer', { ...config.footer, columns })}
              newItem={() => ({ title: '', items: [] })}
              renderItem={(col, _i, updateCol) => (
                <div style={{ display: 'grid', gap: 8, paddingRight: 24 }}>
                  <input type="text" value={col.title} onChange={(e) => updateCol({ ...col, title: e.target.value })} placeholder="Column title" style={{ padding: '5px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, fontWeight: 600, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                  {col.items.map((item, j) => (
                    <div key={j} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px', gap: 6, paddingLeft: 12 }}>
                      <input type="text" value={item.label} onChange={(e) => updateCol({ ...col, items: col.items.map((it, k) => k === j ? { ...it, label: e.target.value } : it) })} placeholder="Label" style={{ padding: '4px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <input type="text" value={item.href || ''} onChange={(e) => updateCol({ ...col, items: col.items.map((it, k) => k === j ? { ...it, href: e.target.value || undefined } : it) })} placeholder="/path (optional)" style={{ padding: '4px 8px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 11, fontFamily: 'monospace', background: 'var(--crm-bg-2)', color: 'var(--crm-text)' }} />
                      <button onClick={() => updateCol({ ...col, items: col.items.filter((_, k) => k !== j) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-text-4)', padding: 0 }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => updateCol({ ...col, items: [...col.items, { label: '' }] })} className="crm-btn crm-btn-sm" style={{ marginLeft: 12, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}><Plus size={11} /> Add link</button>
                </div>
              )}
            />
          </SectionPanel>
        );

      case 'opening':
        return (
          <>
            <SectionPanel title="Opening Animation">
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.opening.enabled} onChange={(e) => set('opening', { ...config.opening, enabled: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>Enable opening animation</span>
                </label>
              </div>
            </SectionPanel>
            {config.opening.enabled && (
              <>
                <SectionPanel title="Boarding Pass Card">
                  <Field label="Brand Text (HTML)" value={config.opening.pass.brandHtml} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, brandHtml: v } })} mono />
                  <Field label="Established" value={config.opening.pass.established} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, established: v } })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <Field label="Origin Code" value={config.opening.pass.origin.code} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, origin: { ...config.opening.pass.origin, code: v } } })} />
                    <Field label="Origin City" value={config.opening.pass.origin.city} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, origin: { ...config.opening.pass.origin, city: v } } })} />
                    <Field label="Destination Code" value={config.opening.pass.destination.code} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, destination: { ...config.opening.pass.destination, code: v } } })} />
                    <Field label="Destination City" value={config.opening.pass.destination.city} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, destination: { ...config.opening.pass.destination, city: v } } })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                    <Field label="Flight Code" value={config.opening.pass.flightCode} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, flightCode: v } })} />
                    <Field label="Flight Class" value={config.opening.pass.flightClass} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, flightClass: v } })} />
                    <Field label="Flight Date" value={config.opening.pass.flightDate} onChange={(v) => set('opening', { ...config.opening, pass: { ...config.opening.pass, flightDate: v } })} />
                  </div>
                </SectionPanel>
                <SectionPanel title="Map Section">
                  <Field label="Eyebrow" value={config.opening.map.eyebrow} onChange={(v) => set('opening', { ...config.opening, map: { ...config.opening.map, eyebrow: v } })} />
                  <Field label="Headline (HTML)" value={config.opening.map.headlineHtml} onChange={(v) => set('opening', { ...config.opening, map: { ...config.opening.map, headlineHtml: v } })} mono />
                  <Field label="Subtitle" value={config.opening.map.subtitle} onChange={(v) => set('opening', { ...config.opening, map: { ...config.opening.map, subtitle: v } })} multiline />
                  <Field label="Scroll Cue" value={config.opening.map.cue} onChange={(v) => set('opening', { ...config.opening, map: { ...config.opening.map, cue: v } })} />
                </SectionPanel>
              </>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Section sidebar */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--crm-hairline)',
          overflowY: 'auto',
          padding: '20px 0',
        }}
      >
        <div
          style={{
            padding: '0 16px 16px',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--crm-text-4)',
          }}
        >
          Sections
        </div>
        {SECTIONS.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                background: isActive ? 'var(--crm-accent-bg)' : 'transparent',
                color: isActive ? 'var(--crm-accent)' : 'var(--crm-text-2)',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '2px solid var(--crm-accent)' : '2px solid transparent',
              }}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--crm-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div className="crm-eyebrow">Customize</div>
            <h1 className="crm-title-1" style={{ marginTop: 2 }}>
              {SECTIONS.find((s) => s.id === activeSection)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`/preview/${DEFAULT_TEMPLATE_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="crm-btn crm-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Eye size={14} /> Preview
            </a>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="crm-btn crm-btn-sm crm-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving || loading ? 0.6 : 1, cursor: saving || loading ? 'not-allowed' : 'pointer' }}
            >
              <Save size={14} /> {saving ? 'Saving…' : loading ? 'Loading…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
