-- Seed Recall Review SOP into docs table

DO $$
DECLARE
  v_admin_user_id uuid;
  v_sop_body text;
BEGIN
  -- Get the first admin/owner user as the creator
  SELECT id INTO v_admin_user_id 
  FROM users 
  WHERE role IN ('owner', 'director', 'manager') 
  ORDER BY created_at 
  LIMIT 1;
  
  -- Build the SOP body as structured markdown
  v_sop_body := E'# Recall Review SOP\n\n' ||
    E'## Purpose\n\n' ||
    E'Recalls ensure every active patient is either scheduled or has a dated follow-up task. Patients receive an automated reminder two days before the recall (for appointment recalls). Staff check the recall list daily and keep it current.\n\n' ||
    E'## Daily Checklist\n\n' ||
    E'1. Open Recalls list; filter **Past Due** first.\n' ||
    E'2. For each patient: call → if no answer, leave voicemail and add note.\n' ||
    E'3. If reached: book the appointment immediately OR note reason and set a new recall date.\n' ||
    E'4. If "Staff Follow Up": review case with provider/lead as needed; document status; call if required.\n' ||
    E'5. As patients leave visits: always book next appointment or set a recall unless being released.\n' ||
    E'6. If cancel/no-show and can\'t reschedule on the spot: add next-day recall immediately.\n' ||
    E'7. Enter all new appointments in the schedule immediately; no mental notes.\n' ||
    E'8. Patients waiting on MRI/IME/claim decisions still need a **Staff Follow Up** recall.\n\n' ||
    E'## Recall Types\n\n' ||
    E'**Appointment Recalls:** Patient will receive automated reminder text 2 days before due date. Used when patient needs to book their next visit.\n\n' ||
    E'**Staff Follow Up:** Internal reminder only - patient receives no notification. Use for cases requiring internal review (claim status, imaging pending, provider consultation needed, etc.).\n\n' ||
    E'## Status Management\n\n' ||
    E'- **Open:** Active recall requiring action\n' ||
    E'- **Completed:** Patient contacted and appointment booked or case resolved\n' ||
    E'- **Deferred:** Patient requested later follow-up; new recall date set\n' ||
    E'- **Unable to Contact:** Multiple attempts made, left voicemail, no response\n\n' ||
    E'## Printing & Reports\n\n' ||
    E'Front desk may print the daily list via Reports → Appointments → Recall Visits (optional for paper workflow).\n\n' ||
    E'## Red Flag Report\n\n' ||
    E'A manager/back office reviews exceptions to catch patients missing from the recall system or needing status changes. Provide feedback to front desk as needed.\n\n' ||
    E'## Key Rules\n\n' ||
    E'- EVERY active patient must have either an appointment OR a recall at all times\n' ||
    E'- Check past due recalls FIRST every morning\n' ||
    E'- Never let a patient leave without scheduling next visit or setting a recall\n' ||
    E'- If unable to reschedule a cancellation immediately, add next-day recall\n' ||
    E'- Staff Follow Up recalls don\'t send patient reminders but still require daily review\n' ||
    E'- Document every call attempt, voicemail, and conversation in notes\n\n' ||
    E'## Related Documents\n\n' ||
    E'- Front Desk Training Guide\n' ||
    E'- Scheduling Protocols\n' ||
    E'- Phone & Appointment Protocols';

  -- Insert the SOP (idempotent via ON CONFLICT)
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
    '00000000-0000-0000-0000-000000000002'::uuid, -- well-known ID for Recall Review SOP
    'Recall Review',
    'SOP',
    v_sop_body,
    'approved',
    1,
    true, -- require acknowledgment
    v_admin_user_id,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    body = EXCLUDED.body,
    updated_at = now();

END $$;