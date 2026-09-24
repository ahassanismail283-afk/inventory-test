-- Custody reconciliation dates ("مطابقة العهدة"), one row per check of a location's custody.
-- Needs 20260925_enable_rls.sql applied first (uses private.is_admin / private.my_location_ids).
-- NOT APPLIED YET: waits for an explicit go-ahead to change the live database.

create table public.reconciliations (
  id uuid primary key default extensions.uuid_generate_v4(),
  "locationId" uuid not null references public.locations(id) on delete cascade,
  date date not null,
  note text,
  "createdBy" uuid references auth.users(id) on delete set null,
  createdat timestamptz not null default now(),
  unique ("locationId", date)
);

create index reconciliations_location_date on public.reconciliations ("locationId", date desc);

alter table public.reconciliations enable row level security;

-- Anyone assigned to the location can read and record reconciliations; only admins delete them.
create policy reconciliations_select on public.reconciliations
  for select to authenticated
  using (private.is_admin() or "locationId" = any (private.my_location_ids()));

create policy reconciliations_insert on public.reconciliations
  for insert to authenticated
  with check (private.is_admin() or "locationId" = any (private.my_location_ids()));

create policy reconciliations_delete on public.reconciliations
  for delete to authenticated
  using (private.is_admin());

-- Explicit grants: from 30 October 2026 new public tables are not exposed to the Data API
-- without them. Signed-out visitors get nothing.
grant select, insert, delete on public.reconciliations to authenticated;
grant all on public.reconciliations to service_role;
