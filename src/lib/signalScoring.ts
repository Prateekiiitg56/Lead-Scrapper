import type { SignalLevel } from '@/types/database';

/** Keywords that show a company is investing in automation / CRM operations. */
export const SIGNAL_KEYWORDS = [
  'automation',
  'automate',
  'CRM',
  'Zapier',
  'Make.com',
  'n8n',
  'workflow',
  'HubSpot',
  'Salesforce',
  'Pipedrive',
  'GoHighLevel',
  'Airtable',
  'integration',
  'RevOps',
  'Revenue Operations',
  'Marketing Operations',
  'lead generation',
  'no-code',
  'low-code',
  'API',
] as const;

/** A title hit counts double: the role itself is about the keyword, not a passing mention. */
const TITLE_WEIGHT = 2;
const DESCRIPTION_WEIGHT = 1;
export const HIGH_THRESHOLD = 5;
export const MEDIUM_THRESHOLD = 2;

export interface SignalScore {
  level: SignalLevel;
  score: number;
  /** Human-readable matches, e.g. `"Zapier" in title`. */
  reasons: string[];
}

function keywordPattern(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]+');
  // Whole-word match; a trailing plural "s" still counts ("workflows", "integrations").
  return new RegExp(`(^|[^a-z0-9])${escaped}s?($|[^a-z0-9])`, 'i');
}

const PATTERNS = SIGNAL_KEYWORDS.map((keyword) => ({ keyword, re: keywordPattern(keyword) }));

/** Count keyword matches in a job title and description. Pure and client-side; no AI call. */
export function scoreJob(title: string, description: string | null | undefined): SignalScore {
  let score = 0;
  const reasons: string[] = [];
  for (const { keyword, re } of PATTERNS) {
    if (re.test(title)) {
      score += TITLE_WEIGHT;
      reasons.push(`"${keyword}" in title`);
    } else if (description && re.test(description)) {
      score += DESCRIPTION_WEIGHT;
      reasons.push(`"${keyword}" in description`);
    }
  }
  const level: SignalLevel = score >= HIGH_THRESHOLD ? 'HIGH' : score >= MEDIUM_THRESHOLD ? 'MEDIUM' : 'LOW';
  return { level, score, reasons };
}
