-- Family Trip App: editing a family (rename family, rename/re-role members,
-- add/remove members) from the Family dashboard modal.
--
-- Run after 0001-0005. Safe to run again.

begin;

-- ---------------------------------------------------------------------
-- members: no UPDATE policy existed at all (only SELECT/INSERT), so
-- renaming a member or changing adult/kid was silently denied by RLS's
-- default-deny. Family creator or trip creator can update members in
-- that family -- same authorization shape as remove_family.
-- ---------------------------------------------------------------------
drop policy if exists "Family or trip creator can update members" on public.members;
create policy "Family or trip creator can update members"
  on public.members for update
  using (
    family_id in (select id from public.families where created_by = auth.uid())
    or family_id in (select id from public.families where trip_id in (select id from public.trips where created_by = auth.uid()))
  );

-- ---------------------------------------------------------------------
-- families: previously only that family's own creator could rename it.
-- Adds trip-creator as an additional (not replacement) permitted editor,
-- matching remove_family's "trip creator can manage any family" rule.
-- ---------------------------------------------------------------------
drop policy if exists "Trip creator can update any family" on public.families;
create policy "Trip creator can update any family"
  on public.families for update
  using (trip_id in (select id from public.trips where created_by = auth.uid()));

-- ---------------------------------------------------------------------
-- remove_member -- removes a single member (not the whole family).
-- Mirrors remove_family's cleanup at member scope: preserves messages
-- and confirmed activities (un-attributes them) rather than deleting
-- them, deletes that member's votes, then the member row itself.
-- ---------------------------------------------------------------------
create or replace function public.remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_trip_id uuid;
  v_authorized boolean;
begin
  select m.family_id, f.trip_id into v_family_id, v_trip_id
  from public.members m
  join public.families f on f.id = m.family_id
  where m.id = p_member_id;

  if v_family_id is null then
    raise exception 'Member not found';
  end if;

  select
    exists (select 1 from public.families f where f.id = v_family_id and f.created_by = auth.uid())
    or exists (select 1 from public.trips t where t.id = v_trip_id and t.created_by = auth.uid())
  into v_authorized;

  if not v_authorized then
    raise exception 'Not authorized to remove this member';
  end if;

  delete from public.activity_votes where member_id = p_member_id;
  update public.activities set proposed_by = null where proposed_by = p_member_id;
  update public.messages set sender_id = null where sender_id = p_member_id;
  update public.shopping_items set added_by = null where added_by = p_member_id;

  delete from public.members where id = p_member_id;
end;
$$;

grant execute on function public.remove_member(uuid) to authenticated;

commit;
