-- Family Trip App: recover ALL of your trips at once by name, from Home
--
-- 0004 added per-trip recovery (you needed that trip's invite link, plus
-- your name). This adds a name-only entry point reachable from the Home
-- screen with no link at all: type your name once, and every trip you're
-- an adult member of gets re-linked to this browser in one go, so Home's
-- existing "your trips" list just shows them all -- no separate results
-- picker needed.
--
-- No schema changes. Run after 0001-0004. Safe to run again.

begin;

-- ---------------------------------------------------------------------
-- claim_all_by_name -- for every trip where exactly one adult member
-- matches the given name, re-links that member row to the caller's
-- current session. If a trip has two different adults sharing that exact
-- name, it's deliberately left alone (reported back as 'ambiguous' rather
-- than guessing which one to reconnect) -- matches claim_member's
-- per-trip behaviour, just fanned out across every trip at once.
-- ---------------------------------------------------------------------
create or replace function public.claim_all_by_name(p_display_name text)
returns table (trip_id uuid, trip_name text, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with matches as (
    select
      m.id as member_id,
      f.trip_id as trip_id,
      t.name as trip_name,
      count(*) over (partition by f.trip_id) as trip_match_count
    from public.members m
    join public.families f on f.id = m.family_id
    join public.trips t on t.id = f.trip_id
    where m.role = 'adult'
      and lower(trim(m.display_name)) = lower(trim(p_display_name))
  ),
  claimed as (
    update public.members m
    set user_id = auth.uid()
    from matches mt
    where m.id = mt.member_id and mt.trip_match_count = 1
    returning mt.trip_id, mt.trip_name
  )
  select c.trip_id, c.trip_name, 'claimed'::text as status from claimed c
  union all
  select distinct mt.trip_id, mt.trip_name, 'ambiguous'::text
  from matches mt
  where mt.trip_match_count > 1;
end;
$$;

grant execute on function public.claim_all_by_name(text) to authenticated;

commit;
