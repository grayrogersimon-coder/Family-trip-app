-- Family Trip App: personal per-person access links
--
-- Replaces "type your name to get back in" with something both simpler and
-- more secure: each adult member gets one unguessable link
-- (/access/<token>). Opening it links that browser to that person, no name
-- typing, no ambiguity -- and unlike a name, a random token isn't something
-- another trip member already knows just from being on the trip.
--
-- IMPORTANT: access_token must never be returned by a plain row select.
-- The existing "Trip members can view members" SELECT policy is
-- trip-wide (not scoped to your own family), so if a client ever ran
-- select('*') on members, it would hand every trip member everyone else's
-- magic link. It's deliberately only ever readable through
-- get_member_access_token below, which does its own authorization check.
-- The app's members-list queries were audited to request an explicit
-- column list rather than '*' for exactly this reason -- keep that
-- discipline if you add new members queries later.
--
-- Run after 0001-0006. Safe to run again.

begin;

alter table public.members
  add column if not exists access_token uuid not null default gen_random_uuid();

-- Belt-and-braces against the leak scenario above: even if some future
-- policy or client slip did select('*') on members, revoking column-level
-- select on access_token from the anon/authenticated roles means Postgres
-- itself refuses to return it outside of the SECURITY DEFINER function
-- (which runs as the table owner, not affected by this revoke).
revoke select (access_token) on public.members from anon, authenticated;

-- ---------------------------------------------------------------------
-- get_member_access_token -- the only sanctioned way to read a token.
-- Authorized to: that family's creator, the trip's creator, or the
-- member themself (so someone can re-copy their own link for a new
-- device before losing the old one).
-- ---------------------------------------------------------------------
create or replace function public.get_member_access_token(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_trip_id uuid;
  v_member_user_id uuid;
  v_token uuid;
  v_authorized boolean;
begin
  select m.family_id, f.trip_id, m.user_id, m.access_token
    into v_family_id, v_trip_id, v_member_user_id, v_token
  from public.members m
  join public.families f on f.id = m.family_id
  where m.id = p_member_id;

  if v_family_id is null then
    raise exception 'Member not found';
  end if;

  select
    v_member_user_id = auth.uid()
    or exists (select 1 from public.families f where f.id = v_family_id and f.created_by = auth.uid())
    or exists (select 1 from public.trips t where t.id = v_trip_id and t.created_by = auth.uid())
  into v_authorized;

  if not v_authorized then
    raise exception 'Not authorized to view this link';
  end if;

  return v_token;
end;
$$;

grant execute on function public.get_member_access_token(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- claim_member_by_token -- re-links a member row to whoever calls this
-- with the right token. The token itself is the credential; no further
-- authorization check is meaningful or needed.
-- ---------------------------------------------------------------------
create or replace function public.claim_member_by_token(p_token uuid)
returns table (trip_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_trip_id uuid;
begin
  select m.id, f.trip_id into v_member_id, v_trip_id
  from public.members m
  join public.families f on f.id = m.family_id
  where m.access_token = p_token;

  if v_member_id is null then
    raise exception 'not_found';
  end if;

  update public.members set user_id = auth.uid() where id = v_member_id;

  return query select v_trip_id, v_member_id;
end;
$$;

grant execute on function public.claim_member_by_token(uuid) to authenticated;

commit;
