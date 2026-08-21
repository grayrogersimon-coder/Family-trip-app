import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureAnonSession } from '../lib/identity';
import { PALETTE } from '../lib/palette';

export default function RecoverAccess() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { claimed: [{trip_id, trip_name}], ambiguous: [...] }

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      await ensureAnonSession();
      const { data, error: err } = await supabase.rpc('claim_all_by_name', {
        p_display_name: `${firstName.trim()} ${lastName.trim()}`,
      });
      if (err) throw err;
      const rows = data || [];
      if (rows.length === 0) {
        setError("We couldn't find anyone by that name. Double-check the spelling, or ask whoever's running the trip for an invite link instead.");
        return;
      }
      setResult({
        claimed: rows.filter((r) => r.status === 'claimed'),
        ambiguous: rows.filter((r) => r.status === 'ambiguous'),
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PALETTE.teal, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
        >
          <ArrowLeft size={14} /> All trips
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <KeyRound size={22} color={PALETTE.coral} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: PALETTE.teal }}>
            Get back in
          </span>
        </div>

        {!result ? (
          <>
            <h1 className="heading-font" style={{ fontSize: 'clamp(24px, 7vw, 32px)', fontWeight: 600, textAlign: 'center', lineHeight: 1.15, marginBottom: 12 }}>
              What's your name?
            </h1>
            <p style={{ textAlign: 'center', color: `${PALETTE.ink}99`, fontSize: 15, marginBottom: 28 }}>
              Pop in the name you joined with and we'll take you straight back to your trips.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="First name"
                className="field-input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Last name"
                className="field-input"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
            {error && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button
              onClick={handleSubmit}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!firstName.trim() || !lastName.trim() || submitting}
            >
              <KeyRound size={16} /> {submitting ? 'Looking…' : 'Find my trips'}
            </button>
          </>
        ) : (
          <>
            {result.claimed.length > 0 ? (
              <>
                <h1 className="heading-font" style={{ fontSize: 28, fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
                  Welcome back, {firstName.trim()}
                </h1>
                <p style={{ textAlign: 'center', color: `${PALETTE.ink}99`, fontSize: 15, marginBottom: 20 }}>
                  You're back into {result.claimed.length} {result.claimed.length === 1 ? 'trip' : 'trips'}:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {result.claimed.map((t) => (
                    <div key={t.trip_id} style={{ background: 'white', border: `1px solid ${PALETTE.sand}`, borderRadius: 12, padding: '14px 16px', fontWeight: 600, fontSize: 15 }}>
                      {t.trip_name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: `${PALETTE.ink}99`, fontSize: 15, marginBottom: 20 }}>
                We found your name, but couldn't automatically get you back in — see below.
              </p>
            )}

            {result.ambiguous.length > 0 && (
              <div style={{ background: PALETTE.cream, borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 13, color: `${PALETTE.ink}99` }}>
                More than one person shares that name on {result.ambiguous.length === 1 ? 'a trip' : 'some trips'}, so
                we couldn't be sure which one is you — check with whoever set up the trip to sort out access:{' '}
                {result.ambiguous.map((t) => t.trip_name).join(', ')}.
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              View your trips <Check size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
