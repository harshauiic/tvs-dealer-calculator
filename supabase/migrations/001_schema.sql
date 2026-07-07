-- TVS Motor Dealer Insurance Calculator schema

create extension if not exists "pgcrypto";

-- Rate master (Sheet1 equivalent)
create table if not exists public.rate_master (
  id uuid primary key default gen_random_uuid(),
  occupancy text not null,
  eq_zone integer not null check (eq_zone between 1 and 4),
  iib_rate numeric(10,6) not null,
  eq_rate numeric(10,6) not null,
  stfi_rate numeric(10,6) not null,
  terrorism_rate numeric(10,6) not null,
  discount_under_5cr numeric(6,2) not null default 70,
  discount_iib_over_5cr numeric(6,2) not null default 100,
  discount_eq_over_5cr numeric(6,2) not null default 0,
  discount_stfi_over_5cr numeric(6,2) not null default 0,
  rate_under_5cr_without_terror numeric(10,6) not null,
  rate_over_5cr_without_terror numeric(10,6) not null,
  rate_under_5cr_with_terror numeric(10,6) not null,
  rate_over_5cr_with_terror numeric(10,6) not null,
  unique (occupancy, eq_zone)
);

-- Pincode lookup (~26k rows)
create table if not exists public.pincodes (
  pincode text primary key,
  eq_zone integer not null check (eq_zone between 1 and 4)
);

create index if not exists idx_pincodes_eq_zone on public.pincodes (eq_zone);

-- Global admin settings
create table if not exists public.global_settings (
  id integer primary key default 1 check (id = 1),
  sookshama_discount_pct numeric(6,2) not null default 70,
  iib_discount_pct numeric(6,2) not null default 100,
  burglary_rate_pct numeric(10,6) not null default 0.005,
  mbd_rate_per_thousand numeric(10,6) not null default 0.25,
  plate_glass_rate_pct numeric(10,6) not null default 0.03,
  neon_sign_rate_pct numeric(10,6) not null default 0.03,
  public_liability_rate_pct numeric(10,6) not null default 0.03,
  fidelity_rate_pct numeric(10,6) not null default 0.1,
  money_without_terror_rate_pct numeric(10,6) not null default 0.01,
  money_with_terror_rate_pct numeric(10,6) not null default 0.031,
  gst_rate_pct numeric(6,2) not null default 18,
  si_threshold bigint not null default 50000000,
  floater_si_cap bigint not null default 500000000,
  max_location_si bigint not null default 500000000,
  updated_at timestamptz not null default now()
);

-- Saved proposals
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  insured_name text not null,
  payload jsonb not null,
  rates_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_proposals_created_at on public.proposals (created_at desc);
create index if not exists idx_proposals_reference on public.proposals (reference_number);

-- Admin profiles linked to Supabase Auth
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.rate_master enable row level security;
alter table public.pincodes enable row level security;
alter table public.global_settings enable row level security;
alter table public.proposals enable row level security;
alter table public.admin_profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles where user_id = auth.uid()
  );
$$;

-- Public read for calculator data
create policy "rate_master_public_read" on public.rate_master for select using (true);
create policy "pincodes_public_read" on public.pincodes for select using (true);
create policy "global_settings_public_read" on public.global_settings for select using (true);

-- Admin write for rates and settings
create policy "rate_master_admin_write" on public.rate_master for all using (public.is_admin()) with check (public.is_admin());
create policy "global_settings_admin_write" on public.global_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "pincodes_admin_write" on public.pincodes for all using (public.is_admin()) with check (public.is_admin());

-- Proposals: anyone can insert and read by reference (public calculator)
create policy "proposals_public_insert" on public.proposals for insert with check (true);
create policy "proposals_public_read" on public.proposals for select using (true);

-- Admin profiles
create policy "admin_profiles_self_read" on public.admin_profiles for select using (auth.uid() = user_id);

-- Seed global settings
insert into public.global_settings (id) values (1) on conflict (id) do nothing;
