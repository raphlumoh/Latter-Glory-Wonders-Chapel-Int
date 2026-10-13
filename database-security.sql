
-- LGWCI CHURCH WEBSITE
-- Database security policies for Supabase
-- Run AFTER database-setup.sql

begin;

-- 1. Create a secure function for checking administrator status.

create or replace function public.is_church_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select exists (
        select 1
        from public.church_user_roles as r
        where r.user_id = (select auth.uid())
          and r.role = 'admin'
    );
$function$;

revoke all on function public.is_church_admin() from public, anon;
grant execute on function public.is_church_admin() to authenticated;

-- 2. Enable Row Level Security on all six tables.

alter table public.church_user_roles enable row level security;
alter table public.church_members enable row level security;
alter table public.church_events enable row level security;
alter table public.church_announcements enable row level security;
alter table public.membership_requests enable row level security;
alter table public.church_messages enable row level security;

-- 3. Remove these policies if they already exist.
-- This allows this security script to be run again safely.

drop policy if exists "roles_select_own_role"
on public.church_user_roles;

drop policy if exists "events_public_read"
on public.church_events;
drop policy if exists "events_admin_insert"
on public.church_events;
drop policy if exists "events_admin_update"
on public.church_events;
drop policy if exists "events_admin_delete"
on public.church_events;

drop policy if exists "announcements_public_read"
on public.church_announcements;
drop policy if exists "announcements_admin_insert"
on public.church_announcements;
drop policy if exists "announcements_admin_update"
on public.church_announcements;
drop policy if exists "announcements_admin_delete"
on public.church_announcements;

drop policy if exists "members_admin_select"
on public.church_members;
drop policy if exists "members_admin_insert"
on public.church_members;
drop policy if exists "members_admin_update"
on public.church_members;
drop policy if exists "members_admin_delete"
on public.church_members;

drop policy if exists "requests_public_insert"
on public.membership_requests;
drop policy if exists "requests_admin_select"
on public.membership_requests;
drop policy if exists "requests_admin_update"
on public.membership_requests;
drop policy if exists "requests_admin_delete"
on public.membership_requests;

drop policy if exists "messages_public_insert"
on public.church_messages;
drop policy if exists "messages_admin_select"
on public.church_messages;
drop policy if exists "messages_admin_update"
on public.church_messages;
drop policy if exists "messages_admin_delete"
on public.church_messages;

-- 4. User roles: users may read only their own role.
-- No public role assignment is permitted.

create policy "roles_select_own_role"
on public.church_user_roles
for select
to authenticated
using (user_id = (select auth.uid()));

-- 5. Events: everyone can read; administrators can manage.

create policy "events_public_read"
on public.church_events
for select
to anon, authenticated
using (true);

create policy "events_admin_insert"
on public.church_events
for insert
to authenticated
with check ((select public.is_church_admin()));

create policy "events_admin_update"
on public.church_events
for update
to authenticated
using ((select public.is_church_admin()))
with check ((select public.is_church_admin()));

create policy "events_admin_delete"
on public.church_events
for delete
to authenticated
using ((select public.is_church_admin()));

-- 6. Announcements: everyone can read; administrators can manage.

create policy "announcements_public_read"
on public.church_announcements
for select
to anon, authenticated
using (true);

create policy "announcements_admin_insert"
on public.church_announcements
for insert
to authenticated
with check ((select public.is_church_admin()));

create policy "announcements_admin_update"
on public.church_announcements
for update
to authenticated
using ((select public.is_church_admin()))
with check ((select public.is_church_admin()));

create policy "announcements_admin_delete"
on public.church_announcements
for delete
to authenticated
using ((select public.is_church_admin()));

-- 7. Church members: full member records are administrator-only.

create policy "members_admin_select"
on public.church_members
for select
to authenticated
using ((select public.is_church_admin()));

create policy "members_admin_insert"
on public.church_members
for insert
to authenticated
with check ((select public.is_church_admin()));

create policy "members_admin_update"
on public.church_members
for update
to authenticated
using ((select public.is_church_admin()))
with check ((select public.is_church_admin()));

create policy "members_admin_delete"
on public.church_members
for delete
to authenticated
using ((select public.is_church_admin()));

-- 8. Create a restricted member directory.
-- Email addresses and phone numbers are deliberately excluded.
-- The view owner can read the underlying table, but the view exposes
-- only these four approved directory fields.

create or replace view public.church_member_directory
with (security_barrier = true)
as
select id, full_name, location, ministry
from public.church_members;

-- 9. Membership requests: visitors may submit, but cannot read requests.

create policy "requests_public_insert"
on public.membership_requests
for insert
to anon, authenticated
with check (true);

create policy "requests_admin_select"
on public.membership_requests
for select
to authenticated
using ((select public.is_church_admin()));

create policy "requests_admin_update"
on public.membership_requests
for update
to authenticated
using ((select public.is_church_admin()))
with check ((select public.is_church_admin()));

create policy "requests_admin_delete"
on public.membership_requests
for delete
to authenticated
using ((select public.is_church_admin()));

-- 10. Contact messages: visitors may send messages.
-- Only administrators may read or manage submitted messages.

create policy "messages_public_insert"
on public.church_messages
for insert
to anon, authenticated
with check (true);

create policy "messages_admin_select"
on public.church_messages
for select
to authenticated
using ((select public.is_church_admin()));

create policy "messages_admin_update"
on public.church_messages
for update
to authenticated
using ((select public.is_church_admin()))
with check ((select public.is_church_admin()));

create policy "messages_admin_delete"
on public.church_messages
for delete
to authenticated
using ((select public.is_church_admin()));

-- 11. Remove existing API privileges on these tables before
-- granting only the access needed by this website.

revoke all privileges on table
    public.church_user_roles,
    public.church_members,
    public.church_events,
    public.church_announcements,
    public.membership_requests,
    public.church_messages
from anon, authenticated;

revoke all privileges on table public.church_member_directory
from anon, authenticated;

-- Public website: read events and announcements.
grant select on public.church_events,
                public.church_announcements
to anon, authenticated;

-- Signed-in administrators can attempt these actions;
-- RLS policies decide whether they are authorized.
grant insert, update, delete on public.church_events,
                               public.church_announcements
to authenticated;

-- Signed-in users can check their own role.
grant select on public.church_user_roles to authenticated;

-- Full member records are protected by administrator-only RLS.
grant select, insert, update, delete
on public.church_members to authenticated;

-- Signed-in users can access only the restricted directory view.
grant select on public.church_member_directory to authenticated;

-- Public forms can submit but cannot read submitted records.
grant insert on public.membership_requests,
                public.church_messages
to anon, authenticated;

-- Administrators can review and manage submissions.
grant select, update, delete on public.membership_requests,
                               public.church_messages
to authenticated;

-- Allow generated IDs to work for the tables that accept inserts.
grant usage, select on sequence
    public.church_members_id_seq,
    public.church_events_id_seq,
    public.church_announcements_id_seq,
    public.membership_requests_id_seq,
    public.church_messages_id_seq
to anon, authenticated;

commit;
