import { type ClassValue, clsx } from 'clsx';

/** Merge classnames (works with Tailwind) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format phone for display: +91 98765 43210 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  return phone;
}

/** Relative time: "2m ago", "3h ago", "Yesterday" */
export function timeAgo(date: string | Date | null): string {
  if (!date) return '';
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/** Truncate text to N chars */
export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

/** Escape HTML entities */
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Get n8n webhook URLs from environment or localStorage */
export function getWebhookUrls() {
  const stored = localStorage.getItem('unbias_crm_urls');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.search && parsed.send && parsed.stats) {
        return {
          search: parsed.search,
          send: parsed.send,
          stats: parsed.stats,
          email: parsed.email || import.meta.env.VITE_N8N_EMAIL_URL || '',
        };
      }
    } catch { /* ignore */ }
  }

  return {
    search: import.meta.env.VITE_N8N_SEARCH_URL || '',
    send: import.meta.env.VITE_N8N_SEND_URL || '',
    stats: import.meta.env.VITE_N8N_STATS_URL || '',
    email: import.meta.env.VITE_N8N_EMAIL_URL || '',
  };
}

/** Format number with K/M suffixes */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
