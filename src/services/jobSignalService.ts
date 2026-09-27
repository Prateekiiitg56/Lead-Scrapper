import { supabase } from '@/lib/supabase';
import { scoreJob } from '@/lib/signalScoring';
import { asString, callWebhook, WebhookError } from '@/services/searchService';
import type { Company, JobOpening, Person, PersonOutreachStatus, Signal } from '@/types/database';

/** Job board scraping in n8n is as slow as the Places search. */
const JOBS_TIMEOUT_MS = 120_000;
const PEOPLE_TIMEOUT_MS = 90_000;

export const PEOPLE_ROLES = [
  'Founder/CEO',
  'COO',
  'Head of Marketing',
  'Head of Growth',
  'CTO',
  'Hiring Manager',
  'Recruiter',
] as const;
export type PeopleRole = (typeof PEOPLE_ROLES)[number];

export const MISSING_MIGRATION_004 =
  'The database is missing the Job Signals tables. Apply supabase/migrations/004_job_signals.sql.';

function isMissingTableError(error: { code?: string } | null): boolean {
  // 42P01: undefined_table (Postgres). PGRST205: table not in PostgREST schema cache.
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

function check(error: { code?: string } | null): void {
  if (!error) return;
  if (isMissingTableError(error)) throw new Error(MISSING_MIGRATION_004);
  throw error;
}

/** An opening with its company and keyword signal, as the cards and drawer render it. */
export interface JobSignal extends JobOpening {
  company: Company;
  signal: Signal | null;
}

// Explicit FK hints: signals also links job_openings to companies, which PostgREST would
// otherwise read as a second (many-to-many) path and reject as ambiguous.
const JOB_SIGNAL_SELECT = '*, company:companies!job_openings_company_id_fkey(*), signal:signals!signals_job_id_fkey(*)';

/** PostgREST returns a one-to-one embed as an object, older versions as a one-item array. */
function toJobSignal(row: Record<string, unknown>): JobSignal {
  const signal = row.signal;
  return { ...(row as unknown as JobSignal), signal: (Array.isArray(signal) ? signal[0] : signal) ?? null };
}

export function companyKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/* ─────────────────────────── Job search ─────────────────────────── */

interface RawJob {
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  job_url: string | null;
  posted_at: string | null;
  source_key: string;
  source: string | null;
  company_industry: string | null;
  company_location: string | null;
  company_website: string | null;
  company_linkedin: string | null;
}

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
};

