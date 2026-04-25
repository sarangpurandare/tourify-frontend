'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Film, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { thumbUrl } from '@/lib/utils';

interface UploadResponse {
  data: { path: string; public_url: string; signed_url: string };
}

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  bucket?: string;
  label?: string;
  compact?: boolean;
}

function isImage(url: string) {
  return /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url);
}

function isVideo(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

export function FileUpload({ value, onChange, accept = 'image/*,.pdf', bucket = 'media', label, compact }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', bucket);
      const res = await api.upload<UploadResponse>('/upload', fd);
      onChange(res.data.public_url);
    } catch (e: unknown) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
    }
  }, [bucket, onChange]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (files?.[0]) upload(files[0]);
  }, [upload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  if (value) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {label && <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginBottom: 4 }}>{label}</div>}
        <div style={{
          position: 'relative', borderRadius: 8, overflow: 'hidden',
          border: '1px solid var(--crm-border)', background: 'var(--crm-bg-2)',
          width: compact ? 80 : 160, height: compact ? 80 : 120,
        }}>
          {isImage(value) && (
            <img src={thumbUrl(value, compact ? 160 : 320)} alt={label || 'Upload'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {isVideo(value) && (
            <video src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
          )}
          {!isImage(value) && !isVideo(value) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 4 }}>
              <FileText size={24} style={{ color: 'var(--crm-text-3)' }} />
              <span style={{ fontSize: 10, color: 'var(--crm-text-4)' }}>Document</span>
            </div>
          )}
          <button
            onClick={() => onChange(null)}
            style={{
              position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginBottom: 4 }}>{label}</div>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: compact ? 80 : 160, height: compact ? 80 : 120,
          borderRadius: 8, border: `2px dashed ${dragOver ? 'var(--crm-accent)' : 'var(--crm-border)'}`,
          background: dragOver ? 'var(--crm-accent-light, rgba(59,130,246,0.05))' : 'var(--crm-bg-2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', gap: 4, transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <Loader2 size={20} style={{ color: 'var(--crm-accent)', animation: 'spin 1s linear infinite' }} />
        ) : (
          <>
            <Upload size={16} style={{ color: 'var(--crm-text-3)' }} />
            <span style={{ fontSize: 10, color: 'var(--crm-text-4)', textAlign: 'center', padding: '0 8px' }}>
              {compact ? 'Upload' : 'Click or drag to upload'}
            </span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

interface MultiUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  accept?: string;
  bucket?: string;
  label?: string;
  max?: number;
}

export function MultiUpload({ value = [], onChange, accept = 'image/*', bucket = 'media', label, max = 20 }: MultiUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (files: FileList) => {
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length && value.length + newUrls.length < max; i++) {
        const fd = new FormData();
        fd.append('file', files[i]);
        fd.append('bucket', bucket);
        const res = await api.upload<UploadResponse>('/upload', fd);
        newUrls.push(res.data.public_url);
      }
      onChange([...value, ...newUrls]);
    } catch (e: unknown) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
    }
  }, [bucket, max, onChange, value]);

  const remove = useCallback((idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  }, [onChange, value]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  }, [upload]);

  return (
    <div>
      {label && <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {value.map((url, idx) => (
          <div key={idx} style={{
            position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--crm-border)', background: 'var(--crm-bg-2)',
          }}>
            {isImage(url) && (
              <img src={thumbUrl(url, 160, 160)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {isVideo(url) && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                <Film size={20} style={{ color: '#fff' }} />
              </div>
            )}
            {!isImage(url) && !isVideo(url) && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} style={{ color: 'var(--crm-text-3)' }} />
              </div>
            )}
            <button
              onClick={() => remove(idx)}
              style={{
                position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {value.length < max && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              width: 80, height: 80, borderRadius: 8,
              border: `2px dashed ${dragOver ? 'var(--crm-accent)' : 'var(--crm-border)'}`,
              background: dragOver ? 'rgba(59,130,246,0.05)' : 'var(--crm-bg-2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', gap: 4, transition: 'all 0.15s',
            }}
          >
            {uploading ? (
              <Loader2 size={16} style={{ color: 'var(--crm-accent)', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <Upload size={14} style={{ color: 'var(--crm-text-3)' }} />
                <span style={{ fontSize: 9, color: 'var(--crm-text-4)' }}>Add</span>
              </>
            )}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} multiple style={{ display: 'none' }} onChange={(e) => e.target.files && upload(e.target.files)} />
    </div>
  );
}
