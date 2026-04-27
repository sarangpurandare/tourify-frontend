'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string | null;
  initials?: string;
}

interface EntitySearchProps {
  options: EntityOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

function Thumb({ option }: { option: EntityOption }) {
  const [imgError, setImgError] = useState(false);
  const url = option.imageUrl;
  const showImg = url && !imgError;

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: url ? 4 : 14,
        flexShrink: 0,
        overflow: 'hidden',
        background: showImg ? undefined : 'var(--crm-bg-active, #e5e5ea)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 10.5,
        fontWeight: 600,
        color: 'var(--crm-text-3)',
        letterSpacing: '0.01em',
      }}
    >
      {showImg ? (
        <img
          src={url}
          alt=""
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        option.initials?.toUpperCase() || '?'
      )}
    </div>
  );
}

export function EntitySearch({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No results',
  className,
}: EntitySearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.id === value);

  const filtered = query.trim()
    ? options.filter(o => {
        const q = query.toLowerCase();
        return (
          o.label.toLowerCase().includes(q) ||
          (o.sublabel?.toLowerCase().includes(q) ?? false)
        );
      })
    : options;

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery('');
    setHighlightIdx(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIdx]) handleSelect(filtered[highlightIdx].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className={className}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          border: '1px solid var(--crm-line)',
          borderRadius: 'var(--crm-radius-sm, 6px)',
          background: 'var(--crm-bg-elev)',
          color: selected ? 'var(--crm-text)' : 'var(--crm-text-3)',
          fontSize: 13,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
        }}
      >
        {selected ? (
          <>
            <Thumb option={selected} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected.label}
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>{placeholder}</span>
        )}
        <ChevronDown size={14} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--crm-bg-elev, #fff)',
            border: '1px solid var(--crm-line)',
            borderRadius: 'var(--crm-radius-sm, 6px)',
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            overflow: 'hidden',
            minWidth: 280,
          }}
        >
          {/* Search input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderBottom: '1px solid var(--crm-hairline)',
            }}
          >
            <Search size={14} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                color: 'var(--crm-text)',
              }}
            />
          </div>

          {/* Results */}
          <div
            ref={listRef}
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'var(--crm-text-3)',
                }}
              >
                {emptyMessage}
              </div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    handleSelect(opt.id);
                  }}
                  onMouseEnter={() => setHighlightIdx(i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    border: 'none',
                    background:
                      i === highlightIdx
                        ? 'var(--crm-bg-active, #f0f0f5)'
                        : opt.id === value
                          ? 'var(--crm-accent-bg, #e8f0fe)'
                          : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--crm-text)',
                    outline: 'none',
                  }}
                >
                  <Thumb option={opt} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                    >
                      {opt.label}
                    </div>
                    {opt.sublabel && (
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 11.5,
                          color: 'var(--crm-text-3)',
                        }}
                      >
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
