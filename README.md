# BandSix — NSW HSC results, reimagined.

BandSix is a full-stack web app for exploring NSW HSC Distinguished Achievers data (2000–2025).
It features school & course rankings, individual profiles, an ATAR calculator, and a global search — all with a modern dark UI.

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database    | Supabase (PostgreSQL)                         |
| Charts      | Chart.js via react-chartjs-2                  |
| Dropdowns   | react-select                                  |
| Icons       | lucide-react                                  |
| Scraper     | Python 3.11+, Playwright, BeautifulSoup4      |
| Deployment  | Vercel (frontend) · Supabase (database)       |

---

## Features

- **School Rankings** — Sortable table of all NSW schools by Band 6 count, unique students, and state ranks. Filter by year (2000–2025) and school type.
- **Course Rankings** — All HSC courses ranked by Band 6/E4 count, state rankers, and first-in-course winners.
- **Individual School pages** — Summary stats, student list, course performance tab, and year-over-year trend chart.
- **Individual Course pages** — State rankers, first-in-course, top schools, and trend chart.
- **ATAR Calculator** — Select HSC subjects, enter marks, get an estimated ATAR range with scaled mark breakdowns.
- **Search** — Real-time search across all schools and courses.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- A **Supabase** project (free tier works fine)

---

## Step-by-Step Setup

### 1. Clone & install dependencies

```bash
git clone https://github.com/your-username/bandsix.git
cd bandsix
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → "New project"
2. Note down:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon/public key** (Settings → API → `anon public`)
   - **service_role key** (Settings → API → `service_role secret`) — keep this private!

### 3. Run the database migration

In the Supabase Dashboard → **SQL Editor**, paste and run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates all tables, views, functions, and RLS policies.

### 4. Configure environment variables

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For the Python scraper, also create `scraper/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the app with an empty database.

---

## Populating the Database

### Install Python dependencies

```bash
cd scraper
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
playwright install chromium
```

### Populate ATAR scaling data (do this first)

This seeds the `scaling_data` table with historical UAC scaling coefficients for all major HSC courses.

```bash
python populate_scaling.py
```

To populate a specific year only:
```bash
python populate_scaling.py --year 2024
```

### Run the NESA scraper

Scrape a single year (recommended for testing):
```bash
python scraper.py --year 2024
```

Scrape all years from 2000 to 2025:
```bash
python scraper.py --all-years
```

Scrape from a specific start year:
```bash
python scraper.py --all-years --start-year 2015
```

> **Note:** Scraping all 26 years takes 30–60 minutes depending on network speed.
> The scraper is polite — it waits 2 seconds between years to avoid rate-limiting.

> **Note:** NESA's website structure varies by year (especially pre-2010).
> The scraper uses flexible parsing and will log warnings for years where it finds limited data.

---

## Deployment on Vercel

### 1. Push to GitHub

```bash
git add -A
git commit -m "Initial BandSix deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → "Add New Project"
2. Import your GitHub repo
3. Add the environment variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**

> The `vercel.json` is configured to deploy to the `syd1` (Sydney) region for low latency.

### 3. Set up Supabase for production

In Supabase Dashboard → Settings → API:
- Restrict the `anon` key to only SELECT operations if desired
- Enable Row Level Security (already done by the migration)

---

## Project Structure

```
bandsix/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with Navbar + Footer
│   ├── page.tsx                  # Home page
│   ├── globals.css               # Global styles + react-select overrides
│   ├── atar-calculator/          # ATAR Calculator page
│   ├── honour-roll/
│   │   ├── schools/              # School rankings page
│   │   └── courses/              # Course rankings page
│   ├── schools/[slug]/           # Individual school page
│   ├── courses/[slug]/           # Individual course page
│   ├── search/                   # Global search page
│   └── api/                      # API routes
│       ├── schools/              # GET /api/schools
│       ├── courses/              # GET /api/courses
│       ├── honour-roll/
│       │   ├── schools/          # GET /api/honour-roll/schools
│       │   └── courses/          # GET /api/honour-roll/courses
│       ├── atar/
│       │   ├── subjects/         # GET /api/atar/subjects
│       │   └── calculate/        # POST /api/atar/calculate
│       ├── search/               # GET /api/search?q=...
│       └── stats/                # GET /api/stats (home page counters)
├── components/                   # Shared React components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── RankBadge.tsx
│   ├── AllRounderBadge.tsx
│   ├── TrendChart.tsx            # Full-size Chart.js line chart
│   ├── SparklineChart.tsx        # Inline sparkline chart
│   ├── Pagination.tsx
│   └── LoadingSkeleton.tsx
├── lib/
│   ├── types.ts                  # All TypeScript types
│   ├── supabase.ts               # Browser Supabase client
│   ├── supabase-server.ts        # Server Supabase clients
│   ├── atar.ts                   # ATAR calculation engine
│   └── utils.ts                  # Slugify, classify, format helpers
├── scraper/
│   ├── scraper.py                # Main NESA scraper (Playwright + BS4)
│   ├── populate_scaling.py       # Seed scaling data from UAC reports
│   └── requirements.txt
├── supabase/
│   └── migrations/
│       └── 001_initial.sql       # Full DB schema
├── .env.example
├── vercel.json
└── README.md
```

---

## ATAR Calculator Notes

The ATAR calculator uses a **linear scaling model** derived from UAC's publicly available "Scaling in the HSC" annual reports:

```
scaled_mark = slope × raw_mark + intercept
```

The aggregate (best 10 units, including ≥2 units of English) is converted to an ATAR via an interpolation lookup table based on historical UAC aggregate-to-ATAR distributions.

**This is an estimate only.** The actual UAC ATAR process is proprietary. Results may differ from your actual ATAR by ±1–3 points.

---

## Data Sources

- **Distinguished Achievers / All-round Achievers:** [NESA Events](https://educationstandards.nsw.edu.au/wps/portal/nesa/about/events)
- **Scaling data:** [UAC Scaling in the HSC reports](https://www.uac.edu.au/assets/pdf/ug_sup/scaling-in-the-hsc.pdf)

BandSix is an independent project, not affiliated with NESA or UAC.

---

## License

MIT — free to use and modify.
