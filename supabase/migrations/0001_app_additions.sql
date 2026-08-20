-- Family Trip App: additive migration
-- Safe to run multiple times. Adds nothing that removes or renames existing
-- columns/tables/data — only new columns, new tables, new policies, and one
-- new constraint needed by the app.
--
-- Run this whole file in Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Also required (cannot be done from SQL): in Supabase Dashboard ->
-- Authentication -> Sign In / Providers, enable "Allow anonymous sign-ins".
-- The app signs each browser in anonymously (no email/password, no visible
-- login screen) so that auth.uid() is populated and your existing
-- auth.uid()-based RLS policies work as written.

begin;

-- ---------------------------------------------------------------------
-- 1. trips.track_expenses — per-trip toggle for the Expenses tab
-- ---------------------------------------------------------------------
alter table public.trips
  add column if not exists track_expenses boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. shopping_items.group_name — lets items be bundled under a heading
--    like "Taco night" (a plain text label, not a separate table: a
--    group exists implicitly wherever items share the same group_name).
-- ---------------------------------------------------------------------
alter table public.shopping_items
  add column if not exists group_name text;

-- ---------------------------------------------------------------------
-- 3. bringing_items — "what we're bringing" list per trip/family
-- ---------------------------------------------------------------------
create table if not exists public.bringing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  item_name text not null,
  family_id uuid references public.families(id),
  added_by uuid,
  created_at timestamp with time zone default now()
);

alter table public.bringing_items enable row level security;

drop policy if exists "Trip members can view bringing items" on public.bringing_items;
create policy "Trip members can view bringing items"
  on public.bringing_items for select
  using (is_trip_member(trip_id));

drop policy if exists "Trip members can add bringing items" on public.bringing_items;
create policy "Trip members can add bringing items"
  on public.bringing_items for insert
  with check (is_trip_member(trip_id));

drop policy if exists "Trip members can update bringing items" on public.bringing_items;
create policy "Trip members can update bringing items"
  on public.bringing_items for update
  using (is_trip_member(trip_id));

-- ---------------------------------------------------------------------
-- 4. activity_suggestions — "suggest a different day" for an activity
-- ---------------------------------------------------------------------
create table if not exists public.activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities(id) on delete cascade,
  suggested_date date not null,
  suggested_by_family_id uuid references public.families(id),
  created_at timestamp with time zone default now()
);

alter table public.activity_suggestions enable row level security;

drop policy if exists "Trip members can view suggestions" on public.activity_suggestions;
create policy "Trip members can view suggestions"
  on public.activity_suggestions for select
  using (activity_id in (select id from public.activities where is_trip_member(trip_id)));

drop policy if exists "Trip members can add suggestions" on public.activity_suggestions;
create policy "Trip members can add suggestions"
  on public.activity_suggestions for insert
  with check (activity_id in (select id from public.activities where is_trip_member(trip_id)));

drop policy if exists "Trip members can remove suggestions" on public.activity_suggestions;
create policy "Trip members can remove suggestions"
  on public.activity_suggestions for delete
  using (activity_id in (select id from public.activities where is_trip_member(trip_id)));

-- ---------------------------------------------------------------------
-- 5. Missing DELETE policies (none of your tables had any DELETE policy,
--    so deletes were silently denied by RLS's default-deny)
-- ---------------------------------------------------------------------
drop policy if exists "Trip members can delete shopping items" on public.shopping_items;
create policy "Trip members can delete shopping items"
  on public.shopping_items for delete
  using (is_trip_member(trip_id));

-- Lets someone un-vote (clicking their current vote again clears it),
-- matching the prototype's toggle behaviour.
drop policy if exists "Members can delete their own vote" on public.activity_votes;
create policy "Members can delete their own vote"
  on public.activity_votes for delete
  using (member_id in (select members.id from public.members where members.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Uniqueness so a vote can be upserted (one vote per member per
--    activity) instead of accumulating duplicate rows
-- ---------------------------------------------------------------------
do $$
begin
  alter table public.activity_votes
    add constraint activity_votes_activity_member_uniq unique (activity_id, member_id);
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 7. get_trip_preview — lets someone who followed an invite link see the
--    trip's name/location BEFORE they've joined a family (and therefore
--    before is_trip_member() would return true for them). Deliberately
--    returns only non-sensitive display fields, not the full row.
-- ---------------------------------------------------------------------
create or replace function public.get_trip_preview(p_trip_id uuid)
returns table (
  id uuid,
  name text,
  location_name text,
  location_source_url text,
  start_date date,
  end_date date,
  track_expenses boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.name, t.location_name, t.location_source_url,
         t.start_date, t.end_date, t.track_expenses
  from public.trips t
  where t.id = p_trip_id;
$$;

grant execute on function public.get_trip_preview(uuid) to anon, authenticated;

commit;
