// Local stand-in for the n8n Job Signals webhooks, for testing the UI before the real workflows exist.
// Run: node scripts/mock-job-webhooks.mjs
// Then in .env.local:
//   VITE_N8N_JOBS_URL=http://localhost:8787/jobs
//   VITE_N8N_PEOPLE_URL=http://localhost:8787/people
import { createServer } from 'node:http';

const PORT = 8787;

const JOBS = [
  {
    id: 'mock-1',
    title: 'CRM Automation Specialist',
    company: { name: 'Acme Growth Ltd', industry: 'Marketing Services', location: 'London, UK', website: 'acmegrowth.example', linkedin_url: '' },
    location: 'London, UK',
    description: 'Build Zapier and n8n workflows, own our HubSpot CRM, and manage API integrations.',
    url: 'https://example.com/jobs/1',
    posted_at: '2 days ago',
    source: 'Adzuna',
  },
  {
    id: 'mock-2',
    title: 'Marketing Operations Manager',
    company: { name: 'Northwind Retail', industry: 'E-commerce', location: 'Manchester, UK', website: 'northwind.example' },
    location: 'Manchester, UK',
    description: 'Own our CRM and email workflows across the funnel.',
    url: 'https://example.com/jobs/2',
    posted_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
  {
    id: 'mock-3',
    title: 'Office Administrator',
    company: 'Brightside Dental',
    location: 'Leeds, UK',
    description: 'Front desk, scheduling and filing.',
    url: 'https://example.com/jobs/3',
    posted_at: '3 weeks ago',
  },
  {
    id: 'mock-4',
    title: 'RevOps Analyst',
    company: { name: 'Acme Growth Ltd' },
    location: 'Remote, UK',
    description: 'Salesforce reporting and workflow automation.',
    url: 'https://example.com/jobs/4',
    posted_at: 'today',
  },
];

const PEOPLE = [
  { name: 'Jane Carter', title: 'Founder & CEO', role: 'Founder/CEO', linkedin_url: 'https://www.linkedin.com/in/example-jane', source: 'LinkedIn, Companies House', source_url: 'https://find-and-update.company-information.service.gov.uk/' },
  { name: 'Tom Reyes', title: 'Chief Operating Officer', role: 'COO', linkedin_url: '', email: 'tom@acmegrowth.example', source: 'Company website', source_url: 'https://acmegrowth.example/team' },
  { name: 'Priya Shah', title: 'Head of Growth', role: 'Head of Growth', linkedin_url: 'https://www.linkedin.com/in/example-priya' },
  { name: 'Sam Lee', title: 'Talent Partner', role: 'Recruiter', linkedin_url: '' },
];

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    console.log(req.method, req.url, body);
    if (req.url === '/jobs') return setTimeout(() => send(res, 200, { success: true, jobs: JOBS, dropped: { agency: 2, scam: 1, stale: 3 }, warnings: [] }), 1500);
    if (req.url === '/people') {
      const roles = body.roles ?? [];
      return setTimeout(() => send(res, 200, { success: true, people: PEOPLE.filter((p) => roles.includes(p.role)), company: { website: 'https://acmegrowth.example', email: 'hello@acmegrowth.example' }, warnings: [] }), 1000);
    }
    send(res, 404, { success: false, message: 'Unknown mock route' });
  });
}).listen(PORT, () => console.log(`Mock Job Signals webhooks on http://localhost:${PORT}`));
