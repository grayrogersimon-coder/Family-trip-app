-- Family Trip App: allow removing items from the "what we're bringing" list
--
-- bringing_items had SELECT/INSERT/UPDATE policies but no DELETE policy
-- (same gap shopping_items originally had in 0001) -- deletes were
-- silently denied by RLS's default-deny.
--
-- Run after 0001-0007. Safe to run again.

begin;

drop policy if exists "Trip members can delete bringing items" on public.bringing_items;
create policy "Trip members can delete bringing items"
  on public.bringing_items for delete
  using (is_trip_member(trip_id));

commit;
