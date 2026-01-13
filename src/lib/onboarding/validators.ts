import { z } from "zod";

export const coreValueEntrySchema = z.object({
  title: z.string().min(1, "Value title is required"),
  short_behavior: z.string().optional(),
});

export const accountHolderSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  role: z.enum(["owner", "director", "manager", "admin", "other"]),
  phone: z.string().optional(),
});

export const companyBasicsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  industry: z.enum([
    "Chiropractic",
    "Physiotherapy",
    "Multidisciplinary",
    "Counselling",
    "Medical",
    "Other",
  ]),
  team_size: z.number().min(1, "Team size must be at least 1").max(500),
  locations_count: z.number().min(1).max(50).optional(),
  location_city: z.string().min(1, "City is required"),
  location_region: z.string().min(1, "State/Province is required"),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency is required"),
  unit_system: z.enum(["imperial", "metric"]),
});

export const operationalSetupSchema = z.object({
  ehr_system: z.enum(["Jane", "ChiroTouch", "Notero", "None", "Other"]),
  integrations: z.array(z.string()).optional(),
  primary_metrics: z.array(z.string()).optional(),
  review_cadence: z.enum(["weekly", "monthly", "quarterly"]),
});

export const valuesBuilderSchema = z.object({
  core_values: z.array(coreValueEntrySchema).min(3, "At least 3 core values required").max(7, "Maximum 7 core values"),
});

export const eosSetupSchema = z.object({
  eos_enabled: z.boolean(),
  meeting_rhythm: z.enum(["weekly_l10", "monthly_l10", "custom"]).optional(),
  vision_statement: z.string().optional(),
  enable_modules: z.array(z.string()).optional(),
});

export const brandingSchema = z.object({
  logo_url: z.string().url().optional(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  website_url: z.string().url().optional(),
  default_report_email: z.string().email().optional(),
});

export type CoreValueEntry = z.infer<typeof coreValueEntrySchema>;
export type AccountHolderData = z.infer<typeof accountHolderSchema>;
export type CompanyBasicsData = z.infer<typeof companyBasicsSchema>;
export type OperationalSetupData = z.infer<typeof operationalSetupSchema>;
export type ValuesBuilderData = z.infer<typeof valuesBuilderSchema>;
export type EosSetupData = z.infer<typeof eosSetupSchema>;
export type BrandingData = z.infer<typeof brandingSchema>;

export type OnboardingData = AccountHolderData &
  CompanyBasicsData &
  OperationalSetupData &
  ValuesBuilderData &
  EosSetupData &
  BrandingData;
