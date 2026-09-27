// ─── Lead status values ───
export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'REPLIED',
  'INTERESTED',
  'FOLLOW_UP',
  'MEETING_BOOKED',
  'CLIENT',
  'LOST',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  REPLIED: 'Replied',
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow Up',
  MEETING_BOOKED: 'Meeting Booked',
  CLIENT: 'Client',
  LOST: 'Lost',
};

// ─── Business type presets ───
export const BUSINESS_TYPES = [
  'Restaurant',
  'Hair salon',
  'Dentist',
  'Gym',
  'Bakery',
  'Real Estate',
  'Photography',
  'Plumber',
  'Electrician',
  'Car Wash',
  'IT / Software Company',
  'Marketing Agency',
  'Web Design Agency',
  'Automation / AI Consultancy',
  'SaaS Startup',
  'Freelance Developer',
  'Digital Marketing Consultant',
  'Other',
] as const;

export const EMAIL_TEMPLATES = [
  { id: 'ai_personalized_email', label: 'AI Personalized (Gemini)' },
  { id: 'website_pitch_email', label: 'Website Pitch (no site detected)' },
  { id: 'automation_pitch_email', label: 'Automation / AI Pitch' },
  { id: 'first_outreach_email', label: 'General First Outreach' },
] as const;
export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number]['id'];
