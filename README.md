# Lead-Scrapper — Enterprise B2B Lead Generation & Outreach CRM

A modern, high-efficiency B2B sales automation platform for lead discovery, contact scraping, multi-channel outreach (WhatsApp, Email, LinkedIn), and real-time conversion analytics. Built with **React 19**, **Vite**, **TypeScript**, **Supabase**, **Tailwind CSS v4**, and **n8n automation pipelines**.

---

## Overview & Highlights

**Lead-Scrapper** equips growth teams and sales professionals to find verified local business prospects, launch targeted outreach campaigns, manage sales pipelines, and analyze performance metrics in real time.

- **Google Places Discovery**: Extract real business leads (name, phone, rating, address, category, and website presence) by category and location.
- **Target Lead Identification**: Automatically flag high-opportunity targets (e.g., businesses lacking websites) for specialized pitch campaigns.
- **Multi-Channel Outreach**:
  - **WhatsApp**: Direct webhook-triggered WhatsApp messaging via n8n integration.
  - **Gmail / Email**: Direct email dispatch with template selection and AI personalized generation (Gemini).
  - **LinkedIn**: One-click profile deep-linking and search lookup.
- **Real-Time CRM Pipeline**: Manage prospects through an 8-stage funnel (`NEW`, `CONTACTED`, `REPLIED`, `INTERESTED`, `FOLLOW_UP`, `MEETING_BOOKED`, `CLIENT`, `LOST`) with interest scoring, custom notes, and a slide-over details panel.
- **Live Conversation Inbox**: Interactive two-way WhatsApp message threads with automated AI sentiment classification, intent detection, and quick-reply action chips.
- **Dynamic Performance Analytics**: Real-time delivery, reply, and conversion tracking with customizable time horizon filters (7 to 90 days).
- **Bloom Field Mesh Gradient**: Smooth, animated CSS layered mesh gradient background ("Almoayyed" design system) driven by a `requestAnimationFrame` clock for an editorial aesthetic.
- **One-Time Post-Auth Welcome Modal**: Automatic service selection modal upon sign-in featuring Lead Generation (in-app) and Reel Analyzer (Instagram Reels analytics web app).

---

## Design System ("Almoayyed")

The application implements a compact, opinionated design system: **quiet navy/paper base + loud coral accent**, sans/mono typography, and refined row-level controls.

| Token | Hex Value | Role & Usage |
|---|---|---|
| `--color-accent` | `#F0501E` | Primary action buttons, active states, target badges, progress fills, focus rings |
| `--color-accent-hover` | `#D8451A` | Hover/pressed states for primary actions |
| `--color-accent-subtle` | `#FDEDE7` | Accent-tinted surface backgrounds and selected row fills |
| `--color-ink` | `#14161A` | Primary text and dark surfaces |
| `--color-[#17192B]` | `#17192B` | Navigation bar, dark panel backdrops, bulk action bar |
| `--color-[#E8EAF0]` | `#E8EAF0` | Main canvas background base |

### Row & Badge Refinements
- **Lead Avatars**: 8 deterministic muted tints (`bg-[#2D3047]`, `bg-[#3B3F5C]`, `bg-[#4A3F5C]`, `bg-[#5C3D3D]`, `bg-[#3D4F5C]`, `bg-[#5C4A3D]`, `bg-[#3D5C4A]`, `bg-[#5C3D4F]`) assigned by initial letter to create visual rhythm.
- **Status Badges**: Lightweight Linear/Attio-style 6px colored dot + sub-text label on transparent backdrop.
- **Contact Actions**: 36px icon-only circular buttons with official WhatsApp (`#25D366`), Gmail (native colors), and LinkedIn (`#0A66C2`) brand glyphs, subtle 1px border, and hover lift.
- **Progress Track**: 5px rounded track with coral fill or italic *"Not started"* text for 0%.

---

## Quick Start & Installation

### Prerequisites
- **Node.js** v18+ 
- **npm** v9+
- A **Supabase** project instance
- An **n8n** automation instance (optional for backend webhooks)

