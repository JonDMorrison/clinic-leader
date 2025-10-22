export interface Branding {
  id: string;
  organization_id: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  favicon_url: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  organization_id: string | null;
  plan: 'Basic' | 'Pro' | 'Enterprise';
  active: boolean;
  renewal_date: string | null;
  users_limit: number;
  ai_calls_limit: number;
  created_at: string;
  updated_at: string;
}

export interface BrandingUpdate {
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  favicon_url?: string | null;
  subdomain?: string | null;
  custom_domain?: string | null;
}
