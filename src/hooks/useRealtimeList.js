import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Fetches rows filtered by one column, then keeps them live: any INSERT /
// UPDATE / DELETE on this table for this trip triggers a refetch. Trip-scale
// data here is small (a handful of families' worth of activities, shopping
// items, messages...), so a full refetch per change is simple and correct
// rather than hand-rolling incremental patches.
export function useRealtimeList({ table, filter, select = '*', orderBy, enabled = true }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterColumn = filter?.column;
  const filterValue = filter?.value;
  const orderColumn = orderBy?.column;
  const orderAscending = orderBy?.ascending ?? true;

  const fetchAll = useCallback(async () => {
    if (!enabled || !filterValue) return;
    let query = supabase.from(table).select(select);
    if (filterColumn) query = query.eq(filterColumn, filterValue);
    if (orderColumn) query = query.order(orderColumn, { ascending: orderAscending });
    const { data: rows, error: err } = await query;
    if (err) setError(err.message);
    else {
      setError(null);
      setData(rows || []);
    }
    setLoading(false);
  }, [table, select, filterColumn, filterValue, orderColumn, orderAscending, enabled]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!enabled || !filterColumn || !filterValue) return;
    const channel = supabase
      .channel(`${table}:${filterColumn}:${filterValue}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${filterColumn}=eq.${filterValue}` },
        () => {
          fetchAll();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filterColumn, filterValue, enabled, fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
