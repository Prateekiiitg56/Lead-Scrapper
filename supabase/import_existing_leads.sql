-- Run this in Supabase SQL Editor to import your 3 existing leads from Google Sheets:

INSERT INTO leads (business_name, phone, address, status, last_contact_at)
VALUES 
  ('Namaste Rewa', '+917089815015', 'beside OLA Showroom', 'CONTACTED', '2026-08-05T09:34:22Z'),
  ('Shahi Darbar', '+919864834696', '1st Floor, SRCB Road Hotel D''River View, Ganpati Plaza, Police Outpost, behind Fancy Bazaar, Lakhtokia, Fancy Bazaar, Guwahati, Assam 781001, India', 'CONTACTED', '2026-08-05T11:58:04Z'),
  ('PEPA - The Ethnic', '+916900355505', 'PEPA The Ethnic', 'CONTACTED', '2026-08-05T12:47:55Z')
ON CONFLICT (phone) DO UPDATE SET 
  status = EXCLUDED.status,
  last_contact_at = EXCLUDED.last_contact_at;

-- Insert corresponding conversation records for each
INSERT INTO conversations (lead_id, direction, message, message_type, status, timestamp)
SELECT id, 'OUTBOUND', 'Template message sent', 'template', 'sent', last_contact_at
FROM leads
ON CONFLICT (wamid) DO NOTHING;
