'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { travellerApi } from '@/lib/traveller-api';
import type { APIResponse } from '@/types/api';
import type { PortalDocument } from '@/types/portal';
import { FileText, Upload, AlertTriangle } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const DOC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  verified: { bg: 'var(--crm-green-bg)', text: 'var(--crm-green)' },
  pending: { bg: 'var(--crm-amber-bg)', text: 'var(--crm-amber)' },
  uploaded: { bg: 'var(--crm-accent-bg)', text: 'var(--crm-accent)' },
  rejected: { bg: 'var(--crm-red-bg)', text: 'var(--crm-red)' },
  expired: { bg: 'var(--crm-red-bg)', text: 'var(--crm-red)' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa',
  travel_insurance: 'Travel Insurance',
  vaccination: 'Vaccination',
  id_card: 'ID Card',
  flight_ticket: 'Flight Ticket',
  hotel_voucher: 'Hotel Voucher',
  booking_confirmation: 'Booking Confirmation',
  medical_certificate: 'Medical Certificate',
  insurance_copy: 'Insurance',
  passport_copy: 'Passport Copy',
  visa_copy: 'Visa Copy',
  photo: 'Photo',
  waiver_signed: 'Waiver (Signed)',
  vaccination_certificate: 'Vaccination Certificate',
  id_proof: 'ID Proof',
  consent_form: 'Consent Form',
  other: 'Other',
};

export default function TravellerDocumentsPage() {
  const queryClient = useQueryClient();

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['portal-documents'],
    queryFn: () => travellerApi.get<APIResponse<PortalDocument[]>>('/portal/documents'),
  });

  const docs = docsData?.data ?? [];

  // Group by document type
  const grouped = docs.reduce<Record<string, PortalDocument[]>>((acc, doc) => {
    const type = doc.document_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort();

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 20 }}>
        My Documents
      </h1>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13 }}>
          Loading documents...
        </div>
      )}

      {!isLoading && docs.length === 0 && (
        <div className="crm-card" style={{ padding: 48, textAlign: 'center' }}>
          <FileText size={32} style={{ color: 'var(--crm-text-3)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No documents</div>
          <div style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>
            Your documents will appear here when your operator adds them
          </div>
        </div>
      )}

      {groupKeys.map((type) => (
        <div key={type} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {DOC_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[type].map((doc) => {
              const statusStyle = DOC_STATUS_COLORS[doc.status] ?? { bg: 'var(--crm-bg-active)', text: 'var(--crm-text-3)' };
              const isExpiringSoon = doc.expiry_date && (() => {
                const exp = new Date(doc.expiry_date);
                const sixMonths = new Date();
                sixMonths.setMonth(sixMonths.getMonth() + 6);
                return exp <= sixMonths;
              })();

              return (
                <div key={doc.id} className="crm-card" style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.label}</div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        textTransform: 'capitalize',
                      }}
                    >
                      {doc.status}
                    </span>
                  </div>

                  {doc.expiry_date && (
                    <div
                      style={{
                        fontSize: 12,
                        color: isExpiringSoon ? 'var(--crm-red)' : 'var(--crm-text-4)',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {isExpiringSoon && <AlertTriangle size={12} />}
                      Expires: {formatDate(doc.expiry_date)}
                    </div>
                  )}

                  {doc.rejection_reason && (
                    <div style={{ fontSize: 12, color: 'var(--crm-red)', marginTop: 4 }}>
                      Reason: {doc.rejection_reason}
                    </div>
                  )}

                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    {doc.file_url ? (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--crm-accent)', textDecoration: 'none' }}>
                        View document
                      </a>
                    ) : (
                      <button
                        className="crm-btn sm"
                        style={{ gap: 4, fontSize: 12 }}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,.pdf';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              await travellerApi.upload(`/portal/documents/${doc.id}/upload`, formData);
                              queryClient.invalidateQueries({ queryKey: ['portal-documents'] });
                            } catch {
                              // Handle silently
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload size={12} />
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
