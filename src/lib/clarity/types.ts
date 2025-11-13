/**
 * Clinic Clarity Builder - Type Definitions
 * Phase 1: Foundation types for VTO rebuild
 */

// ============= Core Clarity VTO Types =============

export interface ClarityVTO {
  id: string;
  organization_id: string;
  version_current: number;
  vision: ClarityVision;
  traction: ClarityTraction;
  metrics: ClarityMetrics;
  created_at: string;
  updated_at: string;
}

export interface ClarityVision {
  core_values: string[];
  core_focus: {
    purpose: string;
    niche: string;
  };
  ten_year_target: string;
  ideal_client: string;
  differentiators: string[];
  proven_process: string[];
  promise: string;
  three_year_picture: {
    revenue: number;
    profit_margin: number;
    headcount: number;
    descriptors: string[];
  };
  culture: string;
}

export interface ClarityTraction {
  one_year_plan: {
    targets: {
      revenue: number;
      profit_margin: number;
      [key: string]: any;
    };
    goals: string[]; // refs to clarity_goals ids
  };
  quarter_priorities: string[]; // refs to clarity_goals ids
}

export interface ClarityMetrics {
  vision_clarity: number;
  traction_health: number;
  last_computed: string;
  breakdown: Record<string, any>;
}

// ============= Revision History =============

export interface ClarityRevision {
  id: string;
  vto_id: string;
  version: number;
  label: string | null;
  vision: ClarityVision;
  traction: ClarityTraction;
  metrics: ClarityMetrics;
  created_by: string;
  created_at: string;
}

// ============= Goals, Priorities, Issues =============

export type ClarityGoalType = 'year_goal' | 'priority' | 'issue';
export type ClarityGoalStatus = 'not_started' | 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'resolved';

export interface ClarityGoal {
  id: string;
  vto_id: string;
  type: ClarityGoalType;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: ClarityGoalStatus;
  weight: number;
  kpi_target: {
    kpi_id?: string;
    target?: number;
    unit?: string;
  } | null;
  links: ClarityGoalLink[];
  created_at: string;
  updated_at: string;
}

export interface ClarityGoalLink {
  type: 'kpi' | 'priority' | 'goal' | 'issue' | 'doc';
  id: string;
  weight?: number;
  metadata?: Record<string, any>;
}

// ============= Activity Feed =============

export type ClarityActivityAction = 
  | 'created'
  | 'updated'
  | 'published'
  | 'archived'
  | 'goal_added'
  | 'goal_updated'
  | 'goal_completed'
  | 'link_added'
  | 'link_removed'
  | 'revision_created'
  | 'ai_suggestion_applied';

export interface ClarityActivity {
  id: string;
  vto_id: string;
  user_id: string;
  action: ClarityActivityAction;
  details: Record<string, any> | null;
  created_at: string;
}

// ============= UI Component Types =============

export interface VisionStepConfig {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  examples: string[];
  fields: VisionFieldConfig[];
}

export interface VisionFieldConfig {
  key: keyof ClarityVision;
  label: string;
  type: 'text' | 'textarea' | 'chips' | 'number' | 'array' | 'object';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  helpText?: string;
}

export interface TractionBoardConfig {
  id: string;
  title: string;
  type: 'targets' | 'priorities' | 'issues';
  filters?: string[];
  actions?: string[];
}

// ============= AI Coach Types =============

export type AICoachIntent = 
  | 'draft'
  | 'tighten'
  | 'measurable'
  | 'gap_scan'
  | 'clinic_tone';

export interface AICoachRequest {
  intent: AICoachIntent;
  context: {
    vision?: Partial<ClarityVision>;
    traction?: Partial<ClarityTraction>;
    goals?: ClarityGoal[];
    kpis?: any[];
    field?: string;
    currentValue?: string;
  };
  userRole?: string;
}

export interface AICoachResponse {
  suggestions: AICoachSuggestion[];
  confidence: number;
  reasoning?: string;
}

export interface AICoachSuggestion {
  text: string;
  diff?: {
    added: string[];
    removed: string[];
  };
  rationale?: string;
}

// ============= Realtime Types =============

export interface ClarityPresence {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  editing_field?: string;
  last_seen: string;
}

export interface ClarityFieldEdit {
  field: string;
  user_id: string;
  locked: boolean;
  timestamp: string;
}

export interface ClarityComment {
  id: string;
  field: string;
  user_id: string;
  text: string;
  created_at: string;
}

// ============= Export Types =============

export interface ClarityExportOptions {
  format: 'html' | 'pdf';
  includeHistory: boolean;
  includeMetrics: boolean;
  includeActivity: boolean;
}

export interface ClarityExportResult {
  url: string;
  filename: string;
  size: number;
  created_at: string;
}

// ============= Quarterly Review Types =============

export interface QuarterlyReviewData {
  last_quarter: {
    completed: ClarityGoal[];
    carried: ClarityGoal[];
    archived: ClarityGoal[];
  };
  kpi_trends: {
    metric_id: string;
    metric_name: string;
    variance: number;
    risk_level: 'high' | 'medium' | 'low';
  }[];
  surfaced_issues: ClarityGoal[];
  capacity_check: {
    total_priorities: number;
    recommended_max: number;
    overloaded: boolean;
  };
}

export interface QuarterlyReviewAction {
  type: 'complete' | 'carry' | 'archive' | 'convert_to_priority';
  goal_id: string;
  reason?: string;
}

// ============= Validation & Computation =============

export interface VisionCompletenessScore {
  overall: number;
  sections: Record<keyof ClarityVision, {
    complete: boolean;
    score: number;
    missing: string[];
  }>;
}

export interface TractionHealthScore {
  overall: number;
  kpi_variance: number;
  priority_momentum: number;
  issue_resolution: number;
  off_track_items: {
    id: string;
    title: string;
    type: ClarityGoalType;
    reason: string;
  }[];
}

export interface ClarityValidationResult {
  valid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
  warnings: {
    field: string;
    message: string;
  }[];
}

// ============= Helper Types =============

export type UserRole = 'owner' | 'director' | 'manager' | 'staff';

export interface ClarityPermissions {
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  canManageGoals: boolean;
  canViewMetrics: boolean;
}

// ============= Constants =============

export const VISION_STEPS: VisionStepConfig[] = [
  {
    id: 'core_values',
    title: 'Core Values',
    description: 'What principles guide your decisions?',
    whyItMatters: 'Core values define your culture and attract the right team members.',
    examples: ['Compassion', 'Excellence', 'Growth', 'Integrity', 'Innovation'],
    fields: [
      {
        key: 'core_values',
        label: 'Core Values',
        type: 'chips',
        required: true,
        helpText: 'Add 3-5 values that define how you work'
      }
    ]
  },
  // Additional steps will be defined in component
];

export const GOAL_STATUS_COLORS: Record<ClarityGoalStatus, string> = {
  not_started: 'bg-muted text-muted-foreground',
  on_track: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  at_risk: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  off_track: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export const AI_COACH_ROLES: Record<UserRole, string[]> = {
  owner: [
    'Progress toward 1-Year Plan?',
    'What\'s off-track for this quarter?',
    'Which Rocks affect our red KPIs?'
  ],
  director: [
    'Progress toward 1-Year Plan?',
    'What\'s off-track for this quarter?',
    'Which Rocks affect our red KPIs?'
  ],
  manager: [
    'Team progress on quarterly rocks?',
    'Which KPIs support our V/TO goals?'
  ],
  staff: [
    'How can I contribute to our goals?',
    'What priorities are most urgent?'
  ]
};
