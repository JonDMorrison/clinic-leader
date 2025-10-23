-- Recall Review Support Tables

-- Create recalls table (no PHI, only hashed patient identifiers)
CREATE TABLE IF NOT EXISTS recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_hash text NOT NULL,
  due_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('Appointment','Staff Follow Up')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Completed','Deferred','Unable to Contact')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recall_actions log table
CREATE TABLE IF NOT EXISTS recall_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  recall_id uuid REFERENCES recalls(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('Called','Left Voicemail','Booked','Deferred','NoteAdded')),
  actor_id uuid REFERENCES users(id),
  details text,
  created_at timestamptz DEFAULT now()
);

-- Create metrics view
CREATE OR REPLACE VIEW v_recall_metrics AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status='Open' AND due_date < CURRENT_DATE) as past_due,
  COUNT(*) FILTER (WHERE status='Open' AND due_date = CURRENT_DATE) as due_today,
  COUNT(*) FILTER (WHERE status='Open' AND due_date > CURRENT_DATE) as upcoming,
  COUNT(*) as total_open
FROM recalls
WHERE status = 'Open'
GROUP BY organization_id;

-- Add updated_at trigger for recalls
CREATE TRIGGER update_recalls_updated_at
  BEFORE UPDATE ON recalls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for recalls
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all recalls"
  ON recalls FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Staff can read team recalls"
  ON recalls FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Managers can manage team recalls"
  ON recalls FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

-- RLS Policies for recall_actions
ALTER TABLE recall_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all recall_actions"
  ON recall_actions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Staff can read team recall_actions"
  ON recall_actions FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Staff can create recall_actions"
  ON recall_actions FOR INSERT
  WITH CHECK (is_same_team(organization_id));

-- Add indexes for performance
CREATE INDEX idx_recalls_org_status ON recalls(organization_id, status);
CREATE INDEX idx_recalls_due_date ON recalls(due_date);
CREATE INDEX idx_recall_actions_recall ON recall_actions(recall_id);
CREATE INDEX idx_recall_actions_org ON recall_actions(organization_id);