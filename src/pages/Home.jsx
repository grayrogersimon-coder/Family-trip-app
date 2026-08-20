import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ensureAnonSession } from '../lib/identity';
import { PALETTE } from '../lib/palette';
import { detectSourceType } from '../lib/tripUtils';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [familyCounts, setFamilyCounts] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureAnonSession();
        const { data: tripRows, error: tripErr } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });
        if (tripErr) throw tripErr;
        if (cancelled) return;
        setTrips(tripRows || []);

        const tripIds = (tripRows || []).map((t) => t.id);
        if (tripIds.length > 0) {
          const { data: familyRows, error: famErr } = await supabase
            .from('families')
            .select('id, trip_id')
            .in('trip_id', tripIds);
          if (famErr) throw famErr;
          if (cancelled) return;
          const counts = {};
          (familyRows || []).forEach((f) => {
            counts[f.trip_id] = (counts[f.trip_id] || 0) + 1;
          });
          setFamilyCounts(counts);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Plane size={20} color={PALETTE.coral} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: PALETTE.teal,
          }}
        >
          Your Trips
        </span>
      </div>
      <h1 className="fraunces" style={{ fontSize: 34, fontWeight: 600, marginBottom: 28 }}>
        Where to next?
      </h1>

      <button
        onClick={() => navigate('/new')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: PALETTE.coral,
          color: 'white',
          border: 'none',
          borderRadius: 14,
          padding: '18px',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: 28,
        }}
      >
        <Plus size={18} /> Start a new trip
      </button>

      {error && (
        <div style={{ color: PALETTE.coral, fontSize: 13, marginBottom: 16 }}>
          Couldn't load your trips: {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>Loading your trips…</div>
      ) : trips.length === 0 ? (
        <div style={{ fontSize: 14, color: `${PALETTE.ink}77` }}>
          No trips yet. Start one above, or open an invite link a friend sent you.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.map((t) => {
            const source = detectSourceType(t.location_source_url);
            const count = familyCounts[t.id] || 0;
            return (
              <div
                key={t.id}
                onClick={() => navigate(`/trip/${t.id}`)}
                style={{
                  background: 'white',
                  border: `1px solid ${PALETTE.sand}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'stretch',
                }}
              >
                <div style={{ width: 8, background: PALETTE.coral, flexShrink: 0 }} />
                <div style={{ padding: 18, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: PALETTE.coral,
                      }}
                    >
                      Trip
                    </span>
                    {source && (
                      <span
                        style={{
                          fontSize: 11,
                          color: `${PALETTE.ink}66`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <source.icon size={11} /> {source.type}
                      </span>
                    )}
                  </div>
                  <div className="fraunces" style={{ fontSize: 19, fontWeight: 600 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 13, color: `${PALETTE.ink}77`, marginTop: 4 }}>
                    {count} {count === 1 ? 'family' : 'families'} ·{' '}
                    {t.track_expenses ? 'tracking expenses' : 'winging it'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
