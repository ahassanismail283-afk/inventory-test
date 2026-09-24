-- Enable Row-Level Security on the four app tables and add policies that match what the app does.
--
-- Access model (unchanged from the app's current behavior, only now enforced by the database):
--   * Signed-out visitors (anon key only): no access to any table.
--   * ADMIN: full access to everything.
--   * Any other role: read/write items and transactions only in the locations listed in their
--     users."locationIds"; read those locations; read and edit their own profile row, except
--     role, locationIds, email and id, which only an admin can change.
--
-- Helper functions live in the `private` schema, which the Data API does not expose, so they
-- cannot be called over /rest/v1/rpc.

-- Helpers ----------------------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- SECURITY DEFINER so they can read public.users without being blocked by its own policies.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users where id = (select auth.uid()) and role = 'ADMIN'
  );
$$;

create or replace function private.my_location_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select "locationIds" from public.users where id = (select auth.uid())), '{}'::uuid[]);
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.my_location_ids() from public, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.my_location_ids() to authenticated;

-- Existing sign-up trigger function: pin its search path and stop it being callable over the API.
-- The trigger on auth.users keeps working; triggers do not need EXECUTE from the calling role.
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Turn RLS on ------------------------------------------------------------------------------------

alter table public.locations    enable row level security;
alter table public.users        enable row level security;
alter table public.items        enable row level security;
alter table public.transactions enable row level security;

-- users ------------------------------------------------------------------------------------------

create policy users_select on public.users
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());

create policy users_insert on public.users
  for insert to authenticated
  with check (private.is_admin());

create policy users_update on public.users
  for update to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());

create policy users_delete on public.users
  for delete to authenticated
  using (private.is_admin());

-- A non-admin editing their own row may change only nickname and avatar.
create or replace function private.guard_user_self_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() and (
       new.role is distinct from old.role
    or new."locationIds" is distinct from old."locationIds"
    or new.email is distinct from old.email
    or new.id is distinct from old.id
  ) then
    raise exception 'غير مسموح بتغيير الدور أو الوحدات أو البريد إلا لمدير النظام';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_user_self_update() from public, anon, authenticated;

drop trigger if exists guard_user_self_update on public.users;
create trigger guard_user_self_update
  before update on public.users
  for each row execute function private.guard_user_self_update();

-- locations --------------------------------------------------------------------------------------

create policy locations_select on public.locations
  for select to authenticated
  using (private.is_admin() or id = any (private.my_location_ids()));

create policy locations_insert on public.locations
  for insert to authenticated
  with check (private.is_admin());

create policy locations_update on public.locations
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy locations_delete on public.locations
  for delete to authenticated
  using (private.is_admin());

-- items ------------------------------------------------------------------------------------------

create policy items_by_location on public.items
  for all to authenticated
  using (private.is_admin() or "locationId" = any (private.my_location_ids()))
  with check (private.is_admin() or "locationId" = any (private.my_location_ids()));

-- transactions -----------------------------------------------------------------------------------

create policy transactions_by_location on public.transactions
  for all to authenticated
  using (private.is_admin() or "locationId" = any (private.my_location_ids()))
  with check (private.is_admin() or "locationId" = any (private.my_location_ids()));