### Step 1: Clone & Install Dependencies
```bash
# Clone repository
git clone https://github.com/Prateekiiitg56/Lead-Scrapper.git
cd Lead-Scrapper

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local` and fill it in. Only public values belong there — every `VITE_*` variable ships in the browser bundle.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase project (anon key only — never the service-role key) |
| `VITE_N8N_SEARCH_URL` | n8n `unbias-lead-search` webhook |
| `VITE_N8N_SEND_URL` | n8n `unbias-send-message` webhook (WhatsApp templates) |
| `VITE_N8N_EMAIL_URL` | n8n `unbias-send-email` webhook |
| `VITE_N8N_JOBS_URL`, `VITE_N8N_PEOPLE_URL` | n8n job search and people lookup webhooks (Job Signals page) |
| `VITE_N8N_USAGE_URL`, `VITE_N8N_LEAD_USAGE_URL` | n8n `unbias-api-usage` (Job Signals) and `unbias-lead-api-usage` (Lead Gen) webhooks: today's third-party API calls for the header gauge |
| `VITE_ADMIN_EMAIL`, `VITE_AUTHORIZED_ADMIN_EMAILS` | UI gating of WhatsApp actions (not a security boundary). Unset = nobody can send |

### Step 3: Database
Run in the Supabase SQL editor, in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_email_linkedin_channels.sql` — **required** for email outreach and for saving email-only leads. Without it the app still saves phone leads but shows an explicit "missing email/LinkedIn columns" error for email paths.
3. `supabase/fix_rls_policies.sql` — per-user ownership (`leads.assigned_user_id = auth.uid()`).
4. `supabase/migrations/003_harden_users_rls.sql` — removes the permissive `users`/`followups`/`templates`/`analytics` policies from 001.
5. `supabase/migrations/004_job_signals.sql` — Job Signals tables (`companies`, `job_openings`, `people`, `job_people`, `signals`), each owned per user through RLS. The rest of the app works without it; the Job Signals page shows a "missing Job Signals tables" error until it is applied.

### Step 4: Edge Functions (server-side secrets)
Inbox WhatsApp replies and AI email drafting call Meta and Gemini with secret keys, so they run as Supabase Edge Functions instead of in the browser:

```bash
supabase functions deploy whatsapp-send-text
supabase functions deploy ai-email-draft
supabase secrets set META_ACCESS_TOKEN=... META_PHONE_NUMBER_ID=... GEMINI_API_KEY=...
supabase secrets set AUTHORIZED_ADMIN_EMAILS=you@example.com   # required allowlist for WhatsApp replies (unset = nobody)
```

Both verify the caller's Supabase JWT and act through RLS. `whatsapp-send-text` reads the phone number from the caller's own lead, never from the request. Until deployed, those two buttons show a "function is not deployed" error; everything else works.

**Rotate** any Meta token or Gemini key that was previously in `VITE_META_ACCESS_TOKEN` / `VITE_GEMINI_API_KEY`: earlier builds embedded them in public JavaScript.

### Step 5: Run & Verify
```bash
npm run dev
npm run typecheck   # checks src/ and vite.config.ts
npm run lint
npm run build
```

---

## User Walkthrough

### 1. Authentication & Onboarding
- Navigate to `/login` or click **Get started** on the landing page (`/`, also `/hero`). Visiting a protected page while signed out redirects to `/login` and returns you there after sign-in.
- Log in with email/password or Google OAuth.
- Upon successful sign-in, the **Welcome Modal** automatically pops up:
  - **Lead Generation**: Navigates to `/search` to start prospecting.
  - **Reel Analyzer**: Opens the external Instagram Reels Analytics platform (`https://ig-scrapper-chi.vercel.app/`) in a new tab.

### 2. Discovering & Scraping Leads
- Click **Search** in the navigation bar.
- Choose a **Business Category** (e.g., *Restaurant*, *Dentist*, *Plumber*, *Real Estate*, or custom) and a target **Location / City**.
- Click **Discover Leads** to execute the scraping workflow.
- Results flag businesses without websites. **Save** adds a result to your CRM; results already in your CRM show *In CRM · status*.

### 3. Contact Actions & Outreach Modals
- Click any contact icon on a lead card or row:
  - **WhatsApp**: Opens the composer with the two Meta-approved templates (*Website pitch*, *Standard outreach*). Disabled when the lead has no phone.
  - **Email** (Gmail Glyph): Opens the Email composer modal supporting standard templates and **AI Personalized Email** generation via Gemini.
  - **LinkedIn** (Glyph in `#0A66C2`): Opens the lead's LinkedIn profile or deep-links a company search on LinkedIn.

### 4. Directory & Pipeline Management
- Navigate to **Leads** to view all saved prospects in Table or Grid layout.
- Filter by status (`NEW`, `CONTACTED`, `REPLIED`, `INTERESTED`, `FOLLOW_UP`, `MEETING_BOOKED`, `CLIENT`, `LOST`) or search by keyword.
- Click any row to slide out the **Lead Details Panel** to update stage status, interest score, or internal notes.

