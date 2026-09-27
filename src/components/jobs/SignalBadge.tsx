import type { SignalLevel } from '@/types/database';

const LEVEL_CLASS: Record<SignalLevel, string> = {
  HIGH: 'badge-target',
  MEDIUM: 'badge-rating',
  LOW: 'badge-has-website',
};

/** HIGH / MEDIUM / LOW hiring-intent label from the keyword score. */
export function SignalBadge({ level, score }: { level: SignalLevel; score?: number }) {
  return (
    <span className={`${LEVEL_CLASS[level]} !px-2.5 !py-0.5 !text-[11px] font-bold whitespace-nowrap`} title={score != null ? `Keyword score ${score}` : undefined}>
      {level}
      <span className="sr-only"> intent signal</span>
    </span>
  );
}
