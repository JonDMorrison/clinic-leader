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

export interface MarketingStrategy {
  ideal_client: string;
  differentiators: string[];
  proven_process: string;
  guarantee: string;
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
}

export interface OneYearPlan {
  revenue?: number;
  profit?: number;
  measurables: Array<{
    name: string;
    target: string | number;
  }>;
  goals: Array<{
    title: string;
    owner_id?: string;
    target_date?: string;
    status?: 'on_track' | 'at_risk' | 'off_track';
  }>;
}

export interface QuarterlyRock {
  title: string;
  owner_id?: string;
  due?: string;
  status: 'on_track' | 'at_risk' | 'off_track';
  weight: number;
}

export interface VTOIssue {
  title: string;
  status: 'open' | 'resolved';
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

export const VTO_TEMPLATES = {
  'classic-eos': {
    name: 'Classic EOS',
    description: 'Standard EOS Vision/Traction Organizer format',
    data: {
      core_values: ['Integrity', 'Excellence', 'Growth', 'Teamwork', 'Innovation'],
      core_focus: {
        purpose: 'Help businesses achieve their vision',
        niche: 'Healthcare practice management'
      },
      marketing_strategy: {
        ideal_client: 'Growing healthcare practices with 10-50 employees',
        differentiators: ['Proven EOS implementation', 'Healthcare expertise', 'Measurable results'],
        proven_process: '90-day implementation cycle with weekly accountability',
        guarantee: '100% satisfaction or money back'
      }
    }
  },
  'clinic-growth': {
    name: 'Clinic Growth',
    description: 'Pre-configured for clinic growth and operations',
    data: {
      core_values: ['Patient Care', 'Clinical Excellence', 'Team Development', 'Community Impact', 'Continuous Improvement'],
      core_focus: {
        purpose: 'Deliver exceptional patient outcomes and experiences',
        niche: 'Comprehensive multi-specialty care'
      },
      ten_year_target: '5 locations serving 50,000 patients annually',
      three_year_picture: {
        revenue: 5000000,
        profit: 1000000,
        measurables: [
          { name: 'Patient Visits', target: 30000 },
          { name: 'Patient Satisfaction', target: '95%' },
          { name: 'Team Members', target: 75 }
        ],
        headcount: 75
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
  },
  'lean-vto': {
    name: 'Lean VTO',
    description: 'Simplified starter template to expand later',
    data: {
      core_values: ['Quality', 'Accountability', 'Growth'],
      core_focus: {
        purpose: 'Build a thriving organization',
        niche: 'Your specific market'
      },
      one_year_plan: {
        goals: [
          { title: 'Define core metrics', status: 'on_track' as const },
          { title: 'Build team culture', status: 'on_track' as const },
          { title: 'Streamline operations', status: 'on_track' as const }
        ],
        measurables: []
      }
    }
  }
} as const;

export type VTOTemplateKey = keyof typeof VTO_TEMPLATES;
