import { getWebhookUrls } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { isOutreachAuthorized } from '@/services/permissionService';
import type { SearchResponse, SendResponse, SendEmailResponse, StatsResponse } from '@/types/api';
import type { EmailTemplateId } from '@/lib/constants';

const META_PHONE_NUMBER_ID = import.meta.env.VITE_META_PHONE_NUMBER_ID || '';
const META_ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/** Call the existing n8n lead search webhook */
export async function searchLeads(
  businessType: string,
  businessTypeOther: string,
  location: string
): Promise<SearchResponse> {
  const urls = getWebhookUrls();
  if (!urls.search) throw new Error('Search webhook URL not configured');

  try {
    const res = await fetch(urls.search, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_type: businessType,
        business_type_other: businessTypeOther,
        location,
      }),
    });

    if (!res.ok) {
      const err = new Error(`Search failed with status ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }
    return res.json();
  } catch (err) {
    if (typeof window !== 'undefined' && (window as any).__REPORT_API_ERROR__) {
      (window as any).__REPORT_API_ERROR__(err);
    }
    throw err;
  }
}

/** Call the n8n send message webhook AND sync lead to Supabase */
export async function sendWhatsAppMessage(
  name: string,
  phone: string,
  address: string,
  website?: string,
  templateName?: string,
  userEmail?: string | null,
  userId?: string
): Promise<SendResponse> {
  // Enforce admin permission check to prevent unauthorized Meta messaging fees
  if (!isOutreachAuthorized(userEmail)) {
    throw new Error('PERMISSION_RESTRICTED: WhatsApp outreach is restricted to authorized admin accounts.');
  }

  const urls = getWebhookUrls();
  if (!urls.send) throw new Error('Send webhook URL not configured');

  const selectedTemplate = templateName || (website ? 'website_automation_pitch_v2' : 'first_outreach');

  // 1. Call n8n Webhook to dispatch WhatsApp template
  const res = await fetch(urls.send, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      phone,
      address,
      website: website || '',
      template_name: selectedTemplate,
    }),
  });

  if (!res.ok) throw new Error(`Send failed: ${res.status}`);
  const data: SendResponse = await res.json();

  if (data.success === false) {
    throw new Error(data.message || 'WhatsApp message dispatch failed');
  }

  // 2. Client-side fallback sync: Save lead & conversation to Supabase directly
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    // Upsert lead in Supabase
    const { data: leadData, error: leadErr } = await supabase
      .from('leads')
      .upsert(
        {
          business_name: name,
          phone: formattedPhone,
          address: address,
          website: website || null,
          status: 'CONTACTED',
          last_contact_at: new Date().toISOString(),
          ...(userId ? { assigned_user_id: userId } : {}),
        },
        { onConflict: 'phone' }
      )
      .select('id')
      .single();

    if (leadErr) {
      console.error('Supabase lead upsert error:', leadErr);
    }

    if (leadData?.id) {
      // Save conversation record in Supabase
      const { error: convErr } = await supabase.from('conversations').insert({
        lead_id: leadData.id,
        direction: 'OUTBOUND',
        message: selectedTemplate === 'website_automation_pitch_v2' ? 'Website Automation template sent' : 'Template message sent',
        message_type: 'template',
        template_name: selectedTemplate,
        status: 'sent',
      });
      if (convErr) {
        console.error('Supabase conversation insert error:', convErr);
      }
    }
  } catch (err) {
    console.error('Client-side Supabase sync error:', err);
  }

  return data;
}

/** Send custom freeform text message directly to recipient via Meta WhatsApp Cloud API */
export async function sendCustomWhatsAppText(phone: string, text: string, userEmail?: string | null): Promise<boolean> {
  if (!isOutreachAuthorized(userEmail)) {
    console.error('Outreach restricted: user is not authorized to send Meta WhatsApp messages.');
    return false;
  }

  try {
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const formattedTo = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

    const res = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Meta Cloud API text message error:', errData);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to dispatch custom WhatsApp text:', err);
    return false;
  }
}

/** Send custom freeform WhatsApp text message AND sync to Supabase ONLY AFTER Meta confirms success */
export async function sendCustomWhatsAppMessageAndSync(
  name: string,
  phone: string,
  address: string,
  text: string,
  website?: string,
  userId?: string
): Promise<SendResponse> {
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  const formattedTo = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

  // 1. Dispatch custom text to Meta Cloud API first
  const res = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg =
      errData.error?.message ||
      errData.error?.error_data?.details ||
      `Meta API request failed with status ${res.status}`;
    throw new Error(errMsg);
  }

  // 2. Meta confirmed success -> ONLY NOW upsert lead and save conversation to Supabase
  const formattedPhone = phone.startsWith('+') ? phone : `+${digitsOnly}`;

  const { data: leadData, error: leadErr } = await supabase
    .from('leads')
    .upsert(
      {
        business_name: name,
        phone: formattedPhone,
        address: address,
        website: website || null,
        status: 'CONTACTED',
        last_contact_at: new Date().toISOString(),
        ...(userId ? { assigned_user_id: userId } : {}),
      },
      { onConflict: 'phone' }
    )
    .select('id')
    .single();

  if (leadErr) {
    console.error('Supabase lead upsert error:', leadErr);
  }

  if (leadData?.id) {
    const { error: convErr } = await supabase.from('conversations').insert({
      lead_id: leadData.id,
      direction: 'OUTBOUND',
      message: text,
      message_type: 'text',
      status: 'sent',
    });
    if (convErr) {
      console.error('Supabase conversation insert error:', convErr);
    }
  }

  return { success: true, message: 'Custom WhatsApp message sent successfully' };
}

/** Generate a personalized cold email using Gemini AI */
export async function generateAIEmail(opts: {
  businessName: string;
  businessType: string;
  address: string;
  website?: string;
  rating?: string;
}): Promise<{ subject: string; body: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
  }

  const cleanAddress = opts.address ? opts.address.replace(/[\r\n]+/g, ' ').trim() : '';
  const cleanWebsite = opts.website ? opts.website.replace(/[\r\n]+/g, '').trim() : '';

  const prompt = `You are a top-tier B2B outreach specialist writing a cold email for Unbias.xai (a web design & AI automation agency).

TARGET BUSINESS:
- Name: ${opts.businessName}
- Industry / Category: ${opts.businessType}
- Location: ${cleanAddress || 'N/A'}
- Website: ${cleanWebsite || 'No website detected'}

GUIDELINES:
1. Start directly with a natural greeting: "Hi ${opts.businessName} Team,".
2. Open with a warm, genuine 1-sentence compliment about their reputation in ${cleanAddress || 'their area'}. Do NOT quote raw rating numbers.
3. Mention 2 specific, high-value growth opportunities tailored to a ${opts.businessType} (e.g. if restaurant: 24/7 AI table reservation assistant & VIP guest engagement automation; if salon/clinic: 24/7 appointment booking bot & review automation; if gym: membership lead capture).
4. Sound completely natural, professional, direct, and human.
5. ABSOLUTELY NO markdown formatting, NO asterisks (**), NO labels (like Pain Point:, Subject:, Type:), NO bullet points with markdown.
6. Keep it concise (under 120 words across 3 short paragraphs).
7. End with a friendly 1-sentence invite for a brief 10-minute call.
8. Sign off as:
Best regards,
Unbias.xai Team`;

  const subjectPrompt = `Write a short, professional email subject line (3 to 6 words) for a cold email to "${opts.businessName}". Return ONLY the plain subject line text. ABSOLUTELY NO quotation marks, NO labels, NO prefixes like "Subject:".`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const [bodyRes, subjectRes] = await Promise.all([
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
      }),
    }),
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: subjectPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 100 },
      }),
    }),
  ]);

  if (!bodyRes.ok) {
    const errText = await bodyRes.text().catch(() => '');
    if (bodyRes.status === 429 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
      throw new Error('Gemini API rate limit / quota reached. Please wait a moment or select a standard email template.');
    }
    if (bodyRes.status === 401 || errText.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || errText.includes('UNAUTHENTICATED')) {
      throw new Error('Invalid Gemini API Key format. In Google AI Studio (aistudio.google.com/apikey), click "Create API key in NEW project" to get a valid AI Studio key (starts with AIzaSy...).');
    }
    throw new Error(`Gemini API error (${bodyRes.status}): ${errText.slice(0, 200)}`);
  }

  const bodyJson = await bodyRes.json();
  const subjectJson = subjectRes.ok ? await subjectRes.json() : null;

  const body = bodyJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  const subject = subjectJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    || `Quick question for ${opts.businessName}`;

  if (!body) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }

  return { subject, body };
}

/** Send cold email via n8n email webhook AND sync lead to Supabase */
export async function sendColdEmail(
  name: string,
  email: string,
  address: string,
  website?: string,
  templateId?: EmailTemplateId,
  userEmail?: string | null,
  userId?: string,
  customSubject?: string,
  customBody?: string,
  businessType?: string
): Promise<SendEmailResponse> {
  if (!email || !email.trim()) {
    throw new Error('Email address is required to send a cold email.');
  }

  const urls = getWebhookUrls();
  if (!urls.email) throw new Error('Email webhook URL not configured');

  const selectedTemplate = templateId || 'first_outreach_email';

  // 1. Call n8n email webhook
  const res = await fetch(urls.email, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_email: email.trim(),
      from_email: userEmail || '',
      business_name: name,
      address,
      website: website || '',
      template_id: selectedTemplate,
      subject: customSubject || '',
      custom_body: customBody || '',
      business_type: businessType || '',
    }),
  });

  if (!res.ok) throw new Error(`Email send failed: ${res.status}`);
  const data: SendEmailResponse = await res.json();

  if (data.success === false) {
    throw new Error(data.message || 'Email dispatch failed');
  }

  // 2. Client-side Supabase sync: upsert lead & insert conversation (mirrors sendWhatsAppMessage)
  try {
    const { data: leadData, error: leadErr } = await supabase
      .from('leads')
      .upsert(
        {
          business_name: name,
          email: email.trim(),
          address: address,
          website: website || null,
          status: 'CONTACTED',
          last_contact_at: new Date().toISOString(),
          ...(userId ? { assigned_user_id: userId } : {}),
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (leadErr) {
      console.error('Supabase lead upsert (email) error:', leadErr);
    }

    if (leadData?.id) {
      const { error: convErr } = await supabase.from('conversations').insert({
        lead_id: leadData.id,
        direction: 'OUTBOUND',
        message: customBody || `Email template sent: ${selectedTemplate}`,
        message_type: 'email',
        template_name: selectedTemplate,
        status: 'sent',
      });
      if (convErr) {
        console.error('Supabase conversation insert (email) error:', convErr);
      }
    }
  } catch (err) {
    console.error('Client-side Supabase sync error (email):', err);
  }

  return data;
}

/** Call the existing n8n stats webhook */
export async function fetchStats(): Promise<StatsResponse> {
  const urls = getWebhookUrls();
  if (!urls.stats) throw new Error('Stats webhook URL not configured');

  const res = await fetch(urls.stats);
  if (!res.ok) throw new Error(`Stats failed: ${res.status}`);
  return res.json();
}
