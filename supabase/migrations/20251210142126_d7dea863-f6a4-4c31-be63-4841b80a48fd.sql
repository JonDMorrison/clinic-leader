-- Add seat hierarchy columns if they don't exist
ALTER TABLE seats ADD COLUMN IF NOT EXISTS reports_to_seat_id UUID REFERENCES seats(id);
ALTER TABLE seats ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Create index for faster hierarchy queries
CREATE INDEX IF NOT EXISTS idx_seats_reports_to ON seats(reports_to_seat_id);
CREATE INDEX IF NOT EXISTS idx_seats_department ON seats(department_id);

-- Add comment for documentation
COMMENT ON COLUMN seats.reports_to_seat_id IS 'Reference to parent seat in org chart hierarchy';
COMMENT ON COLUMN seats.department_id IS 'Department this seat belongs to';