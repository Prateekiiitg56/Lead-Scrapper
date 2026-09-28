import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Briefcase, Building2, Clock, ExternalLink, Loader2, MapPin, Radar, Search, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCountUp } from '@/hooks/useCountUp';
import { queryKeys } from '@/lib/queryClient';
import { errorMessage, timeAgo, toExternalUrl } from '@/lib/utils';
import {
  fetchJobSignalStats,
  fetchJobSignals,
  searchJobSignals,
  type JobSearchResult,
  type JobSignal,
  type JobSignalStats,
} from '@/services/jobSignalService';
import { SignalBadge } from '@/components/jobs/SignalBadge';
import { CompanyDrawer } from '@/components/jobs/CompanyDrawer';
import { FindPeopleModal } from '@/components/jobs/FindPeopleModal';
import { JobSignalsTabs } from '@/components/jobs/JobSignalsTabs';
import type { Company } from '@/types/database';

const MAX_REASONS = 4;

function StatTile({ label, value }: { label: string; value: number }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white rounded-[16px] px-4 py-3 text-center border border-[#E2E8F0] shadow-xs">
      <dd className="text-display text-[26px] text-[#14161A]">{animated}</dd>
      <dt className="eyebrow mt-0.5 text-[#374151] text-[10px]">{label}</dt>
    </div>
  );
}

function StatsSummary({ stats, loading, error }: { stats: JobSignalStats | undefined; loading: boolean; error: Error | null }) {
  if (error) {
    return <p role="alert" className="text-[12px] text-red-700 font-medium">Could not load Job Signals stats: {error.message}</p>;
  }
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Loading stats">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-[72px]" />)}
      </div>
    );
  }
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatTile label="Jobs found" value={stats.jobs} />
      <StatTile label="Companies" value={stats.companies} />
      <StatTile label="High-intent companies" value={stats.highIntentCompanies} />
      <StatTile label="People identified" value={stats.people} />
      <StatTile label="Contacted" value={stats.contacted} />
    </dl>
  );
}

