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

export function LeadStatusBadge({
  status,
  onClick,
  active,
}: {
  status: LeadStatus;
  onClick?: () => void;
  active?: boolean;
}) {
  const dot = STATUS_DOT[status] || STATUS_DOT.NEW;

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-tight transition-all duration-150 select-none text-[#4B5264] bg-transparent
        ${onClick ? 'cursor-pointer hover:bg-[#F4F5F8] active:scale-[0.97]' : ''}
        ${active ? 'ring-2 ring-[#F0501E]/40 ring-offset-1 font-bold bg-[#FDEDE7]/40' : ''}`}
    >
      <span className={`w-[6px] h-[6px] rounded-full ${dot} flex-shrink-0`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
