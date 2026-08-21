import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, KeyRound, Users } from 'lucide-react';
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

  const [mode, setMode] = useState('new'); // 'new' | 'recover'

  // "New family" fields
  const [familyName, setFamilyName] = useState('');
  const [mainFirstName, setMainFirstName] = useState('');
  const [mainLastName, setMainLastName] = useState('');
  const [otherMembers, setOtherMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // "I've been here before" fields
  const [recoverFirstName, setRecoverFirstName] = useState('');
  const [recoverLastName, setRecoverLastName] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureAnonSession();

        if (!asCreator) {
          const { data: existing } = await supabase.rpc('get_my_membership', { p_trip_id: tripId });
          const existingRow = Array.isArray(existing) ? existing[0] : existing;
          if (existingRow && !cancelled) {
            navigate(`/trip/${tripId}`, { replace: true });
            return;
          }
        }

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
  }, [tripId, asCreator, navigate]);

  const updateOtherMember = (i, field, value) => {
    const next = [...otherMembers];
    next[i] = { ...next[i], [field]: value };
    setOtherMembers(next);
  };

  const addOtherMemberField = () => setOtherMembers([...otherMembers, { name: '', role: 'adult' }]);

  const handleJoin = async () => {
    if (!familyName.trim() || !mainFirstName.trim() || !mainLastName.trim()) return;
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

      const memberRows = [
        {
          family_id: family.id,
          user_id: userId,
          display_name: `${mainFirstName.trim()} ${mainLastName.trim()}`,
          role: 'adult',
        },
        ...otherMembers
          .filter((m) => m.name.trim())
          .map((m) => ({
            family_id: family.id,
            user_id: userId,
            display_name: m.name.trim(),
            role: m.role,
          })),
      ];
      const { error: memErr } = await supabase.from('members').insert(memberRows);
      if (memErr) throw memErr;

      navigate(`/trip/${tripId}`);
    } catch (e) {
      setSubmitError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecover = async () => {
    if (!recoverFirstName.trim() || !recoverLastName.trim()) return;
    setRecovering(true);
    setRecoverError(null);
    try {
      const { error } = await supabase.rpc('claim_member', {
        p_trip_id: tripId,
        p_display_name: `${recoverFirstName.trim()} ${recoverLastName.trim()}`,
      });
      if (error) {
        if (error.message?.includes('not_found')) {
          setRecoverError("We couldn't find anyone by that name on this trip. Double-check the spelling, or use \"I'm new\" if this is your first time.");
        } else if (error.message?.includes('ambiguous')) {
          setRecoverError('More than one person on this trip has that name — check with whoever set up the trip to sort out access.');
        } else {
          setRecoverError(error.message);
        }
        return;
      }
      navigate(`/trip/${tripId}`);
    } catch (e) {
      setRecoverError(e.message || String(e));
    } finally {
      setRecovering(false);
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

            {!asCreator && (
              <div style={{ display: 'flex', gap: 6, background: PALETTE.sand, padding: 5, borderRadius: 12, marginBottom: 22 }}>
                <button
                  className={`tab-btn ${mode === 'new' ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setMode('new')}
                >
                  <Users size={14} /> I'm new
                </button>
                <button
                  className={`tab-btn ${mode === 'recover' ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setMode('recover')}
                >
                  <KeyRound size={14} /> I've been here before
                </button>
              </div>
            )}

            {mode === 'new' ? (
              <>
                <label className="field-label">Your family's name</label>
                <input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g. The Nguyens"
                  className="field-input"
                  style={{ marginBottom: 18 }}
                />

                <label className="field-label" style={{ marginBottom: 4 }}>
                  Your first and last name
                </label>
                <p style={{ fontSize: 12, color: `${PALETTE.ink}77`, marginBottom: 10 }}>
                  Keep this handy — it's how you'll hop back in later if you ever need to.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <input
                    value={mainFirstName}
                    onChange={(e) => setMainFirstName(e.target.value)}
                    placeholder="First name"
                    className="field-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <input
                    value={mainLastName}
                    onChange={(e) => setMainLastName(e.target.value)}
                    placeholder="Last name"
                    className="field-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>

                <label className="field-label" style={{ marginBottom: 4 }}>
                  Anyone else coming? (optional)
                </label>
                <p style={{ fontSize: 12, color: `${PALETTE.ink}77`, marginBottom: 10 }}>
                  Kids can be added, but only adults can vote, message, and manage lists in the app.
                </p>
                {otherMembers.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      value={m.name}
                      onChange={(e) => updateOtherMember(i, 'name', e.target.value)}
                      placeholder={`Family member ${i + 2}`}
                      style={{
                        flex: 1,
                        minWidth: 0,
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
                        onClick={() => updateOtherMember(i, 'role', 'adult')}
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
                        onClick={() => updateOtherMember(i, 'role', 'kid')}
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
                  onClick={addOtherMemberField}
                  style={{ background: 'none', border: 'none', color: PALETTE.coral, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 20 }}
                >
                  + Add another member
                </button>
                {submitError && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{submitError}</div>}
                <button
                  onClick={handleJoin}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={!familyName.trim() || !mainFirstName.trim() || !mainLastName.trim() || submitting}
                >
                  <Users size={16} /> {submitting ? 'Joining…' : asCreator ? 'Set up my family' : 'Join trip'} <Check size={16} />
                </button>
              </>
            ) : (
              <>
                <label className="field-label" style={{ marginBottom: 4 }}>
                  Your first and last name
                </label>
                <p style={{ fontSize: 12, color: `${PALETTE.ink}77`, marginBottom: 10 }}>
                  Pop in your name and we'll get you back to your spot.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <input
                    value={recoverFirstName}
                    onChange={(e) => setRecoverFirstName(e.target.value)}
                    placeholder="First name"
                    className="field-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <input
                    value={recoverLastName}
                    onChange={(e) => setRecoverLastName(e.target.value)}
                    placeholder="Last name"
                    className="field-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>
                {recoverError && <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 14 }}>{recoverError}</div>}
                <button
                  onClick={handleRecover}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={!recoverFirstName.trim() || !recoverLastName.trim() || recovering}
                >
                  <KeyRound size={16} /> {recovering ? 'Looking…' : 'Get me back in'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