function JobSignalCard({ job, onViewCompany, onFindPeople }: { job: JobSignal; onViewCompany: () => void; onFindPeople: () => void }) {
  const jobUrl = toExternalUrl(job.job_url);
  const reasons = job.signal?.reasons ?? [];

  return (
    <article className="ui-card flex flex-col justify-between h-full gap-4 hover:shadow-md hover:border-[#F0501E]/30 !p-5" aria-label={`${job.title} at ${job.company.name}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-bold text-[#14161A] leading-snug line-clamp-2 min-w-0" title={job.title}>{job.title}</h3>
          {job.signal && <SignalBadge level={job.signal.level} score={job.signal.score} />}
        </div>

        <dl className="space-y-2 text-[13px] text-[#374151] font-medium border-t border-[#E2E8F0] pt-3">
          <div className="flex items-center gap-2 min-w-0">
            <dt><Building2 className="w-3.5 h-3.5 text-[#4B5264]" aria-label="Company" /></dt>
            <dd className="font-bold text-[#14161A] truncate" title={job.company.name}>{job.company.name}</dd>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <dt><MapPin className="w-3.5 h-3.5 text-[#4B5264]" aria-label="Location" /></dt>
            <dd className={job.location ? 'truncate' : 'text-[#4B5264] italic'}>{job.location || 'Location not listed'}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt><Clock className="w-3.5 h-3.5 text-[#4B5264]" aria-label="Posted" /></dt>
            <dd className="font-mono text-[12px]">
              {job.posted_at ? `Posted ${timeAgo(job.posted_at)}` : 'Post date unknown'}
              {job.source && <span className="text-[#4B5264]"> · via {job.source}</span>}
            </dd>
          </div>
        </dl>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#374151] mb-1.5">Why this signal</div>
          {reasons.length === 0 ? (
            <p className="text-[12px] text-[#4B5264] italic">No automation or CRM keywords matched.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {reasons.slice(0, MAX_REASONS).map((reason) => (
                <li key={reason} className="px-2 py-0.5 rounded-full bg-[#F4F5F8] border border-[#E2E8F0] text-[11px] font-mono text-[#374151]">{reason}</li>
              ))}
              {reasons.length > MAX_REASONS && (
                <li className="px-2 py-0.5 text-[11px] font-mono text-[#4B5264]" title={reasons.slice(MAX_REASONS).join(', ')}>
                  +{reasons.length - MAX_REASONS} more
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
        {jobUrl ? (
          <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 !px-3 !text-[12px]">
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            View Job
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <button type="button" disabled className="btn-secondary !py-1.5 !px-3 !text-[12px]" title="No job link from the source">
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            View Job
          </button>
        )}
        <button type="button" onClick={onViewCompany} className="btn-secondary !py-1.5 !px-3 !text-[12px]">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          View Company
        </button>
        <button type="button" onClick={onFindPeople} className="btn-secondary !py-1.5 !px-3 !text-[12px]">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          Find People
        </button>
      </div>
    </article>
  );
}

export function JobSignalsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const formId = useId();
  const [query, setQuery] = useState('');
  // Remote-first: companies hiring remote automation roles are the main lead signal.
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [drawerCompany, setDrawerCompany] = useState<Company | null>(null);
  const [peopleTarget, setPeopleTarget] = useState<{ company: Company; jobIds: string[] } | null>(null);

  const statsQuery = useQuery({
    queryKey: queryKeys.jobSignalStats(userId),
    queryFn: () => fetchJobSignalStats(userId!),
    enabled: !!userId,
  });
  const recentQuery = useQuery({
    queryKey: queryKeys.jobSignals(userId),
    queryFn: () => fetchJobSignals(userId!),
    enabled: !!userId,
  });

  const search = useMutation<JobSearchResult, Error, { q: string; remote: boolean }>({
    mutationFn: ({ q, remote }) => searchJobSignals(user!, q, { remote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobSignals(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobSignalStats(userId) });
      queryClient.invalidateQueries({ queryKey: ['company-jobs'] });
    },
  });

  useEffect(() => {
    if (!search.isPending) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [search.isPending]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) return setFormError('Describe the jobs to look for, e.g. "automation jobs in USA".');
    setFormError(null);
    setLastQuery(q);
    search.mutate({ q, remote: remoteOnly });
  };

  const results = search.data?.jobs;
  const recent = recentQuery.data ?? [];

  const renderGrid = (jobs: JobSignal[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
      {jobs.map((job) => (
        <JobSignalCard
          key={job.id}
          job={job}
          onViewCompany={() => setDrawerCompany(job.company)}
          onFindPeople={() => setPeopleTarget({ company: job.company, jobIds: [job.id] })}
        />
      ))}
    </div>
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 font-sans text-[#14161A]">
      <div className="bg-[#E8EAF0] rounded-[24px] p-4 sm:p-6 lg:p-8 border border-[#D1D5DB] shadow-xs space-y-6 animate-blur-fade-up">
        <div className="space-y-5 border-b border-[#D1D5DB] pb-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="eyebrow text-[#374151] mb-1">Hiring intent</div>
              <h1 className="text-display-lg text-[#14161A] tracking-tight">Job signals</h1>
            </div>
            <JobSignalsTabs contactedCount={statsQuery.data?.contacted} />
          </div>
          <StatsSummary stats={statsQuery.data} loading={statsQuery.isPending} error={statsQuery.error} />
        </div>

        <form onSubmit={handleSearch} noValidate role="search" className="ui-card !p-4 flex flex-col sm:flex-row gap-3">
          <label htmlFor={`${formId}-q`} className="sr-only">Search job signals</label>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" aria-hidden="true" />
            <input
              id={`${formId}-q`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. automation jobs in USA"
              className="quiet-input !pl-11"
              aria-invalid={!!formError}
              aria-describedby={formError ? `${formId}-err` : undefined}
            />
          </div>
          <label className="flex items-center gap-2 px-3 text-[13px] font-semibold text-[#374151] cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="w-4 h-4 accent-[#D44314] cursor-pointer"
            />
            Remote only
          </label>
          <button type="submit" disabled={search.isPending || !userId} className="btn-primary sm:w-48">
            {search.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Radar className="w-4 h-4" aria-hidden="true" />}
            {search.isPending ? 'Searching…' : 'Find signals'}
          </button>
        </form>
        {formError && <p id={`${formId}-err`} role="alert" className="text-[12px] text-[#B91C1C] font-medium -mt-3">{formError}</p>}

        <section className="space-y-5" aria-label="Job signals" aria-busy={search.isPending}>
          {search.isPending ? (
            <div role="status" className="bg-white border border-[#d1d5db] rounded-[24px] p-10 text-center space-y-3 shadow-xs">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#D44314]" aria-hidden="true" />
              <p className="text-[15px] font-bold text-[#14161A]">Searching “{lastQuery}”…</p>
              <p className="text-[13px] text-[#4B5264]">
                Job board lookups usually take 20–60 seconds. <span className="font-mono">{elapsed}s</span>
              </p>
            </div>
          ) : search.isError ? (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-[20px] p-5 text-[13px] space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">Job search failed</p>
                  <p className="mt-0.5">{errorMessage(search.error)}</p>
                </div>
              </div>
              <button type="button" onClick={() => search.mutate(search.variables!)} className="btn-secondary !py-1.5">Retry search</button>
            </div>
          ) : results ? (
            <>
              <div className="bg-white rounded-[20px] p-4 border border-[#d1d5db] shadow-xs">
                <h2 className="text-[15px] font-bold text-[#14161A]" aria-live="polite">
                  {results.length} {results.length === 1 ? 'job' : 'jobs'} found for “{lastQuery}”
                </h2>
                {(search.data!.duplicates > 0 || search.data!.invalid > 0 || search.data!.filtered > 0) && (
                  <p className="text-[12px] text-[#4B5264]">
                    {search.data!.filtered > 0 && `${search.data!.filtered} filtered out (recruitment agencies, likely scams, off-topic, older than 30 days or duplicates). `}
                    {search.data!.duplicates > 0 && `${search.data!.duplicates} duplicate${search.data!.duplicates > 1 ? 's' : ''} removed. `}
                    {search.data!.invalid > 0 && `${search.data!.invalid} incomplete result${search.data!.invalid > 1 ? 's' : ''} skipped.`}
                  </p>
                )}
                {search.data!.warnings.length > 0 && (
                  <p className="text-[12px] text-amber-800 font-medium mt-1">{search.data!.warnings.join(' · ')}</p>
                )}
              </div>
              {results.length === 0 ? (
                <div className="bg-white border border-[#d1d5db] rounded-[24px] p-10 text-center space-y-2">
                  <p className="text-[15px] font-bold text-[#14161A]">No jobs matched “{lastQuery}”</p>
                  <p className="text-[13px] text-[#4B5264] max-w-md mx-auto">Try broader keywords or a larger location, e.g. “automation jobs in London”.</p>
                </div>
              ) : (
                renderGrid(results)
              )}
            </>
          ) : recentQuery.isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" aria-label="Loading saved signals">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-64" />)}
            </div>
          ) : recentQuery.isError ? (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-[20px] p-4 text-[13px] font-medium">
              Could not load saved signals: {errorMessage(recentQuery.error)}
            </div>
          ) : recent.length > 0 ? (
            <>
              <h2 className="text-[15px] font-bold text-[#14161A] px-1">Recent signals ({recent.length})</h2>
              {renderGrid(recent)}
            </>
          ) : (
            <div className="bg-white border border-[#d1d5db] rounded-[24px] p-12 text-center space-y-3 shadow-xs">
              <Briefcase className="w-10 h-10 mx-auto text-[#6B7280]" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[#14161A]">Find companies hiring for automation</h2>
              <p className="text-[13px] text-[#4B5264] max-w-md mx-auto">
                Search job posts like “automation jobs in USA”. With Remote only on, you get remote roles open to that country or region. Each opening is scored HIGH, MEDIUM or LOW by how many automation and CRM keywords it mentions.
              </p>
            </div>
          )}
        </section>
      </div>

      {drawerCompany && (
        <CompanyDrawer
          company={drawerCompany}
          onClose={() => setDrawerCompany(null)}
          onFindPeople={(company, jobIds) => setPeopleTarget({ company, jobIds })}
        />
      )}
      {peopleTarget && (
        <FindPeopleModal company={peopleTarget.company} jobIds={peopleTarget.jobIds} onClose={() => setPeopleTarget(null)} />
      )}
    </div>
  );
}
