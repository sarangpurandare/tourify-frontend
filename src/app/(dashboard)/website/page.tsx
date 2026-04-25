'use client';

import { useState } from 'react';
import { listTemplates } from '@/lib/templates';
import { Globe, ExternalLink, Eye, Check, Palette, Layout, Sparkles } from 'lucide-react';

const templates = listTemplates();

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  'Travel & Tourism': Globe,
};

export default function WebsitePage() {
  const [selected, setSelected] = useState<string | null>(templates[0]?.id ?? null);
  const current = templates.find((t) => t.id === selected);

  return (
    <div className="crm-stack" style={{ gap: 0 }}>
      <div style={{ padding: '32px 32px 0' }}>
        <div className="crm-eyebrow">Website</div>
        <h1 className="crm-title-1" style={{ marginTop: 4 }}>Landing Page</h1>
        <p style={{ color: 'var(--crm-text-3)', marginTop: 6, maxWidth: 520, lineHeight: 1.55 }}>
          Choose a template for your public-facing landing page. Preview with dummy data, then customise with your own content.
        </p>
      </div>

      {/* Current status banner */}
      {current && (
        <div
          style={{
            margin: '24px 32px 0',
            padding: '16px 20px',
            background: 'var(--crm-accent-bg)',
            borderRadius: 'var(--crm-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--crm-accent)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Check size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              Active template: {current.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-3)', marginTop: 2 }}>
              {current.category} · {current.tags.length} style tags
            </div>
          </div>
          <a
            href={`/preview/${current.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn crm-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={14} /> Preview
          </a>
          <a
            href={`/org/demo`}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn crm-btn-sm crm-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ExternalLink size={14} /> View Live
          </a>
        </div>
      )}

      {/* Template gallery */}
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Layout size={15} style={{ color: 'var(--crm-text-3)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--crm-text-3)' }}>
            Available Templates
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {templates.map((t) => {
            const Icon = CATEGORY_ICONS[t.category] || Globe;
            const isSelected = t.id === selected;
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  border: isSelected
                    ? '2px solid var(--crm-accent)'
                    : '1px solid var(--crm-hairline)',
                  borderRadius: 'var(--crm-radius-sm)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: isSelected ? '0 0 0 3px var(--crm-accent-bg)' : 'none',
                  background: 'var(--crm-bg-2)',
                }}
              >
                {/* Thumbnail area */}
                <div
                  style={{
                    height: 200,
                    background: 'linear-gradient(135deg, #f5f0e8 0%, #e8ddd0 50%, #d4c5b0 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: '#1F1A14',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#f5f0e8',
                      fontSize: 24,
                      fontWeight: 300,
                      fontFamily: 'serif',
                    }}
                  >
                    b
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1F1A14' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b5e52', marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {t.category}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--crm-accent)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                      }}
                    >
                      <Check size={14} />
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.5, marginBottom: 14 }}>
                    {t.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="crm-pill"
                        style={{ fontSize: 11 }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`/preview/${t.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="crm-btn crm-btn-sm"
                      onClick={(e) => e.stopPropagation()}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Eye size={14} /> Preview
                    </a>
                    <button
                      className="crm-btn crm-btn-sm crm-btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(t.id);
                      }}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {isSelected ? (
                        <>
                          <Check size={14} /> Selected
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Use Template
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Coming soon placeholder */}
          <div
            style={{
              border: '1px dashed var(--crm-hairline)',
              borderRadius: 'var(--crm-radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              minHeight: 340,
              color: 'var(--crm-text-4)',
            }}
          >
            <Palette size={32} strokeWidth={1} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>More templates coming soon</div>
            <div style={{ fontSize: 12, maxWidth: 220, textAlign: 'center', lineHeight: 1.5 }}>
              New designs for different industries and use cases
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
