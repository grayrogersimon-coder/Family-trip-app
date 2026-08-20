# Family Trip App

A real-time, multi-family trip planner: location-first trip creation, activity
voting with day-suggestions, a schedule timeline, a hierarchical shopping
list, a "what we're bringing" list, toggleable expense tracking, invite-link
family onboarding with adult/kid roles, in-app messaging, and a per-family
dashboard — all backed by Supabase (Postgres + Row Level Security +
Realtime).

There are no user accounts. Anyone with a trip's invite link can join by
naming their family and its members; the app signs each browser in
anonymously (invisible, no login form) so your existing `auth.uid()`-based
RLS policies work without anyone entering an email or password.

## One-time Supabase setup

Do these two things once, in the Supabase dashboard, before running the app:

1. **Enable anonymous sign-ins.** Dashboard → Authentication → Sign In /
   Providers → turn on "Allow anonymous sign-ins." Without this, every
   insert/update in the app will fail RLS (no `auth.uid()` to check against).
2. **Run the migrations, in order.** Dashboard → SQL Editor → New query →
   paste in the contents of each file below → Run, one at a time, in this
   order:
   - [`supabase/migrations/0001_app_additions.sql`](./supabase/migrations/0001_app_additions.sql)
   - [`supabase/migrations/0002_delete_trip_and_remove_family.sql`](./supabase/migrations/0002_delete_trip_and_remove_family.sql)
   - [`supabase/migrations/0003_enable_realtime.sql`](./supabase/migrations/0003_enable_realtime.sql) —
     without this one, writes save correctly but nothing ever visibly
     updates: Supabase doesn't broadcast a table's changes over Realtime
     until it's explicitly added to the `supabase_realtime` publication, and
     none of the original tables had been.

   All three are additive-only (new columns, new tables, new
   policies/functions, one new constraint, or a publication membership
   change) — nothing existing is renamed or dropped, and all are safe to run
   again if needed.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project URL + anon key
npm run dev
```

`.env.local` is gitignored — your anon key never gets committed. The anon
key is meant to be public (it's what ships in the browser bundle); actual
data access is governed entirely by your RLS policies.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (outputs to `dist/`)
- `npm run preview` — preview the production build locally
- `npm run lint` — oxlint

## How identity works (no login screen)

- On first load, the browser gets a Supabase anonymous auth session
  (persisted in `localStorage`), giving it a real `auth.uid()`.
- Joining a trip (via `/join/:tripId`) creates one `families` row and one or
  more `members` rows — one per person you list (adults + kids). All of
  those `members` rows share your browser's `auth.uid()`, since typically one
  adult fills out the form for the whole family on a shared device.
- Voting, messaging, and list management are restricted to members with
  `role = 'adult'` (kids are display-only), matching the product rule that
  "only adults can vote, message, and manage lists."
- Which of your own adult members you're currently "acting as" is
  remembered per trip in `localStorage`; the Messages tab lets you switch
  between them if your browser added more than one adult.

## Routes

- `/` — your trips
- `/new` — create a trip (location → name/dates/expense toggle → creates the
  trip, then sends you to set up your own family)
- `/join/:tripId` — invite-link landing page (also reused right after
  creating a trip, to set up the creator's own family)
- `/trip/:tripId` — the trip dashboard (Activities / Schedule / Shopping /
  Bringing / Expenses / Messages tabs)

## Deleting trips / removing families

Both are handled by security-definer Postgres functions (`delete_trip`,
`remove_family` in `0002_delete_trip_and_remove_family.sql`), not client-side
deletes, so a multi-table cascade either fully succeeds or fully fails —
never half-done.

- **Delete trip** — the small trash icon next to "Family dashboard" on the
  trip dashboard, visible only to the trip's creator. Deletes everything:
  activities, votes, shopping/bringing lists, expenses, messages, every
  family and member.
- **Remove a family** — open Family dashboard, pick the family, "Remove
  [family] from this trip" at the bottom. Visible to that family's own
  creator (self-service "leave trip") or the trip's creator. Their chat
  messages and any activities/confirmations they made stay in the trip's
  history (just un-attributed); their votes, shopping assignments, and
  bringing-list items are cleared. Blocked when it's the only family left —
  delete the trip instead in that case.

## Realtime

Activities, votes, day-suggestions, shopping items, the bringing list,
expenses, families/members, and messages are all subscribed live via
Supabase Realtime (`postgres_changes`), scoped to the current trip — changes
from any family member appear for everyone without a refresh.

## Schema notes / deliberate adaptations from the design mockup

The mockup this app was built from used mock data with a few conveniences
that don't map 1:1 onto a real schema with real dates and RLS. Where they
differed, here's what changed and why:

- **"Day N" labels are derived, not stored.** `activities.activity_date` and
  `activity_suggestions.suggested_date` are real `date` columns. "Day N" is
  computed from `trips.start_date` for display and for the day-picker in the
  propose/suggest forms. If a trip has no start date yet, those forms fall
  back to a plain date picker.
- **AM/PM maps onto `activity_time`.** Picking AM sets the time to 09:00,
  PM to 15:00; the tab views derive the AM/PM label back from the stored
  time.
- **Shopping groups are a text label, not a table.** `shopping_items.group_name`
  (added by the migration) — a group exists implicitly wherever items share
  the same label, so "start a new group" just means "type a new label."
- **The invite link is the trip's UUID**, not a separate short code — it's
  already unguessable, so no extra `invite_code` column was needed. Because
  someone following that link isn't a trip member yet (and so can't pass the
  membership-based RLS policies), the migration adds a
  `get_trip_preview(trip_id)` RPC (`security definer`) that returns only the
  trip's display fields, letting the invite page show "You've been invited
  to X" before they've joined.
