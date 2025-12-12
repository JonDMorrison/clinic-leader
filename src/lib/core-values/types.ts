export interface CoreValue {
  id: string;
  organization_id: string;
  title: string;
  short_behavior: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CoreValueSpotlight {
  id: string;
  organization_id: string;
  current_core_value_id: string | null;
  rotation_mode: string;
  rotates_on_weekday: number;
  last_rotated_at: string | null;
  created_at: string;
}

export interface CoreValueShoutout {
  id: string;
  organization_id: string;
  meeting_id: string | null;
  created_by: string | null;
  recognized_user_id: string | null;
  core_value_id: string | null;
  note: string | null;
  created_at: string;
  // Joined fields
  recognized_user?: { full_name: string } | null;
  created_by_user?: { full_name: string } | null;
  core_value?: { title: string } | null;
}

export interface CoreValuesAck {
  id: string;
  organization_id: string;
  user_id: string;
  acknowledged_at: string | null;
  version_hash: string | null;
}
