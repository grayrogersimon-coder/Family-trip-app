-- Family Trip App: "your name is your login" recovery
--
-- No schema changes -- reuses members.display_name. The app now asks
-- whoever creates a family for their first AND last name specifically (not
-- just a casual first name), and tells them plainly that this is what gets
-- them back in if this device ever loses its session (cleared browser data,
-- new phone, etc). This is deliberately lightweight, not real
-- authentication: anyone who knows a trip member's full name could
-- technically reclaim that identity too. That's an accepted trade-off for
-- a friends/family trip planner with no adversarial users, not an oversight
-- -- see the app's README for the fuller reasoning.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run, after
-- 0001-0003 have already been applied. Safe to run again.

begin;

-- ---------------------------------------------------------------------
-- claim_member -- re-links an existing adult member row to whichever
-- browser/session is currently calling this, if the name matches. Only
-- matches adults (kids can't act in the app anyway, so aren't worth
-- making independently recoverable). Scoped to one trip; an optional
-- family_id narrows the match if the name alone is ambiguous.
-- ---------------------------------------------------------------------
create or replace function public.claim_member(p_trip_id uuid, p_display_name text, p_family_id uuid default null)
returns table (member_id uuid, family_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_member_id uuid;
  v_family_id uuid;
begin
  select count(*), min(m.id), min(m.family_id)
    into v_count, v_member_id, v_family_id
  from public.members m
  join public.families f on f.id = m.family_id
  where f.trip_id = p_trip_id
    and m.role = 'adult'
    and lower(trim(m.display_name)) = lower(trim(p_display_name))
    and (p_family_id is null or m.family_id = p_family_id);

  if v_count = 0 then
    raise exception 'not_found';
  elsif v_count > 1 then
    raise exception 'ambiguous';
  end if;

  update public.members set user_id = auth.uid() where id = v_member_id;

  return query select v_member_id, v_family_id;
end;
$$;

grant execute on function public.claim_member(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_my_membership -- lets the join page check "is this browser already
-- a recognized member of this trip?" before showing any form at all, even
-- though a not-yet-member browser can't SELECT from members/families
-- directly under RLS. Written as an explicit join (not relying on
-- PostgREST's foreign-key-relationship inference), so it works regardless
-- of whether a formal FK constraint exists on members.family_id.
-- ---------------------------------------------------------------------
create or replace function public.get_my_membership(p_trip_id uuid)
returns table (member_id uuid, family_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.family_id
  from public.members m
  join public.families f on f.id = m.family_id
  where f.trip_id = p_trip_id and m.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_membership(uuid) to authenticated;

commit;
