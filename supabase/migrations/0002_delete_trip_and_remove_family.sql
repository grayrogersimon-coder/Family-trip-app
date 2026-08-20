-- Family Trip App: trip deletion + family removal
-- Safe to run multiple times (functions are create-or-replace). Adds two
-- RPCs; does not touch existing columns, tables, or data.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run, after
-- 0001_app_additions.sql has already been applied.
--
-- Why RPCs instead of a pile of new DELETE policies on every table: both
-- operations touch many tables at once (a trip deletion cascades through
-- activities, votes, suggestions, shopping items, bringing items, expenses,
-- messages, members, and the family/trip rows themselves). Doing that as a
-- sequence of separate client-side deletes isn't atomic — a failure partway
-- through (or a missing permission on just one table) would leave orphaned
-- rows behind. Wrapping it in one security-definer function makes it
-- all-or-nothing and keeps the authorization check in one place instead of
-- duplicated across a dozen RLS policies.

begin;

-- ---------------------------------------------------------------------
-- remove_family — removes one family (and its members) from a trip.
-- Callable by that family's own creator (self-service "leave trip") or by
-- the trip's creator (removing another family). Chat messages, activities,
-- and expenses that family was involved in are kept for history — only
-- their attribution to this family/member is cleared — rather than being
-- deleted outright. Votes and "what we're bringing" entries are specific
-- enough to this family that they're deleted along with it.
-- ---------------------------------------------------------------------
create or replace function public.remove_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_authorized boolean;
begin
  select trip_id into v_trip_id from public.families where id = p_family_id;
  if v_trip_id is null then
    raise exception 'Family not found';
  end if;

  select
    exists (select 1 from public.families f where f.id = p_family_id and f.created_by = auth.uid())
    or exists (select 1 from public.trips t where t.id = v_trip_id and t.created_by = auth.uid())
  into v_authorized;

  if not v_authorized then
    raise exception 'Not authorized to remove this family';
  end if;

  delete from public.activity_votes
    where member_id in (select id from public.members where family_id = p_family_id);

  update public.activities set proposed_by = null
    where proposed_by in (select id from public.members where family_id = p_family_id);

  update public.messages set sender_id = null
    where sender_id in (select id from public.members where family_id = p_family_id);

  update public.shopping_items set added_by = null
    where added_by in (select id from public.members where family_id = p_family_id);
  update public.shopping_items set assigned_to_family_id = null
    where assigned_to_family_id = p_family_id;

  delete from public.bringing_items where family_id = p_family_id;

  update public.expenses set paid_by_family_id = null where paid_by_family_id = p_family_id;

  update public.activity_suggestions set suggested_by_family_id = null
    where suggested_by_family_id = p_family_id;

  delete from public.members where family_id = p_family_id;
  delete from public.families where id = p_family_id;
end;
$$;

grant execute on function public.remove_family(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- delete_trip — deletes a trip and everything under it. Only the trip's
-- creator can do this. Unlike remove_family, nothing is preserved: this is
-- "delete the whole trip," not "one family left."
-- ---------------------------------------------------------------------
create or replace function public.delete_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.trips where id = p_trip_id and created_by = auth.uid()) then
    raise exception 'Not authorized to delete this trip';
  end if;

  delete from public.activity_votes
    where activity_id in (select id from public.activities where trip_id = p_trip_id);
  delete from public.activity_suggestions
    where activity_id in (select id from public.activities where trip_id = p_trip_id);
  delete from public.activities where trip_id = p_trip_id;
  delete from public.shopping_items where trip_id = p_trip_id;
  delete from public.bringing_items where trip_id = p_trip_id;
  delete from public.expenses where trip_id = p_trip_id;
  delete from public.messages where trip_id = p_trip_id;
  delete from public.members where family_id in (select id from public.families where trip_id = p_trip_id);
  delete from public.families where trip_id = p_trip_id;
  delete from public.trips where id = p_trip_id;
end;
$$;

grant execute on function public.delete_trip(uuid) to authenticated;

commit;
