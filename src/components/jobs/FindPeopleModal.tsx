import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BookmarkPlus, Check, CheckCircle2, Loader2, Search, Users } from 'lucide-react';
import { LinkedInLogo } from '@/components/common/LinkedInLogo';
import { OutreachModal } from '@/components/common/OutreachModal';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { errorMessage, timeAgo, toExternalUrl } from '@/lib/utils';
import {
  PEOPLE_ROLES,
  fetchCompanyPeople,
  findPeople,
  personKey,
  savePerson,
  type FoundPerson,
  type PeopleRole,
} from '@/services/jobSignalService';
import type { Company, Person, PersonOutreachStatus } from '@/types/database';

function linkedInUrl(person: FoundPerson, company: Company): string {
  return (
    toExternalUrl(person.linkedin_url) ||
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${person.full_name} ${company.name}`)}`
  );
}

/** "via Companies House, Company website", linking to the page that lists the person. */
export function PersonSource({ source, url }: { source: string; url: string | null }) {
  const href = toExternalUrl(url);
  return (
    <div className="text-[11px] font-mono text-[#4B5264] truncate">
      via{' '}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#B93A0E] hover:underline">
          {source}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        source
      )}
    </div>
  );
}

/**
 * Pick decision-maker roles, then search. The lookup only runs when the user presses Search.
 * People already marked contacted at this company stay in the results, flagged "Already contacted".
 * `jobIds` are the openings saved people get linked to (one job from a card, all from the drawer).
 */
