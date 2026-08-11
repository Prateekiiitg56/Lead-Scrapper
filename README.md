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
Create a `.env.local` file in the root folder:

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_N8N_SEARCH_URL=https://your-n8n-instance.com/webhook/search
VITE_N8N_SEND_URL=https://your-n8n-instance.com/webhook/send
VITE_N8N_STATS_URL=https://your-n8n-instance.com/webhook/stats
VITE_N8N_EMAIL_URL=https://your-n8n-instance.com/webhook/send-email
```

### Step 3: Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Step 4: Verify Type Safety & Build
```bash
# Run TypeScript check
npm run typecheck

# Build production bundle
npm run build
```

---

## User Walkthrough

### 1. Authentication & Onboarding
- Navigate to `/login` or click **Get Started** from the landing page (`/hero`).
- Log in with email/password or Google OAuth.
- Upon successful sign-in, the **Welcome Modal** automatically pops up:
  - **Lead Generation**: Navigates to `/search` to start prospecting.
  - **Reel Analyzer**: Opens the external Instagram Reels Analytics platform (`https://ig-scrapper-chi.vercel.app/`) in a new tab.

### 2. Discovering & Scraping Leads
- Click **Search** in the navigation bar.
- Choose a **Business Category** (e.g., *Restaurant*, *Dentist*, *Plumber*, *Real Estate*, or custom) and a target **Location / City**.
- Click **Discover Leads** to execute the scraping workflow.
- Results highlight **Target Leads** (businesses without websites) for website pitch outreach.

### 3. Contact Actions & Outreach Modals
- Click any contact icon on a lead card or row:
  - **WhatsApp** (Glyph in `#25D366`): Opens the WhatsApp composer modal with template choices (*Website Pitch*, *Custom Message*).
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
│   │   └── ApiErrorContext.tsx       # Global API error notification context
│   ├── hooks/
│   │   ├── useAuth.ts                # Supabase authentication state hook
│   │   ├── useConversations.ts       # Inbox chat threads & unread count hooks
│   │   ├── useCountUp.ts             # Animated count-up numbers hook
│   │   └── useLeads.ts               # Lead listing, stats, and real-time subscription hook
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

### 1. Lead Search Webhook (`VITE_N8N_SEARCH_URL`)
- **Method**: `POST`
- **Body**:
  ```json
  {
    "category": "Dentist",
    "location": "San Francisco, CA"
  }
  ```
- **Response**: Array of lead objects (`business_name`, `phone`, `address`, `rating`, `website`, `category`, `linkedin_url`, `email`).

### 2. WhatsApp Outreach Webhook (`VITE_N8N_SEND_URL`)
- **Method**: `POST`
- **Body**:
  ```json
  {
    "phone": "+14155552671",
    "business_name": "Bay Area Dental",
    "message": "Hi, noticed your website is offline. We build high-converting sites for local practices."
  }
  ```

### 3. Email Outreach Webhook (`VITE_N8N_EMAIL_URL`)
- **Method**: `POST`
- **Body**:
  ```json
  {
    "to_email": "contact@bayareadental.com",
    "business_name": "Bay Area Dental",
    "address": "123 Market St, San Francisco, CA",
    "website": "",
    "template_id": "website_pitch_email",
    "subject": "Website Opportunity for Bay Area Dental",
    "custom_body": "Hello, I noticed your practice doesn't currently have an active website..."
  }
  ```

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
