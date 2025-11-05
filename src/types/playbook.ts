export interface Playbook {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string | null;
  filename: string;
  file_url: string | null;
  parsed_text: string | null;
  parsed_steps: any; // Can be PlaybookStep[] or null, but comes from DB as Json type
  version: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookStep {
  order: number;
  text: string;
  note?: string;
}

export const PLAYBOOK_CATEGORIES = [
  'HR',
  'Front Desk',
  'Clinical',
  'Billing',
  'Compliance',
  'Safety',
  'Equipment',
  'Other'
] as const;

export type PlaybookCategory = typeof PLAYBOOK_CATEGORIES[number];
