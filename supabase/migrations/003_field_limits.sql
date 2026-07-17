-- Add configurable maximum limits for Money, Public Liability, and Fidelity.
-- Fire total limit uses existing max_location_si.
alter table public.global_settings
  add column if not exists limit_money_annual_carrying bigint not null default 500000000,
  add column if not exists limit_money_single_carrying bigint not null default 500000000,
  add column if not exists limit_money_cash_in_safe bigint not null default 500000000,
  add column if not exists limit_money_cash_in_till bigint not null default 500000000,
  add column if not exists limit_public_liability_si bigint not null default 500000000,
  add column if not exists limit_fidelity_employees bigint not null default 100000,
  add column if not exists limit_fidelity_floater_si bigint not null default 500000000,
  add column if not exists limit_fidelity_per_employee bigint not null default 500000000;
