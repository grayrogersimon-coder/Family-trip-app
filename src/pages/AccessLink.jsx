import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureAnonSession } from '../lib/identity';
import { PALETTE } from '../lib/palette';

export default function AccessLink() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureAnonSession();
        const { data, error: err } = await supabase.rpc('claim_member_by_token', { p_token: token });
        if (err) throw err;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.trip_id) throw new Error('not_found');
        if (!cancelled) navigate(`/trip/${row.trip_id}`, { replace: true });
      } catch (e) {
        if (cancelled) return;
        const message = e.message?.includes('not_found')
          ? "This link doesn't look right — ask whoever shared it for a fresh one."
          : e.message || String(e);
        setError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        {error ? (
          <>
            <div style={{ fontSize: 14, color: PALETTE.coral, marginBottom: 16 }}>{error}</div>
            <button onClick={() => navigate('/')} className="btn-primary" style={{ justifyContent: 'center' }}>
              Go to your trips
            </button>
          </>
        ) : (
          <>
            <KeyRound size={24} color={PALETTE.coral} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>Getting you in…</div>
          </>
        )}
      </div>
    </div>
  );
}
