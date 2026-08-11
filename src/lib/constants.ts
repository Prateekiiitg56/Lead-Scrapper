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

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
  NEW:            { bg: 'bg-slate-500/10',   text: 'text-slate-400',  dot: 'bg-slate-400' },
  CONTACTED:      { bg: 'bg-blue-500/10',    text: 'text-blue-400',   dot: 'bg-blue-400' },
  REPLIED:        { bg: 'bg-amber-500/10',   text: 'text-amber-400',  dot: 'bg-amber-400' },
  INTERESTED:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400',dot: 'bg-emerald-400' },
  FOLLOW_UP:      { bg: 'bg-orange-500/10',  text: 'text-orange-400', dot: 'bg-orange-400' },
  MEETING_BOOKED: { bg: 'bg-purple-500/10',  text: 'text-purple-400', dot: 'bg-purple-400' },
  CLIENT:         { bg: 'bg-green-500/10',   text: 'text-green-400',  dot: 'bg-green-400' },
  LOST:           { bg: 'bg-red-500/10',     text: 'text-red-400',    dot: 'bg-red-400' },
};

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

// ─── Message directions ───
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageType = 'text' | 'template' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'reaction';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

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

// ─── Outreach channels ───
export const OUTREACH_CHANNELS = ['whatsapp', 'email', 'linkedin'] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export const EMAIL_TEMPLATES = [
  { id: 'ai_personalized_email', label: 'AI Personalized (Gemini)' },
  { id: 'website_pitch_email', label: 'Website Pitch (no site detected)' },
  { id: 'automation_pitch_email', label: 'Automation / AI Pitch' },
  { id: 'first_outreach_email', label: 'General First Outreach' },
] as const;
export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number]['id'];
