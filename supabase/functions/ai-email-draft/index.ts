// Drafts a personalized cold email with Gemini. The API key stays server-side.
import { assertOutreachAllowed, authenticate, HttpError, json, requireEnv, serve } from '../_shared/http.ts';

/** Collapse whitespace and cap length so user-supplied fields cannot reshape the prompt. */
function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);

async function generate(prompt: string, maxOutputTokens: number): Promise<string> {
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens, thinkingConfig: { thinkingLevel: 'low' } },
  });
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': requireEnv('GEMINI_API_KEY') };

  let lastStatus = 0;
  let lastDetail = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.log(`gemini retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    const res = await fetch(url, { method: 'POST', headers, body: payload });

    if (res.ok) {
      const data = await res.json();
      return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    }

    lastStatus = res.status;
    lastDetail = await res.text().catch(() => '');
    console.error(`gemini error (attempt ${attempt + 1})`, lastStatus, lastDetail.slice(0, 500));

    // Non-retryable errors → bail immediately
    if (!RETRYABLE_STATUSES.has(lastStatus)) break;
  }

  if (lastStatus === 402) throw new HttpError(402, 'AI drafting is unavailable: the Gemini API key has no billing or credits left. Use a standard template.');
  if (lastStatus === 429) throw new HttpError(429, 'AI drafting is rate-limited right now. Wait a minute or use a standard template.');
  throw new HttpError(502, `AI drafting failed (Gemini HTTP ${lastStatus}). Retried ${MAX_RETRIES} times.`);
}

serve(async (req) => {
  const { user } = await authenticate(req);
  // Drafts feed the admin-only email send and spend the Gemini quota.
  assertOutreachAllowed(user);

  const body = await req.json().catch(() => null);
  const businessName = clean(body?.businessName, 200);
  const businessType = clean(body?.businessType, 100) || 'local business';
  const address = clean(body?.address, 300);
  const website = clean(body?.website, 300);
  if (!businessName) throw new HttpError(400, 'businessName is required.');

  const prompt = `You are a top-tier B2B outreach specialist writing a cold email for Unbias.xai (a web design & AI automation agency).

TARGET BUSINESS:
- Name: ${businessName}
- Industry / Category: ${businessType}
- Location: ${address || 'N/A'}
- Website: ${website || 'No website detected'}

GUIDELINES:
1. Start directly with a natural greeting: "Hi ${businessName} Team,".
2. Open with a warm, genuine 1-sentence compliment about their reputation in ${address || 'their area'}. Do NOT quote raw rating numbers.
3. Mention 2 specific, high-value growth opportunities tailored to a ${businessType}.
4. Sound natural, professional, direct, and human.
5. NO markdown, NO asterisks, NO labels (like "Subject:"), NO bullet points.
6. Under 120 words across 3 short paragraphs.
7. End with a friendly 1-sentence invite for a brief 10-minute call.
8. Sign off as:
Best regards,
Unbias.xai Team`;

  const subjectPrompt = `Write a short, professional email subject line (3 to 6 words) for a cold email to "${businessName}". Return ONLY the subject text, with no quotes, labels or prefixes.`;

  const [draft, subject] = await Promise.all([generate(prompt, 1200), generate(subjectPrompt, 100).catch(() => '')]);
  if (!draft) throw new HttpError(502, 'AI returned an empty draft. Try again.');

  return json({ subject: subject.replace(/^["']|["']$/g, '') || `Quick question for ${businessName}`, body: draft });
});
