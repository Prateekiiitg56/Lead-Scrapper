import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Clock, Loader2, Undo2, UserCheck } from 'lucide-react';
import { LinkedInLogo } from '@/components/common/LinkedInLogo';
import { JobSignalsTabs } from '@/components/jobs/JobSignalsTabs';
import { PersonSource } from '@/components/jobs/FindPeopleModal';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { errorMessage, timeAgo, toExternalUrl } from '@/lib/utils';
import { fetchContactedPeople, setPersonContacted, type ContactedPerson } from '@/services/jobSignalService';

/** People the user has marked contacted from Job Signals, kept apart from the ones still to reach. */
export function ContactedPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.contactedPeople(userId),
    queryFn: () => fetchContactedPeople(userId!),
    enabled: !!userId,
  });
  const people = query.data ?? [];

  const undo = useMutation({
    mutationFn: (person: ContactedPerson) => setPersonContacted(person.id, false),
    onSuccess: (saved) => {
      queryClient.setQueryData<ContactedPerson[]>(queryKeys.contactedPeople(userId), (old) => old?.filter((p) => p.id !== saved.id));
      queryClient.invalidateQueries({ queryKey: queryKeys.companyPeople(saved.company_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobSignalStats(userId) });
    },
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 font-sans text-[#14161A]">
      <div className="bg-[#E8EAF0] rounded-[24px] p-4 sm:p-6 lg:p-8 border border-[#D1D5DB] shadow-xs space-y-6 animate-blur-fade-up">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D1D5DB] pb-5">
          <div>
            <div className="eyebrow text-[#374151] mb-1">Job signals</div>
            <h1 className="text-display-lg text-[#14161A] tracking-tight">Contacted</h1>
          </div>
          <JobSignalsTabs contactedCount={query.data?.length} />
        </div>

        {undo.isError && (
          <p role="alert" className="text-[12px] text-red-700 font-medium">Could not undo: {errorMessage(undo.error)}</p>
        )}

        {query.isPending ? (
          <div className="space-y-3" aria-label="Loading contacted people">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
          </div>
        ) : query.isError ? (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-[20px] p-4 text-[13px] font-medium">
            Could not load contacted people: {errorMessage(query.error)}
          </div>
        ) : people.length === 0 ? (
          <div className="bg-white border border-[#d1d5db] rounded-[24px] p-12 text-center space-y-3 shadow-xs">
            <UserCheck className="w-10 h-10 mx-auto text-[#6B7280]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#14161A]">No one contacted yet</h2>
            <p className="text-[13px] text-[#4B5264] max-w-md mx-auto">
              Use Find People on a job signal and press “Mark as contacted”. They move here, and later searches flag them as already contacted.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Contacted people">
            {people.map((person) => {
              const linkedinUrl = toExternalUrl(person.linkedin_url);
              const busy = undo.isPending && undo.variables?.id === person.id;
              return (
                <li key={person.id} className="bg-white border border-[#d1d5db] rounded-[20px] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-[14px] font-bold text-[#14161A] truncate">{person.full_name}</div>
                    <div className="text-[12px] text-[#374151] font-medium truncate">{person.title || person.role || 'Title not listed'}</div>
                    {person.email && (
                      <a href={`mailto:${person.email}`} className="text-[12px] font-mono font-bold text-[#14161A] hover:underline truncate block">{person.email}</a>
                    )}
                    {person.source && <PersonSource source={person.source} url={person.source_url} />}
                    <div className="text-[11px] text-[#374151] font-mono font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#4B5264]" aria-hidden="true" />
                        {person.company?.name ?? 'Unknown company'}
                      </span>
                      {person.contacted_at && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#4B5264]" aria-hidden="true" />
                          Contacted {timeAgo(person.contacted_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {linkedinUrl && (
                      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 !px-3 !text-[12px] !text-[#0A66C2]">
                        <LinkedInLogo className="w-3.5 h-3.5" />
                        View LinkedIn
                        <span className="sr-only"> for {person.full_name} (opens in a new tab)</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => undo.mutate(person)}
                      disabled={busy}
                      className="btn-ghost !py-1.5 !px-3 !text-[12px]"
                      aria-label={`Undo: mark ${person.full_name} as not contacted`}
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />}
                      Undo
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
