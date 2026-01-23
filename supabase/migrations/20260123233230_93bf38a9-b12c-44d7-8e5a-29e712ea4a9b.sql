-- Drop the old check constraint
ALTER TABLE public.meeting_items DROP CONSTRAINT IF EXISTS meeting_items_section_check;

-- Add new check constraint with all valid sections from L10, Quarterly, and Annual meetings
ALTER TABLE public.meeting_items ADD CONSTRAINT meeting_items_section_check 
CHECK (section = ANY (ARRAY[
  -- L10 sections
  'segue'::text, 
  'scorecard'::text, 
  'rocks'::text, 
  'headlines'::text, 
  'issues'::text, 
  'todo'::text, 
  'conclusion'::text,
  -- Quarterly sections  
  'checkin'::text,
  'prev_rocks'::text,
  'scorecard_trends'::text,
  'recurring_issues'::text,
  'next_rocks'::text,
  'priority_issues'::text,
  'cascade'::text,
  -- Annual sections
  'expectations'::text,
  'vto_review'::text,
  'core_values'::text,
  'pictures'::text,
  'strategic_issues'::text,
  'leadership'::text,
  'commitments'::text,
  -- General
  'custom'::text
]));