### 5. Live Inbox & AI Sentiment Analysis
- Navigate to **Inbox** for two-way WhatsApp message threads.
- View real-time message stream, unread indicators, and AI intent/sentiment tags.
- Use **Quick Response Chips** (*Send Pricing*, *Schedule Call*, *Follow Up*) for fast replies.

### 6. Analytics & Performance Tracking
- Navigate to **Analytics** or **Dashboard** for conversion funnel visuals, response rates, and regional breakdown charts.
- Adjust the **Time Horizon Slider** (7 to 90 days) to filter metrics dynamically.

---

## Repository Architecture

```
Lead-Scrapper/
├── src/
│   ├── components/
│   │   ├── analytics/                # Conversion metrics, Donut chart, Sparklines
│   │   ├── auth/                     # LoginPage with Google OAuth & email auth
│   │   ├── common/                   # Reusable components
│   │   │   ├── AlmoayyedGradient.tsx # Bloom Field animated CSS mesh gradient
│   │   │   ├── ErrorBoundary.tsx     # Application runtime error fallback
│   │   │   ├── OfflinePage.tsx       # Offline status banner overlay
│   │   │   ├── OutreachModal.tsx     # Portal-mounted outreach modal (WhatsApp, Email, LinkedIn)
│   │   │   ├── OutreachPermissionModal.tsx # Outreach permissions overlay
│   │   │   ├── ServerUnreachablePage.tsx # Server connection failure screen
│   │   │   └── WelcomeServicesModal.tsx  # Post-sign-in one-time service picker
│   │   ├── dashboard/                # Main metrics overview & recent activity
│   │   ├── inbox/                    # Real-time chat threads & AI analysis cards
│   │   ├── landing/                  # Landing page & TerminusHero section
│   │   ├── layout/                   # AppLayout with sticky navbar, notifications, & footer
│   │   ├── leads/                    # Leads directory page, table/grid views, status badges
│   │   ├── legal/                    # TermsPage & PrivacyPage compliance views
│   │   └── search/                   # Lead discovery, search cards, & outreach triggers
│   ├── context/
│   │   ├── ApiErrorContext.tsx       # Server-unreachable overlay driven by React Query errors
│   │   ├── AuthContext.tsx           # Single Supabase auth session provider
│   │   └── authState.ts              # Auth context object + types
│   ├── hooks/
│   │   ├── useAuth.ts                # Supabase authentication state hook
│   │   ├── useConversations.ts       # Inbox chat threads & unread count hooks
│   │   ├── useCountUp.ts             # Animated count-up numbers hook
│   │   ├── useLeads.ts               # Cached lead query + optimistic update/delete mutations
│   │   ├── useDialog.ts              # Modal focus trap, Escape, scroll lock, focus restore
│   │   └── useRealtimeSync.ts        # One Supabase realtime channel → React Query invalidation
│   ├── lib/
│   │   ├── constants.ts              # Lead statuses, colors, categories, templates
│   │   ├── supabase.ts               # Supabase JS client instantiation
│   │   └── utils.ts                  # Date formatting (timeAgo) and helpers
│   ├── services/
│   │   ├── conversationService.ts    # Supabase inbox queries & realtime handlers
│   │   ├── leadService.ts            # Lead CRUD operations & stats calculations
│   │   ├── permissionService.ts      # Outreach authorization guards
│   │   └── searchService.ts          # n8n webhook API connectors & Gemini AI email generator
│   ├── types/
│   │   ├── api.ts                    # Search lead payload types
│   │   └── database.ts               # Supabase Database schema definitions
│   ├── App.tsx                       # React Router configuration & AuthGuard
│   ├── index.css                     # Design tokens, custom utilities, Tailwind directives
│   └── main.tsx                      # React 19 application root mount
│
├── public/                           # Static assets and service card images
│   ├── lead-gen-card.png
│   └── reel-analyzer-card.png
├── supabase/                         # Database SQL migrations & RLS policies
│   ├── migrations/
│   └── fix_rls_policies.sql
├── Unbias.xai - Lead Gen + WhatsApp Outreach.json # n8n automation workflow export
├── package.json                      # Dependency manifest
├── vite.config.ts                    # Vite configuration
└── README.md                         # Documentation
```

---

## Integration Contracts (n8n Webhooks)

Verified against the exported workflows in this repo.

### Lead search — `POST VITE_N8N_SEARCH_URL`
```json
{ "business_type": "Restaurant", "business_type_other": "", "location": "Guwahati, Assam" }
```
Response (`Respond With Leads`): `{ "success": true, "count": 2, "leads": [ { "name", "phone", "address", "rating", "has_website": "true"|"false", "website", "email", "linkedin_url" } ], "cached_at": null }`.
The workflow drops places without a phone. The client hides businesses the signed-in user already contacted (matched by phone/email against their own Supabase leads), validates the response, removes duplicates (place id / phone), skips rows without a name, and times out after 120 s.

