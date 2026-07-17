-- Optional cleanup if earlier draft of 003 added per-field fire limits.
-- Safe to run even if those columns were never created.
alter table public.global_settings
  drop column if exists limit_fire_building_si,
  drop column if exists limit_fire_plant_machinery_si,
  drop column if exists limit_fire_furniture_si,
  drop column if exists limit_fire_plate_glass_si,
  drop column if exists limit_fire_neon_sign_si,
  drop column if exists limit_fire_stocks_si;
