'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { travellerApi } from '@/lib/traveller-api';
import { useTravellerAuth } from '@/lib/traveller-auth';
import type { APIResponse } from '@/types/api';
import type { TravellerProfile, PortalEmergencyContact } from '@/types/portal';
import { Phone, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--crm-line)',
  borderRadius: 'var(--crm-radius-sm)',
  background: 'var(--crm-bg-elev)',
  color: 'var(--crm-text)',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--crm-text-2)',
  display: 'block',
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto' as const,
};

export default function TravellerProfilePage() {
  const { traveller } = useTravellerAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    phone: '',
    whatsapp: '',
    dietary: '',
    seat_preference: '',
    berth_preference: '',
    roommate_preference: '',
    tshirt_size: '',
    jacket_size: '',
    allergies: [] as string[],
    medical_conditions: [] as string[],
    medications: [] as string[],
    blood_group: '',
  });

  const [contacts, setContacts] = useState<PortalEmergencyContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', relation: '', phone: '', priority: 1 });
  const [showAddContact, setShowAddContact] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (traveller) {
      setForm({
        phone: traveller.phone ?? '',
        whatsapp: traveller.whatsapp ?? '',
        dietary: traveller.dietary ?? '',
        seat_preference: traveller.seat_preference ?? '',
        berth_preference: traveller.berth_preference ?? '',
        roommate_preference: traveller.roommate_preference ?? '',
        tshirt_size: traveller.tshirt_size ?? '',
        jacket_size: traveller.jacket_size ?? '',
        allergies: traveller.allergies ?? [],
        medical_conditions: traveller.medical_conditions ?? [],
        medications: traveller.medications ?? [],
        blood_group: traveller.blood_group ?? '',
      });
      setContacts(traveller.emergency_contacts ?? []);
    }
  }, [traveller]);

  const saveMutation = useMutation({
    mutationFn: (body: Partial<TravellerProfile>) =>
      travellerApi.put<APIResponse<TravellerProfile>>('/portal/profile', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function handleSave() {
    saveMutation.mutate({
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
      dietary: form.dietary || undefined,
      seat_preference: form.seat_preference || undefined,
      berth_preference: form.berth_preference || undefined,
      roommate_preference: form.roommate_preference || undefined,
      tshirt_size: form.tshirt_size || undefined,
      jacket_size: form.jacket_size || undefined,
      allergies: form.allergies.length ? form.allergies : undefined,
      medical_conditions: form.medical_conditions.length ? form.medical_conditions : undefined,
      medications: form.medications.length ? form.medications : undefined,
      blood_group: form.blood_group || undefined,
      emergency_contacts: contacts,
    } as Partial<TravellerProfile>);
  }

  if (!traveller) return null;

  const displayName = traveller.preferred_name || traveller.full_legal_name;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 4 }}>
          {displayName}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>
          Name is managed by your tour operator
        </p>
      </div>

      {/* Contact section */}
      <div className="crm-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Contact Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={traveller.email ?? ''}
              readOnly
              style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>WhatsApp</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              placeholder="Same as phone or different number"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Preferences section */}
      <div className="crm-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Preferences</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Dietary</label>
            <select
              value={form.dietary}
              onChange={(e) => setForm((f) => ({ ...f, dietary: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="non_veg">Non-veg</option>
              <option value="vegan">Vegan</option>
              <option value="jain">Jain</option>
              <option value="halal">Halal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Seat preference</label>
            <select
              value={form.seat_preference}
              onChange={(e) => setForm((f) => ({ ...f, seat_preference: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select</option>
              <option value="window">Window</option>
              <option value="aisle">Aisle</option>
              <option value="middle">Middle</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Berth preference</label>
            <select
              value={form.berth_preference}
              onChange={(e) => setForm((f) => ({ ...f, berth_preference: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select</option>
              <option value="lower">Lower</option>
              <option value="middle">Middle</option>
              <option value="upper">Upper</option>
              <option value="side_lower">Side Lower</option>
              <option value="side_upper">Side Upper</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Roommate preference</label>
            <input
              type="text"
              value={form.roommate_preference}
              onChange={(e) => setForm((f) => ({ ...f, roommate_preference: e.target.value }))}
              placeholder="e.g. Quiet, Early riser"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>T-shirt size</label>
            <select
              value={form.tshirt_size}
              onChange={(e) => setForm((f) => ({ ...f, tshirt_size: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Jacket size</label>
            <select
              value={form.jacket_size}
              onChange={(e) => setForm((f) => ({ ...f, jacket_size: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medical section */}
      <div className="crm-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Medical Information</h2>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Allergies (comma-separated)</label>
            <input
              type="text"
              value={form.allergies.join(', ')}
              onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
              placeholder="e.g. Peanuts, Shellfish"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Medical conditions (comma-separated)</label>
            <input
              type="text"
              value={form.medical_conditions.join(', ')}
              onChange={(e) => setForm((f) => ({ ...f, medical_conditions: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
              placeholder="e.g. Asthma, Diabetes"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Medications (comma-separated)</label>
            <input
              type="text"
              value={form.medications.join(', ')}
              onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [] }))}
              placeholder="e.g. Inhaler, EpiPen"
              style={inputStyle}
            />
          </div>
          <div style={{ maxWidth: 200 }}>
            <label style={labelStyle}>Blood group</label>
            <select
              value={form.blood_group}
              onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>
      </div>

      {/* Emergency contacts section */}
      <div className="crm-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Emergency Contacts</h2>
          <button
            className="crm-btn sm"
            style={{ gap: 4 }}
            onClick={() => setShowAddContact(true)}
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {contacts.length === 0 && !showAddContact && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--crm-text-3)', fontSize: 13 }}>
            No emergency contacts added
          </div>
        )}

        {contacts.map((contact, i) => (
          <div
            key={contact.id || `new-${i}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--crm-hairline)' : undefined,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{contact.name}</div>
              <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>{contact.relation}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--crm-text-2)' }}>
                <Phone size={12} />
                {contact.phone}
              </span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--crm-text-3)' }}
                onClick={() => setContacts((c) => c.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {showAddContact && (
          <div style={{ padding: '12px 0', borderTop: contacts.length > 0 ? '1px solid var(--crm-hairline)' : undefined }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>Name</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Contact name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>Relation</label>
                <input
                  type="text"
                  value={newContact.relation}
                  onChange={(e) => setNewContact((c) => ({ ...c, relation: e.target.value }))}
                  placeholder="e.g. Spouse"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, fontSize: 12 }}>Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="crm-btn primary sm"
                disabled={!newContact.name || !newContact.phone}
                onClick={() => {
                  setContacts((c) => [...c, { ...newContact, id: `new-${Date.now()}`, priority: c.length + 1 }]);
                  setNewContact({ name: '', relation: '', phone: '', priority: 1 });
                  setShowAddContact(false);
                }}
              >
                Add contact
              </button>
              <button
                className="crm-btn sm"
                onClick={() => setShowAddContact(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="crm-btn primary"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          style={{ height: 44, paddingInline: 32, justifyContent: 'center', fontSize: 14 }}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save all changes'}
        </button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--crm-green)' }}>
            <CheckCircle2 size={16} />
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}
