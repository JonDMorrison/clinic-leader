-- Seed the Employee Manual as the organization's first "Handbook" document
-- This uses a well-known ID for idempotency

DO $$
DECLARE
  v_admin_user_id uuid;
  v_manual_body text;
BEGIN
  -- Get the first admin/owner user as the creator
  SELECT id INTO v_admin_user_id 
  FROM users 
  WHERE role IN ('owner', 'director', 'manager') 
  ORDER BY created_at 
  LIMIT 1;
  
  -- Build the manual body as structured markdown
  v_manual_body := E'# Employee Manual\n\n' ||
    E'## 1. Phone & Appointment Protocols\n' ||
    E'Covers call etiquette, scheduling standards, and recall systems.\n\n' ||
    E'### Answering Phone Calls\n' ||
    E'Always greet, confirm name, relation to patient, and DOB. If cancelling, ask to reschedule and set a task.\n\n' ||
    E'### Appointments\n' ||
    E'Schedule 2–3x/week, 2–3 weeks out. Never let a patient leave unscheduled. Confirm late arrivals within 10 min. Walk-ins always welcome.\n\n' ||
    E'### Color Coding\n' ||
    E'Use correct appointment type/language for color consistency. RED = New Patients, BLUE = Follow-ups, PURPLE = Massage, etc.\n\n' ||
    E'### Recalls & Tasks\n' ||
    E'Set recalls for all active patients. Review daily. Use "Staff Follow Up" for pending items (no patient reminder).\n\n' ||
    E'## 2. Scheduling & Claims\n' ||
    E'Guidelines for scheduling under L&I, Self-insured, or MVA claims.\n\n' ||
    E'### Scheduling Questions\n' ||
    E'Ask about injury type, claim #, employer, DOI, and if attorney involved. Verify claim status before scheduling.\n\n' ||
    E'### Older or Out-of-State Claims\n' ||
    E'Verify open status; contact attorney/claim manager before scheduling. Use discretion for older claims.\n\n' ||
    E'### Insurance Rules\n' ||
    E'Blue Cross, Cigna, Premera, Lifewise = in-network. Aetna, Kaiser, UHC = out. Medicare primary unless patient employed.\n\n' ||
    E'### Auto Closures\n' ||
    E'Call claim manager to remove closure if patient is still in treatment. Never cancel scheduled visits until resolved.\n\n' ||
    E'## 3. Billing, Liens & Cash\n' ||
    E'Procedures for collecting, verifying, and documenting payments.\n\n' ||
    E'### Cash Needs Attorney\n' ||
    E'Flag any MVA with missing PIP info or unsigned lien. Notify provider immediately.\n\n' ||
    E'### Liens\n' ||
    E'Get signed lien, fax to attorney, and scan to chart. Only legal guardian signs if patient <16.\n\n' ||
    E'### Balances\n' ||
    E'Collect $25–$50 copay. If patient refuses, alert billing. Document every interaction.\n\n' ||
    E'### Availity Checks\n' ||
    E'Verify benefits online, print form, scan to chart, and record copay/visits remaining.\n\n' ||
    E'## 4. Front Desk & Daily Operations\n' ||
    E'Covers prep, open/close routines, and professionalism.\n\n' ||
    E'### Opening Duties\n' ||
    E'Disarm alarm, turn on lights, check voicemails, log into all systems (AdvMD, ZingIt, Teams, etc.).\n\n' ||
    E'### Closing Duties\n' ||
    E'Cross-check sign-ins, clean lobby, sanitize, lock up, arm alarm, print trial balance and receipts.\n\n' ||
    E'### Prepping Patients\n' ||
    E'Print next day''s schedule, confirm intakes, highlight balances, prep claims for follow-up.\n\n' ||
    E'### Professionalism\n' ||
    E'Dress appropriately, no food at front desk, phones away, handle patient interactions professionally.\n\n' ||
    E'## 5. Authorizations, Referrals & Imaging\n' ||
    E'Procedures for approvals and documentation.\n\n' ||
    E'### Authorizations\n' ||
    E'Always request and attach recent chart notes. CM has final approval. Track massage/chiro visit counts.\n\n' ||
    E'### Referrals\n' ||
    E'Outbound: attach cover, demo, auth, chart notes, imaging. Inbound: use AdvMD referral entry for visit tracking.\n\n' ||
    E'### Imaging\n' ||
    E'L&I and self-insured need no pre-auth for X-rays. MRI/CT require Qualis/Comagine requests.\n\n' ||
    E'### Comagine\n' ||
    E'Attach supporting documentation. Record reference # and body part for tracking.\n\n' ||
    E'## 6. Claims & Documentation\n' ||
    E'Guidelines for handling notes, faxes, and legal docs.\n\n' ||
    E'### Notes\n' ||
    E'Document every patient interaction. Include who, what, and why. Never edit others'' notes.\n\n' ||
    E'### Faxing\n' ||
    E'Use AdvMD fax for automatic cover letters. Include claim #, patient name, and provider.\n\n' ||
    E'### Chart Files\n' ||
    E'Scan and label clearly (IME Report, MRI, PT Note, etc.). Use EHR for provider-critical items only.\n\n' ||
    E'## 7. L&I & Time-Loss\n' ||
    E'Procedures for reopening claims and following up.\n\n' ||
    E'### Reopening\n' ||
    E'Collect closure reason/date, previous providers, fax reopening app with APF + chart notes.\n\n' ||
    E'### LNI Hotline\n' ||
    E'Use 360-902-5799 or PHL@LNI.WA.GOV to check claim status. Follow up on undetermined claims ASAP.\n\n' ||
    E'### Job Analysis & IME\n' ||
    E'Track completion, send chat to lead, notify patient of IME schedule and copy letter.\n\n' ||
    E'## 8. Miscellaneous Policies\n' ||
    E'Covers emergencies, cleaning, supplies, and chain of command.\n\n' ||
    E'### Cleaning\n' ||
    E'Sanitize daily; stock paper towels, wipes, coffee supplies. Notify office manager of shortages.\n\n' ||
    E'### Supplies\n' ||
    E'Email office manager weekly for restocks (K-cups, pens, etc.).\n\n' ||
    E'### Chain of Command\n' ||
    E'Report issues to lead → office manager. Maintain professional tone.\n\n';

  -- Insert the manual (idempotent via ON CONFLICT)
  INSERT INTO docs (
    id,
    title,
    kind,
    body,
    status,
    version,
    requires_ack,
    owner_id,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Employee Manual',
    'Handbook',
    v_manual_body,
    'approved',
    1,
    true,
    v_admin_user_id,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

END $$;

COMMENT ON TABLE docs IS 'Contains all organizational documents including the seeded Employee Manual';