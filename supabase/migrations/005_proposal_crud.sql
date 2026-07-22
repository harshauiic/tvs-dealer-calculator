-- Proposal CRUD policies + optional updated_at for edits

alter table public.proposals
  add column if not exists updated_at timestamptz not null default now();

-- Anyone with the reference can update (public calculator edit-by-ref)
drop policy if exists "proposals_public_update" on public.proposals;
create policy "proposals_public_update"
  on public.proposals
  for update
  using (true)
  with check (true);

-- Only admins can delete proposals
drop policy if exists "proposals_admin_delete" on public.proposals;
create policy "proposals_admin_delete"
  on public.proposals
  for delete
  using (public.is_admin());