export function FindPeopleModal({ company, jobIds, onClose }: { company: Company; jobIds: string[]; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  const [roles, setRoles] = useState<PeopleRole[]>([]);

  const savedQuery = useQuery({
    queryKey: queryKeys.companyPeople(company.id),
    queryFn: () => fetchCompanyPeople(company.id),
  });
  const savedByKey = useMemo(() => new Map((savedQuery.data ?? []).map((p) => [p.person_key, p])), [savedQuery.data]);

  const search = useMutation({
    mutationFn: () => findPeople(company, roles),
    // The lookup may have stored the company's website or contact email; refresh views that show it.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyJobs(company.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobSignals(user?.id) });
    },
  });

  const save = useMutation({
    mutationFn: ({ person, status }: { person: FoundPerson; status: PersonOutreachStatus }) =>
      savePerson(user!.id, company.id, jobIds, person, status),
    onSuccess: (saved) => {
      queryClient.setQueryData<Person[]>(queryKeys.companyPeople(company.id), (old) => [saved, ...(old ?? []).filter((p) => p.id !== saved.id)]);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobSignalStats(user?.id) });
      if (saved.outreach_status === 'contacted') queryClient.invalidateQueries({ queryKey: queryKeys.contactedPeople(user?.id) });
    },
  });

  const toggleRole = (role: PeopleRole) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const people = search.data?.people;
  const found = search.data?.company;

  return (
    <OutreachModal
      isOpen
      onClose={onClose}
      icon={<Users className="w-5 h-5 text-[#B93A0E]" />}
      title="Find people"
      businessName={company.name}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Close</button>
          <button type="button" onClick={() => search.mutate()} disabled={roles.length === 0 || search.isPending} className="btn-primary">
            {search.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
            {search.isPending ? 'Searching…' : 'Search'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset aria-describedby={`${id}-hint`}>
          <legend className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#374151] mb-2">Roles to look for</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PEOPLE_ROLES.map((role) => (
              <label
                key={role}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] font-semibold cursor-pointer transition-colors ${
                  roles.includes(role) ? 'border-[#D44314] bg-[#FDEDE7]/60 text-[#14161A]' : 'border-[#E2E8F0] text-[#374151] hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  disabled={search.isPending}
                  className="w-4 h-4 accent-[#D44314] cursor-pointer"
                />
                {role}
              </label>
            ))}
          </div>
          <p id={`${id}-hint`} className="text-[12px] text-[#4B5264] mt-2">
            {roles.length === 0 ? 'Select at least one role, then press Search.' : `${roles.length} selected. Press Search to look them up.`}
          </p>
        </fieldset>

        <section aria-label="People found" aria-busy={search.isPending} className="space-y-2.5">
          {search.isError && (
            <div role="alert" className="bg-[#FEF2F2] border border-red-200 text-[#B91C1C] p-3.5 rounded-xl text-[12px] font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
              <span>{errorMessage(search.error)}</span>
            </div>
          )}
          {save.isError && (
            <p role="alert" className="text-[12px] text-[#B91C1C] font-medium">
              Could not save {save.variables?.person.full_name}: {errorMessage(save.error)}
            </p>
          )}

          {people && (
            <h3 className="text-[13px] font-bold text-[#14161A]" aria-live="polite">
              {people.length === 0 ? 'No people found for these roles.' : `${people.length} ${people.length === 1 ? 'person' : 'people'} found`}
            </h3>
          )}

          {found && (found.email || found.website) && (
            <dl className="text-[12px] bg-[#F4F5F8] border border-[#E2E8F0] rounded-xl px-3 py-2 space-y-1">
              {found.email && (
                <div className="flex items-center gap-2 min-w-0">
                  <dt className="text-[#4B5264] font-semibold flex-shrink-0">Company email</dt>
                  <dd className="min-w-0"><a href={`mailto:${found.email}`} className="font-mono font-bold text-[#14161A] hover:underline truncate block">{found.email}</a></dd>
                </div>
              )}
              {toExternalUrl(found.website) && (
                <div className="flex items-center gap-2 min-w-0">
                  <dt className="text-[#4B5264] font-semibold flex-shrink-0">Website</dt>
                  <dd className="min-w-0">
                    <a href={toExternalUrl(found.website)} target="_blank" rel="noopener noreferrer" className="font-mono text-[#B93A0E] hover:underline truncate block">
                      {found.website!.replace(/^https?:\/\//, '')}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {search.data && search.data.warnings.length > 0 && (
            <p className="text-[11px] text-[#4B5264] font-mono">{search.data.warnings.join(' · ')}</p>
          )}

          {people && people.length > 0 && (
            <ul className="space-y-2">
              {people.map((person) => {
                const saved = savedByKey.get(personKey(person));
                const contacted = saved?.outreach_status === 'contacted';
                const busy = save.isPending && save.variables?.person === person;
                return (
                  <li
                    key={personKey(person)}
                    className={`border rounded-[16px] p-3.5 space-y-2.5 ${contacted ? 'bg-white border-dashed border-[#D1D5DB] opacity-75' : 'bg-[#F8F9FC] border-[#E2E8F0]'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold text-[#14161A] truncate" title={person.full_name}>{person.full_name}</div>
                        <div className="text-[12px] text-[#374151] font-medium truncate">{person.title || person.role || 'Title not listed'}</div>
                        {person.email && (
                          <a href={`mailto:${person.email}`} className="text-[12px] font-mono font-bold text-[#14161A] hover:underline truncate block">{person.email}</a>
                        )}
                        {person.source && <PersonSource source={person.source} url={person.source_url} />}
                      </div>
                      {contacted && (
                        <span className="badge-success !text-[11px] !px-2.5 !py-0.5 flex-shrink-0" title={saved.contacted_at ? `Contacted ${timeAgo(saved.contacted_at)}` : undefined}>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Already contacted
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!contacted && (saved ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Saved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => save.mutate({ person, status: 'saved' })}
                          disabled={busy}
                          className="btn-secondary !py-1.5 !px-3 !text-[12px]"
                        >
                          {busy && save.variables?.status === 'saved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />}
                          Save
                        </button>
                      ))}
                      <a
                        href={linkedInUrl(person, company)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !py-1.5 !px-3 !text-[12px] !text-[#0A66C2]"
                      >
                        <LinkedInLogo className="w-3.5 h-3.5" />
                        {person.linkedin_url ? 'View LinkedIn' : 'Search LinkedIn'}
                        <span className="sr-only"> for {person.full_name} (opens in a new tab)</span>
                      </a>
                      {!contacted && (
                        <button
                          type="button"
                          onClick={() => save.mutate({ person, status: 'contacted' })}
                          disabled={busy}
                          className="btn-secondary !py-1.5 !px-3 !text-[12px]"
                        >
                          {busy && save.variables?.status === 'contacted' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                          Mark as contacted
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </OutreachModal>
  );
}