`Plan Places Search` caches and rate-limits Google Places (settings at the top of the node):
- **Cache**: the same business type + location within `cache_minutes` (default 24 hours, max `cache_entries` = 50) reuses the stored Places results instead of calling Google. The per-user "already contacted" filter runs in the client, so cached results stay current. `cached_at` says when the results were fetched; the Search page shows it.
- **Rate limits**: at most `max_searches_per_minute` (default 5) fresh searches per minute across all users, and `daily_call_limit` (default 1000) Google Places calls per UTC day. A fresh search costs 1 Text Search + 1 Place Details call per result (up to 20). Over a limit, the workflow answers HTTP 429 `{ "success": false, "message": "..." }`; cached searches still work.
- `GET unbias-lead-api-usage` (`API Usage Webhook`) reports today's Google Places calls for the header gauge. Keep `DAILY_LIMIT` in `Report API Usage` equal to `daily_call_limit`.

The cache and counters live in the workflow's static data, which n8n saves only for production (active) runs.

### WhatsApp template — `POST VITE_N8N_SEND_URL`
```json
{ "name": "Bay Area Dental", "phone": "+14155552671", "address": "...", "website": "", "template_name": "website_automation_pitch_v2" | "first_outreach", "user_id": "<auth uid>" }
```
Response: `{ "success": true|false, "message": "..." }`. Only `success: true` counts as sent. The client then saves the lead to the caller's CRM (status `CONTACTED`, never downgrading a later stage) and logs the conversation.

### Email — `POST VITE_N8N_EMAIL_URL`
```json
{ "to_email": "...", "from_email": "...", "business_name": "...", "address": "...", "website": "", "template_id": "website_pitch_email", "subject": "", "custom_body": "", "business_type": "", "user_id": "<auth uid>" }
```
Response: `{ "success": true, "message": "sent" }`, or HTTP 400 `{ "success": false, "message": "Email address is required" }`.

### Job search — `POST VITE_N8N_JOBS_URL`
```json
{ "query": "automation jobs in USA", "keywords": "automation", "location": "USA", "remote": true, "user_id": "<auth uid>", "user_email": "<login email>" }
```
Response: `{ "success": true, "jobs": [ { "id", "title", "company": { "name", "location" }, "location", "description", "url", "posted_at", "source" } ], "dropped": { "agency": 2, "scam": 1, ... }, "warnings": [] }` (a bare array also works; `company` may also be a plain name). `posted_at` accepts ISO dates or text like `"3 days ago"`. The client scores each opening HIGH / MEDIUM / LOW by keyword matches (`src/lib/signalScoring.ts`; title hits count double) and stores companies, openings and signals in Supabase.

### People lookup — `POST VITE_N8N_PEOPLE_URL`
```json
{ "company": "Acme GmbH", "website": "", "linkedin_url": "", "location": "Berlin, Germany", "roles": ["Founder/CEO", "COO"] }
```
Response: `{ "success": true, "people": [ { "name", "title", "role", "linkedin_url", "email", "source", "source_url" } ], "company": { "website", "email", "emails" }, "warnings": [] }`. Called only when the user presses Search in the Find People dialog. People are stored only when the user presses Save or Mark as contacted; a company website/email found is saved on the company (blank fields only). Contacted people move to the Contacted page (`/job-signals/contacted`); later lookups at the same company still list them, flagged "Already contacted".

### Job Signals workflow setup
`Unbias.xai - Job Signals.json` implements both webhooks.

**Jobs** are remote-first. The **Remote only** switch next to the search bar is on by default, and the app sends it as `remote`. The `Plan Job Sources` node picks sources from the typed location (country, big city, or region such as "Europe", "Asia", "Africa", "Middle East", "worldwide"):

