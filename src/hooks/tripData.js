import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeList } from './useRealtimeList';

export function useFamilies(tripId) {
  return useRealtimeList({
    table: 'families',
    filter: { column: 'trip_id', value: tripId },
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useMembers(familyIds) {
  // Members are scoped by family_id, not trip_id directly.
  return useRealtimeListByIn({
    table: 'members',
    column: 'family_id',
    values: familyIds,
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useActivities(tripId) {
  return useRealtimeList({
    table: 'activities',
    filter: { column: 'trip_id', value: tripId },
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useActivityVotes(activityIds) {
  return useRealtimeListByIn({
    table: 'activity_votes',
    column: 'activity_id',
    values: activityIds,
  });
}

export function useActivitySuggestions(activityIds) {
  return useRealtimeListByIn({
    table: 'activity_suggestions',
    column: 'activity_id',
    values: activityIds,
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useShoppingItems(tripId) {
  return useRealtimeList({
    table: 'shopping_items',
    filter: { column: 'trip_id', value: tripId },
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useBringingItems(tripId) {
  return useRealtimeList({
    table: 'bringing_items',
    filter: { column: 'trip_id', value: tripId },
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useExpenses(tripId) {
  return useRealtimeList({
    table: 'expenses',
    filter: { column: 'trip_id', value: tripId },
    orderBy: { column: 'created_at', ascending: true },
  });
}

export function useMessages(tripId) {
  return useRealtimeList({
    table: 'messages',
    filter: { column: 'trip_id', value: tripId },
    orderBy: { column: 'created_at', ascending: true },
  });
}

// ---------------------------------------------------------------------
// A handful of lists are naturally scoped by "belongs to one of these
// parent ids" (members belong to one of this trip's families; votes and
// suggestions belong to one of this trip's activities) rather than by a
// trip_id column directly. Same refetch-on-change strategy as
// useRealtimeList, just keyed off an `in (...)` filter instead of `eq`.
// ---------------------------------------------------------------------
function useRealtimeListByIn({ table, column, values, select = '*', orderBy }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sortedValues = (values || []).slice().sort();
  const key = sortedValues.join(',');

  const fetchAll = useCallback(async () => {
    if (sortedValues.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }
    let query = supabase.from(table).select(select).in(column, sortedValues);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data: rows, error: err } = await query;
    if (err) setError(err.message);
    else {
      setError(null);
      setData(rows || []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, column, key, orderBy?.column, orderBy?.ascending]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (sortedValues.length === 0) return;
    const channel = supabase
      .channel(`${table}:${column}:in:${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${column}=in.(${sortedValues.join(',')})` },
        () => {
          fetchAll();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, key, fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
