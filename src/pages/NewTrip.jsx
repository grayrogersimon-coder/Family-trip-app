import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, DollarSign, MapPin, Plane } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureAnonSession, getUserId } from '../lib/identity';
import { PALETTE } from '../lib/palette';
import { addDaysToISODate, detectSourceType, extractPlaceName } from '../lib/tripUtils';

export default function NewTrip() {
  const navigate = useNavigate();
  const [tripName, setTripName] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tripDays, setTripDays] = useState('');
  const [trackExpenses, setTrackExpenses] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const source = address ? detectSourceType(address) : null;
  const placeName = address ? extractPlaceName(address) : '';

  const handleCreate = async () => {
    if (!tripName.trim() || !address.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await ensureAnonSession();
      const userId = await getUserId();
      const days = Number(tripDays);
      let endDate = null;
      if (startDate && days > 0) {
        endDate = addDaysToISODate(startDate, days - 1);
      }
      const { data, error: insertErr } = await supabase
        .from('trips')
        .insert({
          name: tripName.trim(),
          location_name: placeName || null,
          location_source_url: address.trim(),
          start_date: startDate || null,
          end_date: endDate,
          track_expenses: trackExpenses,
          created_by: userId,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      navigate(`/join/${data.id}?asCreator=1`);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PALETTE.teal, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
        >
          <ArrowLeft size={14} /> All trips
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <Plane size={22} color={PALETTE.coral} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: PALETTE.teal }}>
            New Trip
          </span>
        </div>
        <h1 className="heading-font" style={{ fontSize: 'clamp(26px, 7vw, 34px)', fontWeight: 600, textAlign: 'center', marginBottom: 28 }}>
          Add your trip
        </h1>

        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 20px 60px rgba(27,75,74,0.15)',
            border: `1px solid ${PALETTE.sand}`,
          }}
        >
          <label className="field-label">Trip name</label>
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder={placeName ? `${placeName} 2026` : 'e.g. Ningaloo Reef 2026'}
            className="field-input"
            style={{ marginBottom: 18 }}
          />

          <label className="field-label" style={{ marginBottom: 4 }}>Address</label>
          <p style={{ fontSize: 12, color: `${PALETTE.ink}77`, marginBottom: 10 }}>
            Paste an Airbnb, hotel, or Google Maps link — or just type the address.
          </p>
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <MapPin size={16} style={{ position: 'absolute', left: 14, top: 14, color: PALETTE.coral }} />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="airbnb.com/rooms/... or '12 Reef Rd, Ningaloo WA'"
              className="field-input"
              style={{ paddingLeft: 40 }}
            />
          </div>
          {source && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: `${PALETTE.ink}77`, marginBottom: 18 }}>
              <source.icon size={12} /> Detected: {source.type}
            </div>
          )}
          {!source && <div style={{ marginBottom: 18 }} />}

          <label className="field-label">When do you leave? (optional)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field-input"
            style={{ marginBottom: 18 }}
          />
          <label className="field-label">How many days is the trip?</label>
          <input
            type="number"
            min="1"
            value={tripDays}
            onChange={(e) => setTripDays(e.target.value)}
            placeholder="e.g. 5"
            className="field-input"
            style={{ marginBottom: 24 }}
          />
          <label className="field-label">
            Would you like to track family expenses for this trip, or are you just going to wing it?
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setTrackExpenses(true)}
              style={{
                flex: 1, padding: '13px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
                border: `2px solid ${trackExpenses ? PALETTE.teal : PALETTE.sand}`,
                background: trackExpenses ? PALETTE.teal : 'white',
                color: trackExpenses ? 'white' : PALETTE.ink,
              }}
            >
              <DollarSign size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Track expenses
            </button>
            <button
              type="button"
              onClick={() => setTrackExpenses(false)}
              style={{
                flex: 1, padding: '13px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
                border: `2px solid ${!trackExpenses ? PALETTE.teal : PALETTE.sand}`,
                background: !trackExpenses ? PALETTE.teal : 'white',
                color: !trackExpenses ? 'white' : PALETTE.ink,
              }}
            >
              We'll wing it
            </button>
          </div>
          {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <button
            onClick={handleCreate}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!tripName.trim() || !address.trim() || creating}
          >
            {creating ? 'Creating…' : 'Create trip'} <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