/** ISO dates, or the relative text job boards show ("3 days ago", "30+ days ago", "today"). */
export function parsePostedAt(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  if (/^(just now|today|now)$/.test(text)) return new Date().toISOString();
  if (text === 'yesterday') return new Date(Date.now() - UNIT_MS.day).toISOString();
  const rel = /(\d+)\+?\s*(minute|min|hour|hr|day|week|month)s?\s+ago/.exec(text);
  if (rel) {
    const unit = rel[2] === 'min' ? 'minute' : rel[2] === 'hr' ? 'hour' : rel[2];
    return new Date(Date.now() - Number(rel[1]) * UNIT_MS[unit]).toISOString();
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function normalizeJob(raw: unknown): RawJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const company = (r.company && typeof r.company === 'object' ? r.company : {}) as Record<string, unknown>;
  const title = asString(r.title ?? r.job_title);
  const companyName = asString(typeof r.company === 'string' ? r.company : company.name ?? r.company_name);
  if (!title || !companyName) return null;
  const location = asString(r.location) || null;
  const jobUrl = asString(r.url ?? r.job_url) || null;
  return {
    title,
    company: companyName,
    location,
    description: asString(r.description ?? r.job_description) || null,
    job_url: jobUrl,
    posted_at: parsePostedAt(asString(r.posted_at ?? r.posted ?? r.date_posted)),
    source_key: (asString(r.id ?? r.external_id) || jobUrl || `${title}|${companyName}|${location ?? ''}`).toLowerCase(),
    source: asString(r.source) || null,
    company_industry: asString(company.industry ?? r.company_industry) || null,
    company_location: asString(company.location ?? r.company_location) || null,
    company_website: asString(company.website ?? r.company_website) || null,
    company_linkedin: asString(company.linkedin_url ?? company.linkedin ?? r.company_linkedin) || null,
  };
}

/** "CRM automation jobs in UK" → keywords "CRM automation", location "UK". */
export function parseJobQuery(query: string): { keywords: string; location: string } {
  const q = query.trim();
  const match = /^(.*)\s+in\s+(.+)$/i.exec(q);
  const keywords = (match ? match[1] : q).replace(/\b(jobs?|roles?|openings?|vacanc(y|ies))\b/gi, '').replace(/\s+/g, ' ').trim();
  return { keywords: keywords || q, location: match ? match[2].trim() : '' };
}

/** Insert companies that are new and fill blank fields on ones the user already has. Never overwrites. */
async function upsertCompanies(userId: string, jobs: RawJob[]): Promise<Map<string, Company>> {
  const incoming = new Map<string, Partial<Company>>();
  for (const job of jobs) {
    const key = companyKey(job.company);
    const prev = incoming.get(key) ?? { name: job.company };
    incoming.set(key, {
      name: prev.name,
      industry: prev.industry || job.company_industry,
      location: prev.location || job.company_location || job.location,
      website: prev.website || job.company_website,
      linkedin_url: prev.linkedin_url || job.company_linkedin,
    });
  }

  const { data: existing, error: readError } = await supabase
    .from('companies').select('*')
    .eq('user_id', userId)
    .in('name_key', [...incoming.keys()]);
  check(readError);
  const existingByKey = new Map((existing as Company[] ?? []).map((c) => [c.name_key, c]));

  const rows = [...incoming].map(([key, next]) => {
    const prev = existingByKey.get(key);
    return {
      user_id: userId,
      name_key: key,
      name: prev?.name || next.name,
      industry: prev?.industry || next.industry || null,
      location: prev?.location || next.location || null,
      website: prev?.website || next.website || null,
      linkedin_url: prev?.linkedin_url || next.linkedin_url || null,
    };
  });
  const { data, error } = await supabase.from('companies').upsert(rows, { onConflict: 'user_id,name_key' }).select();
  check(error);
  return new Map((data as Company[]).map((c) => [c.name_key, c]));
}

export interface JobSearchResult {
  jobs: JobSignal[];
  /** Rows dropped because they repeated an opening already in the results. */
  duplicates: number;
  /** Rows dropped because they had no title or company. */
  invalid: number;
  /** Postings the workflow removed as agencies, scams, off-topic, stale or duplicates. */
  filtered: number;
  /** Sources that failed or could not cover the location; the search still returns the rest. */
  warnings: string[];
}

/** Search jobs through the n8n jobs webhook, score them, and store companies, openings and signals. */
export async function searchJobSignals(user: { id: string; email?: string | null }, query: string): Promise<JobSearchResult> {
  const userId = user.id;
  const { keywords, location } = parseJobQuery(query);
  const json = await callWebhook('jobs', { method: 'POST', body: { query, keywords, location, user_id: userId, user_email: user.email || '' } }, JOBS_TIMEOUT_MS);

  const body = json as { success?: unknown; message?: unknown; jobs?: unknown; dropped?: unknown; warnings?: unknown };
  const rawJobs = Array.isArray(json) ? json : body.jobs;
  if (!Array.isArray(json) && body.success === false) {
    throw new WebhookError('rejected', asString(body.message) || 'The job search workflow reported a failure.');
  }
  if (!Array.isArray(rawJobs)) {
    throw new WebhookError('malformed', 'The job search service response did not contain a jobs list.');
  }
  const filtered = body.dropped && typeof body.dropped === 'object'
    ? Object.values(body.dropped as Record<string, unknown>).reduce<number>((sum, n) => sum + (Number(n) || 0), 0)
    : 0;
  const warnings = Array.isArray(body.warnings) ? body.warnings.map(asString).filter(Boolean) : [];

  const seen = new Set<string>();
  const jobs: RawJob[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const raw of rawJobs) {
    const job = normalizeJob(raw);
    if (!job) { invalid++; continue; }
    if (seen.has(job.source_key)) { duplicates++; continue; }
    seen.add(job.source_key);
    jobs.push(job);
  }
  if (jobs.length === 0) return { jobs: [], duplicates, invalid, filtered, warnings };

  const companies = await upsertCompanies(userId, jobs);

  const { data: openings, error: jobError } = await supabase
    .from('job_openings')
    .upsert(
      jobs.map((j) => ({
        user_id: userId,
        company_id: companies.get(companyKey(j.company))!.id,
        source_key: j.source_key,
        title: j.title,
        location: j.location,
        description: j.description,
        job_url: j.job_url,
        posted_at: j.posted_at,
        source: j.source,
        search_query: query.trim(),
      })),
      { onConflict: 'user_id,source_key' }
    )
    .select();
  check(jobError);

  const { data: signals, error: signalError } = await supabase
    .from('signals')
    .upsert(
      (openings as JobOpening[]).map((o) => ({ user_id: userId, job_id: o.id, company_id: o.company_id, ...scoreJob(o.title, o.description) })),
      { onConflict: 'job_id' }
    )
    .select();
  check(signalError);

  const signalByJob = new Map((signals as Signal[]).map((s) => [s.job_id, s]));
  const companyById = new Map([...companies.values()].map((c) => [c.id, c]));
  const order = new Map(jobs.map((j, i) => [j.source_key, i]));
  const result = (openings as JobOpening[])
    .map((o) => ({ ...o, company: companyById.get(o.company_id)!, signal: signalByJob.get(o.id) ?? null }))
    .sort((a, b) => order.get(a.source_key)! - order.get(b.source_key)!);
  return { jobs: result, duplicates, invalid, filtered, warnings };
}

/** The user's most recently found openings, newest first. */
export async function fetchJobSignals(userId: string, limit = 100): Promise<JobSignal[]> {
  const { data, error } = await supabase
    .from('job_openings')
    .select(JOB_SIGNAL_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  check(error);
  return (data ?? []).map(toJobSignal);
}

export async function fetchCompanyJobs(companyId: string): Promise<JobSignal[]> {
  const { data, error } = await supabase
    .from('job_openings')
    .select(JOB_SIGNAL_SELECT)
    .eq('company_id', companyId)
    .order('posted_at', { ascending: false, nullsFirst: false });
  check(error);
  return (data ?? []).map(toJobSignal);
}

/* ─────────────────────────── People ─────────────────────────── */

/** A person returned by the n8n people webhook, before it is saved. */
export interface FoundPerson {
  full_name: string;
  title: string | null;
  role: string | null;
  linkedin_url: string | null;
  email: string | null;
  /** Where the person was found, e.g. "LinkedIn, Companies House". */
  source: string | null;
  /** The page that lists them (company register entry, team page). */
  source_url: string | null;
}

export function personKey(p: Pick<FoundPerson, 'full_name' | 'linkedin_url'>): string {
  const linkedin = (p.linkedin_url ?? '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
  return linkedin || p.full_name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePerson(raw: unknown): FoundPerson | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const full_name = asString(r.name ?? r.full_name);
  if (!full_name) return null;
  return {
    full_name,
    title: asString(r.title ?? r.job_title) || null,
    role: asString(r.role) || null,
    linkedin_url: asString(r.linkedin_url ?? r.linkedin) || null,
    email: asString(r.email) || null,
    source: asString(r.source) || null,
    source_url: asString(r.source_url) || null,
  };
}

export interface PeopleSearchResult {
  people: FoundPerson[];
  /** The company record with any website/email the lookup found filled in. */
  company: Company;
  /** Sources that failed or found nothing, e.g. "Company website: not found". */
  warnings: string[];
}

/** Save a website/email the lookup found onto the company, without overwriting what is there. */
async function fillCompanyContact(company: Company, found: unknown): Promise<Company> {
  const f = (found && typeof found === 'object' ? found : {}) as Record<string, unknown>;
  const updates: Partial<Company> = {};
  const website = asString(f.website);
  const email = asString(f.email);
  if (!company.website && website) updates.website = website;
  if (!company.email && email) updates.email = email;
  if (!Object.keys(updates).length) return company;
  const { data, error } = await supabase.from('companies').update(updates).eq('id', company.id).select().single();
  check(error);
  return data as Company;
}

/**
 * Look up decision makers at a company through the n8n people webhook. People are not saved;
 * a company website or contact email found on the way is stored on the company.
 */
export async function findPeople(company: Company, roles: PeopleRole[]): Promise<PeopleSearchResult> {
  if (roles.length === 0) throw new WebhookError('config', 'Select at least one role to search for.');
  const json = await callWebhook(
    'people',
    {
      method: 'POST',
      body: { company: company.name, website: company.website || '', linkedin_url: company.linkedin_url || '', location: company.location || '', roles },
    },
    PEOPLE_TIMEOUT_MS
  );
  const body = json as { success?: unknown; message?: unknown; people?: unknown; company?: unknown; warnings?: unknown };
  const rawPeople = Array.isArray(json) ? json : body.people;
  if (!Array.isArray(json) && body.success === false) {
    throw new WebhookError('rejected', asString(body.message) || 'The people search workflow reported a failure.');
  }
  if (!Array.isArray(rawPeople)) {
    throw new WebhookError('malformed', 'The people search service response did not contain a people list.');
  }
  const seen = new Set<string>();
  const people: FoundPerson[] = [];
  for (const raw of rawPeople) {
    const person = normalizePerson(raw);
    if (!person || seen.has(personKey(person))) continue;
    seen.add(personKey(person));
    people.push(person);
  }
  const warnings = Array.isArray(body.warnings) ? body.warnings.map(asString).filter(Boolean) : [];
  const updated = Array.isArray(json) ? company : await fillCompanyContact(company, body.company);
  return { people, company: updated, warnings };
}

export async function fetchCompanyPeople(companyId: string): Promise<Person[]> {
  const { data, error } = await supabase.from('people').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  check(error);
  return (data ?? []) as Person[];
}

/**
 * Save a found person and link them to the openings they are relevant to. Re-saving fills
 * blank fields and never moves a contacted person back to saved.
 */
export async function savePerson(
  userId: string,
  companyId: string,
  jobIds: string[],
  person: FoundPerson,
  status: PersonOutreachStatus = 'saved'
): Promise<Person> {
  const key = personKey(person);
  const { data: found, error: readError } = await supabase
    .from('people').select('*')
    .eq('user_id', userId).eq('company_id', companyId).eq('person_key', key)
    .limit(1);
  check(readError);
  const prev = (found as Person[] | null)?.[0];

  const { data, error } = await supabase
    .from('people')
    .upsert(
      {
        user_id: userId,
        company_id: companyId,
        person_key: key,
        full_name: prev?.full_name || person.full_name,
        title: prev?.title || person.title,
        role: prev?.role || person.role,
        linkedin_url: prev?.linkedin_url || person.linkedin_url,
        email: prev?.email || person.email,
        source: prev?.source || person.source,
        source_url: prev?.source_url || person.source_url,
        ...(prev?.outreach_status === 'contacted'
          ? { outreach_status: 'contacted', contacted_at: prev.contacted_at }
          : { outreach_status: status, contacted_at: status === 'contacted' ? new Date().toISOString() : null }),
      },
      { onConflict: 'user_id,company_id,person_key' }
    )
    .select()
    .single();
  check(error);
  const saved = data as Person;

  if (jobIds.length) {
    const { error: linkError } = await supabase
      .from('job_people')
      .upsert(jobIds.map((job_id) => ({ job_id, person_id: saved.id, user_id: userId })), { onConflict: 'job_id,person_id', ignoreDuplicates: true });
    check(linkError);
  }
  return saved;
}

/** Mark a saved person contacted, or undo it (back to saved). */
export async function setPersonContacted(personId: string, contacted: boolean): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .update(contacted ? { outreach_status: 'contacted', contacted_at: new Date().toISOString() } : { outreach_status: 'saved', contacted_at: null })
    .eq('id', personId)
    .select()
    .single();
  check(error);
  return data as Person;
}

export interface ContactedPerson extends Person {
  company: Company;
}

/** Everyone the user has marked contacted, most recent first. */
export async function fetchContactedPeople(userId: string): Promise<ContactedPerson[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*, company:companies(*)')
    .eq('user_id', userId)
    .eq('outreach_status', 'contacted')
    .order('contacted_at', { ascending: false, nullsFirst: false });
  check(error);
  return (data ?? []) as ContactedPerson[];
}

/* ─────────────────────────── Stats ─────────────────────────── */

export interface JobSignalStats {
  jobs: number;
  companies: number;
  highIntentCompanies: number;
  people: number;
  contacted: number;
}

async function countRows(table: string, userId: string, filter?: [string, string]): Promise<number> {
  let q = supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count, error } = await q;
  check(error);
  return count ?? 0;
}

export async function fetchJobSignalStats(userId: string): Promise<JobSignalStats> {
  // Counting companies through an inner embed counts each company once, however many HIGH openings it has.
  const highIntent = supabase
    .from('companies')
    .select('id, signals!signals_company_id_fkey!inner(level)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('signals.level', 'HIGH');
  const [jobs, companies, people, contacted, high] = await Promise.all([
    countRows('job_openings', userId),
    countRows('companies', userId),
    countRows('people', userId),
    countRows('people', userId, ['outreach_status', 'contacted']),
    highIntent,
  ]);
  check(high.error);
  return { jobs, companies, highIntentCompanies: high.count ?? 0, people, contacted };
}
