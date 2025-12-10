// Vision/Traction Organizer (V/TO) Type Definitions

export interface VTO {
  id: string;
  team_id: string;
  title: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CoreFocus {
  purpose: string;
  niche: string;
}

// Enhanced Proven Process with hierarchical steps
export interface ProvenProcessStep {
  id: string;
  title: string;
  description?: string;
  sub_steps?: Array<{ id: string; title: string }>;
  order: number;
}

// Support both legacy string and new hierarchical format
export type ProvenProcess = string | ProvenProcessStep[];

export interface MarketingStrategy {
  ideal_client: string;
  differentiators: string[];
  proven_process: ProvenProcess;
  guarantee: string;
}

// New: 3-Year Expansion Items
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

// Enhanced 1-Year Goal/Initiative
export interface OneYearGoal {
  id?: string;
  title: string;
  description?: string;
  owner_id?: string;
  target_date?: string;
  status?: 'on_track' | 'at_risk' | 'off_track' | 'complete';
  linked_kpi_ids?: string[];
  linked_rock_ids?: string[];
}

export interface OneYearPlan {
  revenue?: number;
  profit?: number;
  measurables: Array<{
    name: string;
    target: string | number;
  }>;
  goals: OneYearGoal[];
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

export interface VTOVersion {
  id: string;
  vto_id: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  
  // Vision fields
  core_values: string[];
  core_focus: CoreFocus;
  ten_year_target?: string;
  marketing_strategy: MarketingStrategy;
  three_year_picture: ThreeYearPicture;
  
  // Traction fields
  one_year_plan: OneYearPlan;
  quarter_key?: string;
  quarterly_rocks: QuarterlyRock[];
  issues_company: VTOIssue[];
  issues_department: VTOIssue[];
  issues_personal: VTOIssue[];
  
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

export const VTO_TEMPLATES = {
  'clinic_standard': {
    name: 'Clinic Standard',
    description: 'Optimized template for healthcare clinics',
    data: {
      core_values: ['Patient Care', 'Clinical Excellence', 'Team Development', 'Community Impact', 'Continuous Improvement'],
      core_focus: {
        purpose: 'Deliver exceptional patient outcomes and experiences',
        niche: 'Comprehensive multi-specialty care'
      },
      ten_year_target: '5 locations serving 50,000 patients annually',
      marketing_strategy: {
        ideal_client: 'Growing healthcare practices with 10-50 employees',
        differentiators: ['Proven EOS implementation', 'Healthcare expertise', 'Measurable results'],
        proven_process: [
          { id: '1', title: 'Initial Assessment', description: 'Comprehensive evaluation', order: 1, sub_steps: [] },
          { id: '2', title: 'Treatment Plan', description: 'Personalized care plan', order: 2, sub_steps: [] },
          { id: '3', title: 'Active Care', description: 'Hands-on treatment', order: 3, sub_steps: [] },
          { id: '4', title: 'Progress Review', description: 'Track outcomes', order: 4, sub_steps: [] },
          { id: '5', title: 'Maintenance', description: 'Ongoing wellness', order: 5, sub_steps: [] },
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
        revenue: 2500000,
        profit: 400000,
        measurables: [
          { name: 'New Patients', target: 500 },
          { name: 'Collection Rate', target: '95%' }
        ],
        goals: []
      }
    }
  }
} as const;

export type VTOTemplateKey = keyof typeof VTO_TEMPLATES;
