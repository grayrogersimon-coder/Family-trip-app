import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureAnonSession, getUserId } from '../lib/identity';
import { PALETTE } from '../lib/palette';

export default function JoinTrip() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const asCreator = searchParams.get('asCreator') === '1';
  const navigate = useNavigate();

  const [loadingTrip, setLoadingTrip] = useState(true);
  const [trip, setTrip] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState([{ name: '', role: 'adult' }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureAnonSession();
        const { data, error } = await supabase.rpc('get_trip_preview', { p_trip_id: tripId });
        if (error) throw error;
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setLoadError("This invite link doesn't match a trip. Ask whoever sent it to double-check the link.");
        } else {
          setTrip(row);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message || String(e));
      } finally {
        if (!cancelled) setLoadingTrip(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const updateMember = (i, field, value) => {
    const next = [...members];
    next[i] = { ...next[i], [field]: value };
    setMembers(next);
  };

  const addMemberField = () => setMembers([...members, { name: '', role: 'adult' }]);

  const handleJoin = async () => {
    if (!familyName.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const userId = await getUserId();
      const { data: family, error: famErr } = await supabase
        .from('families')
        .insert({ trip_id: tripId, family_name: familyName.trim(), created_by: userId })
        .select()
        .single();
      if (famErr) throw famErr;

      const memberRows = members
        .filter((m) => m.name.trim())
        .map((m) => ({
          family_id: family.id,
          user_id: userId,
          display_name: m.name.trim(),
          role: m.role,
        }));
      if (memberRows.length === 0) {
        memberRows.push({ family_id: family.id, user_id: userId, display_name: familyName.trim(), role: 'adult' });
      }
      const { error: memErr } = await supabase.from('members').insert(memberRows);
      if (memErr) throw memErr;

      navigate(`/trip/${tripId}`);
    } catch (e) {
      setSubmitError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTrip) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>Loading trip…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: PALETTE.coral }}>{loadError}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(27,75,74,0.15)',
            border: `1px solid ${PALETTE.sand}`,
          }}
        >
          <div style={{ background: PALETTE.teal, padding: '22px 28px' }}>
            <div style={{ color: PALETTE.sand, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {asCreator ? 'Almost there' : "You've been invited to"}
            </div>
            <h3 className="fraunces" style={{ color: 'white', fontSize: 24, fontWeight: 600, marginTop: 4 }}>
              {trip.name}
            </h3>
          </div>
          <div style={{ padding: 28 }}>
            {asCreator && (
              <p style={{ fontSize: 14, color: `${PALETTE.ink}99`, marginBottom: 18 }}>
                Set up your own family group before you get to the trip dashboard.
              </p>
            )}
            <label className="field-label">Your family's name</label>
            <input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. The Nguyens"
              className="field-input"
              style={{ marginBottom: 18 }}
            />
            <label className="field-label" style={{ marginBottom: 4 }}>
              Who's coming?
            </label>
            <p style={{ fontSize: 12, color: `${PALETTE.ink}77`, marginBottom: 10 }}>
              Kids can be added, but only adults can vote, message, and manage lists in the app.
            </p>
            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={m.name}
                  onChange={(e) => updateMember(i, 'name', e.target.value)}
                  placeholder={`Family member ${i + 1}`}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: 14,
                    border: `2px solid ${PALETTE.sand}`,
                    borderRadius: 10,
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', border: `2px solid ${PALETTE.sand}`, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => updateMember(i, 'role', 'adult')}
                    style={{
                      padding: '0 12px',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: m.role === 'adult' ? PALETTE.teal : 'white',
                      color: m.role === 'adult' ? 'white' : PALETTE.ink,
                    }}
                  >
                    Adult
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMember(i, 'role', 'kid')}
                    style={{
                      padding: '0 12px',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: m.role === 'kid' ? PALETTE.coral : 'white',
                      color: m.role === 'kid' ? 'white' : PALETTE.ink,
                    }}
                  >
                    Kid
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addMemberField}
              style={{ background: 'none', border: 'none', color: PALETTE.coral, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 20 }}
            >
              + Add another member
            </button>
            {submitError && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{submitError}</div>}
            <button
              onClick={handleJoin}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!familyName.trim() || submitting}
            >
              <Users size={16} /> {submitting ? 'Joining…' : asCreator ? 'Set up my family' : 'Join trip'} <Check size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
