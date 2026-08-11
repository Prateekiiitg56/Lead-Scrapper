/**
 * Service to manage WhatsApp Outreach Dispatch Permissions & Admin Authorization
 * Protects against unauthorized Meta Cloud API charges.
 * Dispatch is restricted to approved admin accounts configured via environment variables.
 */

const envAdminEmails = import.meta.env.VITE_AUTHORIZED_ADMIN_EMAILS
  ? import.meta.env.VITE_AUTHORIZED_ADMIN_EMAILS.split(',').map((e: string) => e.trim().toLowerCase())
  : [];

const envSingleAdmin = import.meta.env.VITE_ADMIN_EMAIL
  ? [import.meta.env.VITE_ADMIN_EMAIL.trim().toLowerCase()]
  : [];

export const AUTHORIZED_ADMIN_EMAILS = Array.from(
  new Set([...envAdminEmails, ...envSingleAdmin].filter(Boolean))
);

/** Check if current user is an authorized admin to dispatch WhatsApp messages */
export function isOutreachAuthorized(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  // If no admin emails configured in env, allow all authenticated users by default
  if (AUTHORIZED_ADMIN_EMAILS.length === 0) return true;
  return AUTHORIZED_ADMIN_EMAILS.includes(userEmail.toLowerCase());
}
