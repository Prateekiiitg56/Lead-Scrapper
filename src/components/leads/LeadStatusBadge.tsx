import type { LeadStatus } from '@/lib/constants';
import { STATUS_LABELS } from '@/lib/constants';

/* Dot colours per status — lightweight and on-brand */
const STATUS_DOT: Record<LeadStatus, string> = {
  NEW:            'bg-slate-400',
  CONTACTED:      'bg-blue-500',
  REPLIED:        'bg-amber-500',
  INTERESTED:     'bg-emerald-500',
  FOLLOW_UP:      'bg-orange-500',
  MEETING_BOOKED: 'bg-purple-500',
  CLIENT:         'bg-emerald-600',
  LOST:           'bg-red-500',
};

const BASE = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-tight transition-all duration-150 text-[#374151] whitespace-nowrap';

/** Read-only status label, or a toggle button when `onClick` is given. */
export function LeadStatusBadge({ status, onClick, active }: { status: LeadStatus; onClick?: () => void; active?: boolean }) {
  const dot = STATUS_DOT[status] || STATUS_DOT.NEW;
  const content = (
    <>
      <span className={`w-[6px] h-[6px] rounded-full ${dot} flex-shrink-0`} aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </>
  );

  if (!onClick) return <span className={BASE}>{content}</span>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={`${BASE} min-h-8 px-2.5 cursor-pointer hover:bg-[#F4F5F8] active:scale-[0.97] border ${
        active ? 'border-[#D44314] font-bold bg-[#FDEDE7] text-[#14161A]' : 'border-transparent'
      }`}
    >
      {content}
    </button>
  );
}
