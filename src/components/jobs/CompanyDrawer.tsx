import { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, CheckCircle2, ExternalLink, Globe, Loader2, Mail, MapPin, Users, X } from 'lucide-react';
import { LinkedInLogo } from '@/components/common/LinkedInLogo';
import { SignalBadge } from '@/components/jobs/SignalBadge';
import { useAuth } from '@/hooks/useAuth';
import { useDialog } from '@/hooks/useDialog';
import { queryKeys } from '@/lib/queryClient';
import { errorMessage, timeAgo, toExternalUrl } from '@/lib/utils';
import { fetchCompanyJobs, fetchCompanyPeople, setPersonContacted } from '@/services/jobSignalService';
import type { Company, Person } from '@/types/database';

/** Right-hand panel with a company's details, every opening we found there, and saved people. */
export function CompanyDrawer({
  company: initialCompany,
  onClose,
  onFindPeople,
}: {
  company: Company;
  onClose: () => void;
  onFindPeople: (company: Company, jobIds: string[]) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(panelRef, true, onClose);

  const jobsQuery = useQuery({ queryKey: queryKeys.companyJobs(initialCompany.id), queryFn: () => fetchCompanyJobs(initialCompany.id) });
  const peopleQuery = useQuery({ queryKey: queryKeys.companyPeople(initialCompany.id), queryFn: () => fetchCompanyPeople(initialCompany.id) });
  const jobs = jobsQuery.data ?? [];
  // The openings embed the stored company, which picks up a website/email found by Find people.
  const company = jobs[0]?.company ?? initialCompany;
  // Contacted people live on the Contacted page; the drawer lists the ones still to reach.
  const people = (peopleQuery.data ?? []).filter((p) => p.outreach_status !== 'contacted');
  const contactedCount = (peopleQuery.data?.length ?? 0) - people.length;

  const contact = useMutation({
    mutationFn: (personId: string) => setPersonContacted(personId, true),
    onSuccess: (saved) => {
      queryClient.setQueryData<Person[]>(queryKeys.companyPeople(company.id), (old) => old?.map((p) => (p.id === saved.id ? saved : p)));
      queryClient.invalidateQueries({ queryKey: queryKeys.jobSignalStats(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contactedPeople(user?.id) });
    },
  });

  const websiteUrl = toExternalUrl(company.website);
  const linkedinUrl = toExternalUrl(company.linkedin_url);

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-[#d1d5db] z-50 flex flex-col animate-drawer-slide shadow-2xl font-sans text-[#14161A] sm:rounded-l-[28px] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-[#d1d5db] bg-[#e8eaf0] flex-shrink-0">
          <div className="eyebrow text-[#374151] font-bold">Company details</div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close company details">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-[#17192B] text-white font-bold text-lg flex items-center justify-center shadow-sm font-mono flex-shrink-0" aria-hidden="true">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="text-2xl leading-tight font-display font-bold text-[#14161A] break-words">{company.name}</h2>
                {company.industry && <div className="text-[13px] text-[#374151] font-semibold">{company.industry}</div>}
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 bg-[#f4f5f8] p-4 rounded-[20px] border border-[#d1d5db] text-[13px]">
              <div className="flex items-center gap-2.5">
                <dt><Building2 className="w-4 h-4 text-[#B93A0E]" aria-label="Industry" /></dt>
                <dd className={company.industry ? 'font-semibold' : 'text-[#4B5264] italic'}>{company.industry || 'Industry not listed'}</dd>
              </div>
              <div className="flex items-start gap-2.5">
                <dt><MapPin className="w-4 h-4 text-[#4B5264] flex-shrink-0 mt-0.5" aria-label="Location" /></dt>
                <dd className={company.location ? 'text-[#374151] font-medium' : 'text-[#4B5264] italic'}>{company.location || 'Location not listed'}</dd>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <dt><Mail className="w-4 h-4 text-[#4B5264] flex-shrink-0" aria-label="Email" /></dt>
                <dd className="min-w-0">
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="font-mono font-bold text-[#14161A] hover:underline truncate block">{company.email}</a>
                  ) : (
                    <span className="text-[#4B5264] italic">No email yet. Find people also checks the website for one.</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <dt><Globe className="w-4 h-4 text-[#4B5264] flex-shrink-0" aria-label="Website" /></dt>
                <dd className="min-w-0">
                  {websiteUrl ? (
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-[#B93A0E] hover:underline truncate block">
                      {company.website!.replace(/^https?:\/\//, '')}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-[#4B5264] italic">No website listed</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <dt><LinkedInLogo className="w-4 h-4 text-[#0A66C2] flex-shrink-0" /><span className="sr-only">LinkedIn</span></dt>
                <dd className="min-w-0">
                  {linkedinUrl ? (
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-[#0A66C2] hover:underline truncate block">
                      LinkedIn page
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <a
                      href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#4B5264] hover:text-[#0A66C2] hover:underline"
                    >
                      Search on LinkedIn
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <button type="button" onClick={() => onFindPeople(company, jobs.map((j) => j.id))} disabled={jobsQuery.isPending} className="btn-primary w-full">
            <Users className="w-4 h-4" aria-hidden="true" />
            Find people
          </button>

          <section aria-labelledby={`${titleId}-jobs`} className="space-y-3">
            <h3 id={`${titleId}-jobs`} className="eyebrow text-[#374151] flex items-center gap-2">
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              Job openings {jobsQuery.data && `(${jobs.length})`}
            </h3>
            {jobsQuery.isPending ? (
              <div className="skeleton h-16" aria-label="Loading job openings" />
            ) : jobsQuery.isError ? (
              <p role="alert" className="text-[12px] text-red-700 font-medium">Could not load openings: {errorMessage(jobsQuery.error)}</p>
            ) : (
              <ul className="space-y-2">
                {jobs.map((job) => {
                  const jobUrl = toExternalUrl(job.job_url);
                  return (
                    <li key={job.id} className="bg-[#F8F9FC] border border-[#E2E8F0] rounded-[16px] p-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-bold text-[#14161A] leading-snug">{job.title}</span>
                        {job.signal && <SignalBadge level={job.signal.level} score={job.signal.score} />}
                      </div>
                      <div className="text-[11px] text-[#374151] font-mono font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
                        {job.location && <span>{job.location}</span>}
                        {job.posted_at && <span>Posted {timeAgo(job.posted_at)}</span>}
                        {jobUrl && (
                          <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="text-[#B93A0E] hover:underline inline-flex items-center gap-1">
                            View job <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            <span className="sr-only"> {job.title} (opens in a new tab)</span>
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby={`${titleId}-people`} className="space-y-3">
            <h3 id={`${titleId}-people`} className="eyebrow text-[#374151] flex items-center gap-2">
              <Users className="w-4 h-4" aria-hidden="true" />
              Saved people {peopleQuery.data && `(${people.length})`}
            </h3>
            {contact.isError && <p role="alert" className="text-[12px] text-red-700 font-medium">Could not update: {errorMessage(contact.error)}</p>}
            {peopleQuery.isPending ? (
              <div className="skeleton h-12" aria-label="Loading saved people" />
            ) : peopleQuery.isError ? (
              <p role="alert" className="text-[12px] text-red-700 font-medium">Could not load people: {errorMessage(peopleQuery.error)}</p>
            ) : people.length === 0 ? (
              <p className="text-[12px] text-[#4B5264] font-medium">
                {contactedCount > 0 ? 'Everyone saved here has been contacted.' : 'No one saved yet. Use Find people to look up decision makers.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {people.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3 border border-[#E2E8F0] rounded-[16px] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[#14161A] truncate">{person.full_name}</div>
                      <div className="text-[11px] text-[#374151] font-medium truncate">{person.title || person.role || '—'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => contact.mutate(person.id)}
                      disabled={contact.isPending && contact.variables === person.id}
                      className="btn-secondary !py-1 !px-2.5 !text-[11px] flex-shrink-0"
                      aria-label={`Mark ${person.full_name} as contacted`}
                    >
                      {contact.isPending && contact.variables === person.id ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-3 h-3" aria-hidden="true" />}
                      Mark as contacted
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {contactedCount > 0 && (
              <Link to="/job-signals/contacted" className="text-[12px] font-bold text-[#B93A0E] hover:underline inline-block">
                {contactedCount} contacted at {company.name} <span aria-hidden="true">&gt;</span>
              </Link>
            )}
          </section>
        </div>
      </div>
    </>,
    document.body
  );
}
