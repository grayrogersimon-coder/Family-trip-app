import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, ArrowLeft, Check, DollarSign, Plane } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureAnonSession, getUserId } from '../lib/identity';
import { PALETTE } from '../lib/palette';
import { addDaysToISODate, detectSourceType, extractPlaceName } from '../lib/tripUtils';

export default function NewTrip() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('location'); // location | confirm
  const [locationInput, setLocationInput] = useState('');
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [tripDays, setTripDays] = useState('');
  const [trackExpenses, setTrackExpenses] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const source = locationInput ? detectSourceType(locationInput) : null;
  const placeName = locationInput ? extractPlaceName(locationInput) : '';

  const goToConfirm = () => {
    if (!locationInput.trim()) return;
    setStage('confirm');
  };

  const handleCreate = async () => {
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
          name: tripName.trim() || placeName || 'Our trip',
          location_name: placeName || null,
          location_source_url: locationInput.trim() || null,
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

  if (stage === 'location') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: PALETTE.teal,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={14} /> All trips
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
            <Plane size={22} color={PALETTE.coral} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: PALETTE.teal }}>
              New Trip
            </span>
          </div>
          <h1
            className="fraunces"
            style={{ fontSize: 'clamp(28px, 8vw, 40px)', fontWeight: 600, textAlign: 'center', lineHeight: 1.15, marginBottom: 12 }}
          >
            Where are you
            <br />
            headed?
          </h1>
          <p style={{ textAlign: 'center', color: `${PALETTE.ink}99`, fontSize: 15, marginBottom: 36 }}>
            Paste an Airbnb, hotel, website, or Google Maps link — or just type a place name. Everything else builds
            from here.
          </p>
          <div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <MapPin size={18} style={{ position: 'absolute', left: 16, top: 18, color: PALETTE.coral }} />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && locationInput.trim()) goToConfirm();
                }}
                placeholder="airbnb.com/rooms/... or 'Ningaloo Reef, WA'"
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 44px',
                  fontSize: 15,
                  border: `2px solid ${PALETTE.sand}`,
                  borderRadius: 12,
                  background: 'white',
                  fontFamily: 'inherit',
                  color: PALETTE.ink,
                }}
              />
            </div>
            <button
              type="button"
              onClick={goToConfirm}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!locationInput.trim()}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(27,75,74,0.15)',
            border: `1px solid ${PALETTE.sand}`,
          }}
        >
          <div style={{ background: PALETTE.teal, padding: '28px 28px 40px', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: PALETTE.sand,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {source && <source.icon size={14} />}
              {source?.type}
            </div>
            <h2 className="fraunces" style={{ color: 'white', fontSize: 28, fontWeight: 600, marginTop: 8 }}>
              {placeName}
            </h2>
          </div>
          <div style={{ padding: 28, marginTop: -20 }}>
            <div
              style={{
                background: PALETTE.cream,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                fontSize: 13,
                color: `${PALETTE.ink}99`,
                wordBreak: 'break-all',
              }}
            >
              {locationInput}
            </div>
            <label className="field-label">Name this trip</label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder={`${placeName} 2026`}
              className="field-input"
              style={{ marginBottom: 18 }}
            />
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
                  flex: 1,
                  padding: '13px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 13,
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
                  flex: 1,
                  padding: '13px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 13,
                  border: `2px solid ${!trackExpenses ? PALETTE.teal : PALETTE.sand}`,
                  background: !trackExpenses ? PALETTE.teal : 'white',
                  color: !trackExpenses ? 'white' : PALETTE.ink,
                }}
              >
                We'll wing it
              </button>
            </div>
            {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setStage('location')}>
                Back
              </button>
              <button onClick={handleCreate} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={creating}>
                {creating ? 'Creating…' : 'Create trip'} <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