| Source | Coverage | Cost |
|---|---|---|
| [Jobicy](https://jobicy.com/jobs-rss-feed) | Remote jobs worldwide (remote mode only) | Free, no key; cached 1 hour per query |
| [Remotive](https://github.com/remotive-com/remote-jobs-api) | Remote jobs worldwide (remote mode only) | Free, no key; cached 6 hours per query (they allow ~4 fetches/day) |
| [Adzuna](https://developer.adzuna.com) | US, CA, MX, BR, UK, DE, FR, NL, BE, AT, CH, ES, IT, PL, AU, NZ, IN, SG, ZA | Free key, 25 calls/min, 250/day |
| [hh.ru](https://api.hh.ru) | Russia, Kazakhstan, Belarus, Uzbekistan | Free, no key |
| [Jooble](https://jooble.org/api/about) | 60+ other countries (rest of Asia, Middle East, Africa, Europe) | Free key on request, small total quota |
| Google Jobs via [SerpApi](https://serpapi.com) | Worldwide | Optional, paid beyond free tier (off by default) |

In remote mode, Adzuna and Jooble search for "<keywords> remote", hh.ru uses its `schedule=remote` filter, and any posting that does not mention remote work is dropped. Remote-board jobs are kept only when they are open to candidates in the searched country or region (for "USA": USA, North America, Americas or Worldwide). With no location, every remote job counts. Remote-board results are cached in the workflow's static data, which n8n keeps only for production (active) runs; manual test runs always refetch.

Whole search results are cached too: the same keywords, location and **Remote only** setting within `search_cache_minutes` (default 6 hours) are answered from the cache without calling any source, and the app says so above the results. Only results where every source answered are cached, so a failed or rate-limited source is retried on the next search. `search_cache_entries` (default 20) caps the cache; the oldest entry goes first. Both settings are in `Plan Job Sources`.

`Rank Jobs` then keeps only legit, relevant postings: drops staffing/recruitment agencies, common scam patterns (upfront fees, Telegram/WhatsApp-only hiring, pay promises), postings that do not mention the search terms, postings older than 30 days, and duplicates across sources. Newest first, max 60. Adzuna and Jooble return description snippets, so signal scores lean on job titles.

**People** — merged from, in order of use:
1. **Company website** (all countries, free): the site from the job source, else domains guessed from the name and country (`.de`, `.com.au`, `.co.jp`, …) and verified by the homepage mentioning the company. Reads team, about, leadership, contact and legal/imprint pages: schema.org `Person` data, team cards, "Name, Title" lines and imprint lines such as `Geschäftsführer: Max Müller`. Emails from `mailto:`, plain text, `[at]`/`[dot]` obfuscation and Cloudflare-protected addresses, kept only on the company's own domain; a personal address is matched to a person by name, a general one (info@, hello@, …) becomes the company email.
2. **Companies House** (UK only, free key): current directors of an exact company-name match.
3. **LinkedIn via Google** (SerpApi, optional): `USE_LINKEDIN_SEARCH` in `Build People Query`, off by default.

Setup:
1. In n8n: **Workflows → Import from File** → `Unbias.xai - Job Signals.json`.
2. Edit **Plan Job Sources** settings: `jooble_api_key` (optional), `use_serpapi`, `default_countries`. hh.ru requires a contact email on each request; the workflow uses the signed-in user's login email, which the app sends as `user_email`.
3. Credentials:
   - **Adzuna** — type **Custom Auth**, on `Adzuna Job Search`. Paste plain JSON into the **JSON** box, with no `{{ }}` expression (an expression here makes n8n report "invalid custom JSON"):
     `{ "qs": { "app_id": "<id>", "app_key": "<key>" } }`
   - **Companies House** (optional, UK) — type **Basic Auth**, user = API key from developer.company-information.service.gov.uk, empty password, on both `Companies House` nodes.
   - **SerpApi** (optional) — type **Query Auth**, name `api_key`, on `Google Jobs Search` and `SerpApi LinkedIn Profiles`.
4. Activate and copy the production URLs of `Job Search Webhook`, `People Webhook` and `API Usage Webhook` into `VITE_N8N_JOBS_URL`, `VITE_N8N_PEOPLE_URL` and `VITE_N8N_USAGE_URL`.

**API usage** — the workflow counts its calls to each third-party source per UTC day in static data (production runs only) and `GET unbias-api-usage` returns `{ "success": true, "day", "reset_at", "sources": [ { "name", "calls", "daily_limit", "note" } ] }`. The gauge icon in the app header shows these counts and turns amber at 80% of a daily limit, red at 100%. Set each plan's daily limit in `SOURCES` in the `Report API Usage` node (`null` = no daily cap).

A source with no credential or no coverage is skipped; its reason appears in `warnings`, which the app shows under the results.

> The n8n WhatsApp workflow also upserts leads with the service-role key but does not set `assigned_user_id`. Those rows are invisible to users under RLS; the app therefore records its own CRM row per user. `user_id` is now sent so the workflow can set ownership if you update it.

---

## Deployment (Vercel)

The application is pre-configured for one-click Vercel deployments:

1. Import the repository into Vercel.
2. Add your production Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.) under Project Settings.
3. Build Command: `npm run build`
4. Output Directory: `dist`

---

## License & Ownership

Proprietary and confidential. Built for Lead-Scrapper B2B sales automation operations.
