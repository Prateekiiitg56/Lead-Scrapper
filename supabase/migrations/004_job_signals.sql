-- ══════════════════════════════════════════════════════════════
-- Migration 004: Job Signals module
-- Companies hiring for automation/CRM roles, their openings, the people
-- found at them, and the client-computed intent signal per opening.
-- Run in Supabase SQL Editor after 001–003. Safe to re-run.
-- Every row is owned by the user who searched (user_id = auth.uid()).
-- ══════════════════════════════════════════════════════════════

-- ═══════════════════════════════
-- Table: companies
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,              -- lower(trim(name)), the de-duplication key
  industry TEXT,
  location TEXT,
  website TEXT,
  linkedin_url TEXT,
  email TEXT,                          -- general contact address found on the company site
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name_key)
);

-- ═══════════════════════════════
-- Table: job_openings
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,            -- source id, job URL, or title|company|location
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  job_url TEXT,
  posted_at TIMESTAMPTZ,
  source TEXT,                         -- job board the posting came from, e.g. 'Adzuna'
  search_query TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, source_key)
);

-- ═══════════════════════════════
-- Table: people
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_key TEXT NOT NULL,            -- lower(linkedin_url) or lower(full_name)
  full_name TEXT NOT NULL,
  title TEXT,
  role TEXT,                           -- the role filter that found them, e.g. 'COO'
  linkedin_url TEXT,
  email TEXT,
  source TEXT,                         -- where they were found, e.g. 'LinkedIn, Companies House'
  source_url TEXT,                     -- page that lists them (register entry, team page)
  outreach_status TEXT NOT NULL DEFAULT 'saved' CHECK (outreach_status IN ('saved', 'contacted')),
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, company_id, person_key)
);

-- ═══════════════════════════════
-- Table: job_people (which people are relevant to which opening)
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS job_people (
  job_id UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (job_id, person_id)
);

-- ═══════════════════════════════
-- Table: signals (one keyword score per opening)
-- ═══════════════════════════════
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL UNIQUE REFERENCES job_openings(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('HIGH', 'MEDIUM', 'LOW')),
  score INTEGER NOT NULL DEFAULT 0,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Databases that ran an earlier copy of this file get the columns added.
ALTER TABLE people ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE job_openings ADD COLUMN IF NOT EXISTS source TEXT;

-- ══════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_job_openings_company ON job_openings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_user_created ON job_openings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_company ON people(company_id);
CREATE INDEX IF NOT EXISTS idx_people_user_status ON people(user_id, outreach_status);
CREATE INDEX IF NOT EXISTS idx_job_people_person ON job_people(person_id);
CREATE INDEX IF NOT EXISTS idx_signals_user_level ON signals(user_id, level);

-- ══════════════════════════════════════════
-- Row Level Security: each user sees and writes only their own rows
-- ══════════════════════════════════════════
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_owner" ON companies;
CREATE POLICY "companies_owner" ON companies FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "job_openings_owner" ON job_openings;
CREATE POLICY "job_openings_owner" ON job_openings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "people_owner" ON people;
CREATE POLICY "people_owner" ON people FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "job_people_owner" ON job_people;
CREATE POLICY "job_people_owner" ON job_people FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM job_openings j WHERE j.id = job_id AND j.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM people p WHERE p.id = person_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "signals_owner" ON signals;
CREATE POLICY "signals_owner" ON signals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM job_openings j WHERE j.id = job_id AND j.user_id = auth.uid()));

-- ══════════════════════════════════════════
-- updated_at triggers (update_updated_at() is defined in 001)
-- ══════════════════════════════════════════
DROP TRIGGER IF EXISTS companies_updated_at ON companies;
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS job_openings_updated_at ON job_openings;
CREATE TRIGGER job_openings_updated_at BEFORE UPDATE ON job_openings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS people_updated_at ON people;
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS signals_updated_at ON signals;
CREATE TRIGGER signals_updated_at BEFORE UPDATE ON signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
