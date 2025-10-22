-- Create branding table
CREATE TABLE public.branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '215 50% 50%',
  secondary_color TEXT DEFAULT '215 25% 96%',
  accent_color TEXT DEFAULT '215 50% 95%',
  font_family TEXT DEFAULT 'Inter',
  favicon_url TEXT,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create licenses table
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'Basic' CHECK (plan IN ('Basic', 'Pro', 'Enterprise')),
  active BOOLEAN NOT NULL DEFAULT true,
  renewal_date DATE,
  users_limit INTEGER DEFAULT 10,
  ai_calls_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branding
CREATE POLICY "Anyone can read branding for domain resolution"
  ON public.branding FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage their org branding"
  ON public.branding FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

-- RLS Policies for licenses
CREATE POLICY "Admins can read their org license"
  ON public.licenses FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "System can manage licenses"
  ON public.licenses FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_branding_updated_at
  BEFORE UPDATE ON public.branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_branding_subdomain ON public.branding(subdomain);
CREATE INDEX idx_branding_custom_domain ON public.branding(custom_domain);
CREATE INDEX idx_branding_org ON public.branding(organization_id);
CREATE INDEX idx_licenses_org ON public.licenses(organization_id);