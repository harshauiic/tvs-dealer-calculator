-- Import pincodes from CSV (run after 001_schema.sql)
-- Use Supabase Dashboard: Table Editor -> pincodes -> Import CSV
-- File: seed/pincodes.csv (26,032 rows)
--
-- Or via psql:
-- \copy public.pincodes (pincode, eq_zone) FROM 'seed/pincodes.csv' CSV HEADER;

-- Verify import:
-- select count(*) from public.pincodes;  -- expect 26032
