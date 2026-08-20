-- Family Trip App: enable Realtime broadcasting for every table the app
-- subscribes to.
--
-- Creating a table does NOT automatically make its changes broadcast over
-- Supabase Realtime — a table has to be explicitly added to the
-- `supabase_realtime` publication (the same thing the Database -> Replication
-- toggle in the dashboard does). None of these tables were ever added, which
-- is why writes were saving correctly but never visibly updating anyone's
-- screen: the app's UI only refreshes in response to a realtime event, and
-- no event was ever being sent.
--
-- Idempotent: checks pg_publication_tables before adding each one, so this
-- is safe to run again.

do $$
declare
  t text;
begin
  foreach t in array array[
    'trips',
    'families',
    'members',
    'activities',
    'activity_votes',
    'activity_suggestions',
    'shopping_items',
    'bringing_items',
    'expenses',
    'messages'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
