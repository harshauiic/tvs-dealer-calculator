-- Proposal CRUD policies + optional updated_at for edits
-- Run this in the Supabase SQL editor if update/delete is failing.

alter table public.proposals
  add column if not exists updated_at timestamptz not null default now();

-- Ensure anon/authenticated can update rows (public calculator edit-by-ref)
drop policy if exists "proposals_public_update" on public.proposals;
create policy "proposals_public_update"
  on public.proposals
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Only admins can delete proposals
drop policy if exists "proposals_admin_delete" on public.proposals;
create policy "proposals_admin_delete"
  on public.proposals
  for delete
  to authenticated
  using (public.is_admin());

-- Keep insert/read available to public roles explicitly
drop policy if exists "proposals_public_insert" on public.proposals;
create policy "proposals_public_insert"
  on public.proposals
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "proposals_public_read" on public.proposals;
create policy "proposals_public_read"
  on public.proposals
  for select
  to anon, authenticated
  using (true);
