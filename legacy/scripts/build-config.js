/**
 * Build script — runs at deploy time on Vercel.
 * Reads SEARCH_URL, SEND_URL, STATS_URL from environment variables
 * and writes config.js so the frontend can use them at runtime.
 */
const fs = require('fs');
const path = require('path');

const searchUrl = process.env.SEARCH_URL || '';
const sendUrl   = process.env.SEND_URL   || '';
const statsUrl  = process.env.STATS_URL  || '';

if (!searchUrl || !sendUrl || !statsUrl) {
  console.warn('⚠  Missing one or more webhook env vars (SEARCH_URL, SEND_URL, STATS_URL).');
  console.warn('   config.js will be generated with empty values.');
}

const config = `/**
 * Auto-generated at build time — do not edit manually.
 */
window.__CONFIG__ = {
  SEARCH_URL: ${JSON.stringify(searchUrl)},
  SEND_URL:   ${JSON.stringify(sendUrl)},
  STATS_URL:  ${JSON.stringify(statsUrl)}
};
`;

const outPath = path.join(__dirname, '..', 'config.js');
fs.writeFileSync(outPath, config, 'utf8');
console.log('✓  config.js generated from environment variables.');
