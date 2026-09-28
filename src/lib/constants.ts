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

export interface EmailTemplateContext {
  businessName: string;
  address: string;
  website: string;
  senderName: string;
}

type EmailDraft = { subject: string; body: string };

/**
 * Cold email templates. Standard ones are filled in the browser so the user sees and can edit
 * the exact text before it is sent from their Gmail; the AI one is drafted by Gemini.
 */
export const EMAIL_TEMPLATES: readonly {
  id: 'ai_personalized_email' | 'website_pitch_email' | 'automation_pitch_email' | 'first_outreach_email';
  label: string;
  render?: (c: EmailTemplateContext) => EmailDraft;
}[] = [
  { id: 'ai_personalized_email', label: 'AI Personalized (Gemini)' },
  {
    id: 'website_pitch_email',
    label: 'Website Pitch (no site detected)',
    render: (c) => ({
      subject: `We can help ${c.businessName} get more customers online`,
      body: `Hi ${c.businessName || 'there'},

I came across your business${c.website ? ` at ${c.website}` : ''} and noticed there might be a great opportunity to grow your online presence.

We build modern, high-converting websites and AI-powered automations specifically for businesses like yours${c.address ? ` in ${c.address}` : ''}.

Here's what we typically help with:
• Professional website design that converts visitors into customers
• Automated lead capture & follow-up systems
• AI chatbots that handle customer inquiries 24/7

Would you be open to a quick 10-minute call this week to see if we could help?

Best regards,
${c.senderName}`,
    }),
  },
  {
    id: 'automation_pitch_email',
    label: 'Automation / AI Pitch',
    render: (c) => ({
      subject: `AI & Automation for ${c.businessName}`,
      body: `Hi ${c.businessName || 'there'},

I specialize in building custom AI automations for businesses${c.address ? ` like yours in ${c.address}` : ''}.

I wanted to reach out because I believe there's a real opportunity to save you time and increase revenue by automating repetitive tasks in your operations.

Some things I've recently helped similar businesses with:
• Automated appointment booking & reminders
• AI-powered customer support that runs 24/7
• Lead qualification workflows that run on autopilot
• Smart follow-up sequences that boost reply rates

Would you be interested in a quick chat to explore what's possible?

Best regards,
${c.senderName}`,
    }),
  },
  {
    id: 'first_outreach_email',
    label: 'General First Outreach',
    render: (c) => ({
      subject: `Quick question for ${c.businessName}`,
      body: `Hello ${c.businessName || 'there'},

I came across your business listing${c.address ? ` in ${c.address}` : ''} and wanted to reach out.

We help local businesses grow using modern digital tools — from professional websites to automated customer engagement systems.

I'd love to learn more about your business and see if there's a way we could help you attract more customers and save time on day-to-day operations.

Would you be open to a brief conversation?

Best regards,
${c.senderName}`,
    }),
  },
];
export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number]['id'];
