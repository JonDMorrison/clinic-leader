// Vision/Traction Organizer (V/TO) Type Definitions
// Enhanced for full VTO support including NW Injury Clinics format

export interface VTO {
  id: string;
  team_id: string;
  title: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Core Values - supports simple strings or structured objects
export interface CoreValueItem {
  id: string;
  label: string;
  description?: string;
  order: number;
  is_active: boolean;
}

// For backward compatibility, core_values can be string[] or CoreValueItem[]
export type CoreValues = string[] | CoreValueItem[];

// Helper to normalize core values
export function normalizeCoreValues(values: CoreValues): CoreValueItem[] {
  if (!values || values.length === 0) return [];
  if (typeof values[0] === 'string') {
    return (values as string[]).map((label, idx) => ({
      id: crypto.randomUUID(),
      label,
      order: idx,
      is_active: true,
    }));
  }
  return values as CoreValueItem[];
}

export function coreValuesToStrings(values: CoreValues): string[] {
  if (!values || values.length === 0) return [];
  if (typeof values[0] === 'string') return values as string[];
  return (values as CoreValueItem[]).map((v) => v.label);
}

// Enhanced Core Focus with taglines
export interface CoreFocus {
  purpose: string;
  niche: string;
  taglines?: string[];
}

// Backward compatibility: core_focus could be string or object
export function normalizeCoresFocus(focus: any): CoreFocus {
  if (typeof focus === 'string') {
    return { purpose: focus, niche: '', taglines: [] };
  }
  return {
    purpose: focus?.purpose || '',
    niche: focus?.niche || '',
    taglines: focus?.taglines || [],
  };
}

// Long Range Targets (10-year and 3-year)
export interface LongRangeTarget {
  horizon: 'ten_year' | 'three_year';
  target_description?: string;
  revenue_target?: number;
  profit_margin_target?: number;
  measurables?: Array<{ name: string; target: string | number }>;
  notes?: string;
}

// Enhanced Marketing Strategy
export interface MarketingStrategy {
  ideal_client: string;
  demographics?: string;
  psychographics?: string;
  needs_summary?: string;
  problem_we_solve?: string;
  differentiators: string[];
  proven_process: ProvenProcess;
  guarantee: string;
  target_markets?: string[];
  uniques?: string[];
}

// Enhanced Proven Process with hierarchical steps
export interface ProvenProcessStep {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes?: string;
  sub_steps?: Array<{ id: string; title: string }>;
  order: number;
}

// Support both legacy string and new hierarchical format
export type ProvenProcess = string | ProvenProcessStep[];

// Normalize proven process from legacy string to structured format
export function normalizeProvenProcess(value: ProvenProcess): ProvenProcessStep[] {
  if (typeof value === 'string') {
    const steps = value.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
    return steps.map((title, i) => ({
      id: crypto.randomUUID(),
      title,
      order: i,
      sub_steps: [],
    }));
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

// 3-Year Expansion Items
export type ExpansionItemType = 'location' | 'partnership' | 'acquisition' | 'service_line' | 'staffing';
export type ExpansionItemStatus = 'planned' | 'in_progress' | 'complete';

export interface ExpansionItem {
  id: string;
  type: ExpansionItemType;
  title: string;
  description: string;
  expected_revenue_impact?: number;
  owner_id?: string;
  status: ExpansionItemStatus;
  linked_kpi_ids?: string[];
  linked_rock_ids?: string[];
}

export interface ThreeYearPicture {
  revenue?: number;
  profit?: number;
  measurables: Array<{
    name: string;
    target: string | number;
  }>;
  headcount?: number;
  notes?: string;
  expansion_items?: ExpansionItem[];
}

// Normalize 3-year picture with expansion items
export function normalizeThreeYearPicture(value: any): ThreeYearPicture {
  return {
    revenue: value?.revenue || undefined,
    profit: value?.profit || undefined,
    measurables: value?.measurables || [],
    headcount: value?.headcount || undefined,
    notes: value?.notes || '',
    expansion_items: value?.expansion_items || [],
  };
}

// Enhanced 1-Year Goal/Initiative
export type InitiativeStatus = 'planned' | 'in_progress' | 'complete' | 'on_hold' | 'on_track' | 'at_risk' | 'off_track';

export interface OneYearGoal {
  id?: string;
  title: string;
  description?: string;
  owner_id?: string;
  target_date?: string;
  status?: InitiativeStatus;
  linked_kpi_ids?: string[];
  linked_rock_ids?: string[];
}

export interface OneYearPlan {
  fiscal_year?: number;
  revenue?: number;
  profit?: number;
  measurables: Array<{
    name: string;
    target: string | number;
  }>;
  goals: OneYearGoal[];
}

// Normalize 1-year plan with goals array
export function normalizeOneYearPlan(value: any): OneYearPlan {
  return {
    fiscal_year: value?.fiscal_year || new Date().getFullYear(),
    revenue: value?.revenue || undefined,
    profit: value?.profit || undefined,
    measurables: value?.measurables || [],
    goals: value?.goals || [],
  };
}

// Strategic KPI references in VTO
export interface VtoKpiReference {
  id: string;
  metric_id: string;
  label_snapshot: string;
  goal_key?: string;
  notes?: string;
}

export interface QuarterlyRock {
  id: string;
  title: string;
  owner_id?: string;
  due?: string;
  status: 'on_track' | 'at_risk' | 'off_track' | 'complete';
  weight?: number;
  progress?: number;
}

export interface VTOIssue {
  id: string;
  title: string;
  owner_id?: string;
  priority?: number;
  status: 'open' | 'resolved' | 'identified' | 'discussed' | 'solved';
}

// Full VTO Version with all enhanced fields
export interface VTOVersion {
  id: string;
  vto_id: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  
  // Vision fields
  core_values: CoreValues;
  core_focus: CoreFocus;
  ten_year_target?: string;
  long_range_targets?: LongRangeTarget[];
  marketing_strategy: MarketingStrategy;
  three_year_picture: ThreeYearPicture;
  promise?: string;
  
  // Traction fields
  one_year_plan: OneYearPlan;
  quarter_key?: string;
  quarterly_rocks: QuarterlyRock[];
  issues_company: VTOIssue[];
  issues_department: VTOIssue[];
  issues_personal: VTOIssue[];
  
  // Strategic KPI links
  strategic_kpis?: VtoKpiReference[];
  
  published_at?: string;
  created_by?: string;
  created_at: string;
}

export interface VTOLink {
  id: string;
  vto_version_id: string;
  link_type: 'kpi' | 'rock' | 'issue' | 'doc';
  link_id: string;
  goal_key: string;
  weight: number;
  created_at: string;
}

export interface VTOProgress {
  id: string;
  vto_version_id: string;
  computed_at: string;
  vision_score: number;
  traction_score: number;
  details: {
    [goalKey: string]: {
      progress: number;
      linked_items: Array<{
        type: string;
        id: string;
        contribution: number;
      }>;
    };
  };
}

export interface VTOAudit {
  id: string;
  vto_version_id: string;
  user_id?: string;
  action: 'create' | 'publish' | 'archive' | 'edit' | 'link' | 'unlink' | 'export';
  meta?: any;
  created_at: string;
}

// Expansion item type labels
export const EXPANSION_TYPE_LABELS: Record<ExpansionItemType, string> = {
  location: 'New Location',
  partnership: 'Partnership',
  acquisition: 'Acquisition',
  service_line: 'Service Line',
  staffing: 'Staffing Expansion',
};

export const EXPANSION_STATUS_COLORS: Record<ExpansionItemStatus, string> = {
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export const INITIATIVE_STATUS_COLORS: Record<InitiativeStatus, string> = {
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  at_risk: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  off_track: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Standard clinic VTO template - now richer
export const VTO_TEMPLATES = {
  'clinic_standard': {
    name: 'Clinic Standard',
    description: 'Optimized template for healthcare clinics',
    data: {
      core_values: ['Patient Care', 'Clinical Excellence', 'Team Development', 'Community Impact', 'Continuous Improvement'],
      core_focus: {
        purpose: 'Deliver exceptional patient outcomes and experiences',
        niche: 'Comprehensive multi-specialty care',
        taglines: ['Healing Today, Wellness Tomorrow'],
      },
      ten_year_target: '5 locations serving 50,000 patients annually',
      long_range_targets: [
        {
          horizon: 'ten_year' as const,
          target_description: '5 locations serving 50,000 patients annually',
          revenue_target: 25000000,
          profit_margin_target: 20,
        },
        {
          horizon: 'three_year' as const,
          target_description: '2 locations, 20,000 patients',
          revenue_target: 10000000,
          profit_margin_target: 18,
        },
      ],
      marketing_strategy: {
        ideal_client: 'Personal injury and MVA patients seeking integrated multi-specialty care',
        demographics: 'Adults 25-65 with active injury claims',
        target_markets: ['Personal Injury', 'Motor Vehicle Accidents', 'Workers Compensation'],
        differentiators: ['Proven EOS implementation', 'Healthcare expertise', 'Measurable results'],
        uniques: ['Complete case management', 'Integrated multi-specialty care', '10+ years experience'],
        proven_process: [
          { id: '1', title: 'Initial Assessment', description: 'Comprehensive evaluation', order: 0, sub_steps: [] },
          { id: '2', title: 'Treatment Plan', description: 'Personalized care plan', order: 1, sub_steps: [] },
          { id: '3', title: 'Active Care', description: 'Hands-on treatment', order: 2, sub_steps: [] },
          { id: '4', title: 'Progress Review', description: 'Track outcomes', order: 3, sub_steps: [] },
          { id: '5', title: 'Maintenance', description: 'Ongoing wellness', order: 4, sub_steps: [] },
        ],
        guarantee: '100% satisfaction or money back'
      },
      three_year_picture: {
        revenue: 5000000,
        profit: 1000000,
        measurables: [
          { name: 'Patient Visits', target: 30000 },
          { name: 'Patient Satisfaction', target: '95%' },
          { name: 'Team Members', target: 75 }
        ],
        headcount: 75,
        expansion_items: []
      },
      one_year_plan: {
        fiscal_year: new Date().getFullYear(),
        revenue: 2500000,
        profit: 400000,
        measurables: [
          { name: 'New Patients', target: 500 },
          { name: 'Collection Rate', target: '95%' }
        ],
        goals: []
      },
      promise: 'We will provide compassionate, effective care that gets you back to your best life.',
      strategic_kpis: [],
    }
  }
} as const;

export type VTOTemplateKey = keyof typeof VTO_TEMPLATES;
