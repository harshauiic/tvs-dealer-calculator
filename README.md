# TVS Motor Dealer Insurance Calculator

Web application converted from the TVSM Excel/VBA multi-location insurance premium calculator.

## Features

- Unlimited risk locations
- Per-location Money in Transit section (4 fields each)
- Live premium calculation matching Excel formulas
- Admin panel for rate and discount management (Supabase Auth)
- Save proposals with shareable reference ID (no dealer login)
- PDF export

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, RLS)
- GitHub Pages deployment
- @react-pdf/renderer for PDF export

## Local Development

```bash
npm install
npm run dev
```

The app works offline with bundled seed data when Supabase env vars are not set. Proposals and admin writes fall back to localStorage in dev mode.

### Run tests

```bash
npm test
```

Tests verify calculator output against the Aditi Automobiles Excel sample (~₹52,995 net premium).

### Re-extract Excel data

```bash
npm run extract
```

Reads the `.xlsm` file and updates `seed/` and test fixtures.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_seed_rates.sql`
3. Import pincodes:
   ```bash
   # In Supabase SQL editor or via psql COPY
   # Use seed/pincodes.csv (~26k rows)
   ```
4. Create an admin user in Supabase Auth dashboard
5. Link admin to profiles table:
   ```sql
   insert into public.admin_profiles (user_id, email)
   values ('<auth-user-uuid>', 'admin@example.com');
   ```
6. Copy project URL and anon key to `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## GitHub Pages Deployment

1. Create repo `tvs-dealer-calculator` on GitHub
2. Push this project to `main`
3. Enable GitHub Pages: Settings → Pages → Source: GitHub Actions
4. Add repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Push to `main` — workflow builds and deploys automatically

Site URL: `https://<username>.github.io/tvs-dealer-calculator/`

## Project Structure

```
src/lib/calculator/   Pure TS calculation engine + tests
src/lib/supabase/     Supabase client and queries
src/lib/pdf/          PDF proposal template
src/components/     Calculator UI components
src/pages/            Calculator, Admin, Load Proposal
seed/                 Data extracted from Excel
supabase/migrations/  Database schema and seed SQL
scripts/              Excel extraction script
```

## Calculator Sections

| Section | Scope |
|---------|-------|
| Fire | Per location |
| Money in Transit | Per location (enhanced from Excel) |
| Burglary, MBD/EEI, Plate glass, Neon, PL, Fidelity | Aggregated across all locations |
| Stock Floater | Global toggle |

## License

Private — TVS Motor dealer insurance use.
