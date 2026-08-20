import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useTrip(tripId) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrip = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
    if (err) setError(err.message);
    else {
      setError(null);
      setTrip(data);
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  return { trip, loading, error, refetch: fetchTrip };
}
