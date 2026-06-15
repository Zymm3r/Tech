 # Technician Pricing Dashboard

Single-page Next.js 15 dashboard for technician pricing, risk multipliers, and quotation export.

## Stack

- Next.js 15 App Router
- TypeScript
- TailwindCSS
- shadcn/ui-style component primitives
- Zustand
- React Hook Form
- SheetJS (`xlsx`)
- jsPDF + `jspdf-autotable`
- Optional Supabase persistence

## Features

- Spreadsheet-backed technician and multiplier catalogs from `/public/data/*.xlsx`
- Live pricing with stacked multipliers
- Project Name, Customer Name, and Notes fields
- JSON import/export with version and timestamp
- Result PDF export
- Template XLSX downloads
- Undo and reset configuration
- Dark mode
- Optional cloud sync via Supabase

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_NAME`

Supabase is optional. If the variables are missing, the app uses browser local storage only.

## Spreadsheet Format

### `/public/data/technicians.xlsx`

Sheet: `Technicians`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable row identifier |
| `name` | string | Technician display name |
| `group` | string | Technician group label |
| `base_price` | number | Base service price in THB |
| `active` | boolean | `true` or `false` |

### `/public/data/multipliers.xlsx`

Sheet: `Multipliers`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable row identifier |
| `category` | string | Multiplier category |
| `name` | string | Display label |
| `multiplier` | number | Example: `1.3` |
| `active` | boolean | `true` or `false` |

Spreadsheet values are loaded dynamically in the browser when present.

## Exported JSON

Exported configuration includes:

- `version`
- `exportedAt`
- `projectConfig`
- `catalog`

## Supabase Table

Optional cloud persistence uses a single table named:

`technician_pricing_dashboard_configs`

Expected columns:

- `id` text primary key
- `project_config` jsonb
- `catalog` jsonb
- `updated_at` timestamptz

## Build

```bash
npm run lint
npm run build
```

## Deployment

This app is Vercel-ready. Deploy from the repo root after setting any optional Supabase environment variables.
