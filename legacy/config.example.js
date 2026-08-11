/**
 * Runtime configuration template.
 * Copy this file to config.js and replace the placeholder URLs with your own.
 *
 *   cp config.example.js config.js
 *
 * config.js is gitignored — your secrets stay local.
 */
window.__CONFIG__ = {
  SEARCH_URL: "https://YOUR-DOMAIN/webhook/unbias-lead-search",
  SEND_URL:   "https://YOUR-DOMAIN/webhook/unbias-send-message",
  STATS_URL:  "https://YOUR-DOMAIN/webhook/unbias-lead-stats"
};
