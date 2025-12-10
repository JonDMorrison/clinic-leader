-- Phase 1: Add org chart hierarchy columns to seats table
ALTER TABLE seats ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES seats(id) ON DELETE SET NULL;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_seats_reports_to ON seats(reports_to);
CREATE INDEX IF NOT EXISTS idx_seats_department_id ON seats(department_id);