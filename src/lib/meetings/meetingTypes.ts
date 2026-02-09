/**
 * EOS Meeting Type Configuration
 * Defines the structure, agendas, and guardrails for each meeting type
 */

export type MeetingTypeKey = 'L10' | 'quarterly' | 'annual';

export interface MeetingTypeConfig {
  key: MeetingTypeKey;
  name: string;
  description: string;
  purpose: string;
  timeHorizon: string;
  decisionType: string;
  defaultDuration: number; // minutes
  sections: MeetingSectionConfig[];
  guardrails: MeetingGuardrails;
}

export interface MeetingSectionConfig {
  key: string;
  label: string;
  description: string;
  timerMinutes: number;
  sortBase: number;
}

export interface MeetingGuardrails {
  allowTodos: boolean;
  allowRockCreation: boolean;
  allowScorecardEditing: boolean;
  allowIdsOnSmallIssues: boolean;
  issueHorizonFilter: 'weekly' | 'quarterly' | 'annual';
}

// L10 Weekly Meeting
const L10_SECTIONS: MeetingSectionConfig[] = [
  { key: 'segue', label: 'Segue', description: 'Quick wins and good news to start positive.', timerMinutes: 5, sortBase: 1000 },
  { key: 'scorecard', label: 'Scorecard Review', description: 'Review the numbers. Identify off-track metrics.', timerMinutes: 5, sortBase: 2000 },
  { key: 'rocks', label: 'Rock Review', description: 'On-track or off-track? 30-second updates per owner.', timerMinutes: 5, sortBase: 3000 },
  { key: 'headlines', label: 'Headlines', description: 'Customer/employee news. Good or bad, share it.', timerMinutes: 5, sortBase: 4000 },
  { key: 'interventions', label: 'Intervention Check-in', description: 'Review active interventions. Flag stalled ones. Record outcomes.', timerMinutes: 5, sortBase: 4500 },
  { key: 'issues', label: 'IDS (Issues)', description: 'Identify, Discuss, Solve. Pick top 1-3 and work them.', timerMinutes: 60, sortBase: 5000 },
  { key: 'todo', label: 'To-Do Review', description: 'Review last week\'s to-dos. 90%+ completion target.', timerMinutes: 5, sortBase: 6000 },
  { key: 'conclusion', label: 'Conclusion', description: 'Recap decisions. Confirm to-dos and owners.', timerMinutes: 5, sortBase: 7000 },
];

// Quarterly Meeting
const QUARTERLY_SECTIONS: MeetingSectionConfig[] = [
  { key: 'checkin', label: 'Check-in & Expectations', description: 'Set the tone. What do we need to accomplish today?', timerMinutes: 15, sortBase: 1000 },
  { key: 'prev_rocks', label: 'Previous Quarter Rocks', description: 'Review each Rock. Done, not done, or dropped? Learn from what happened.', timerMinutes: 30, sortBase: 2000 },
  { key: 'scorecard_trends', label: 'Scorecard Trends', description: 'Quarterly view of metrics. Look for patterns, not single weeks.', timerMinutes: 20, sortBase: 3000 },
  { key: 'recurring_issues', label: 'Recurring Issues', description: 'Issues that keep appearing in L10s. Address root causes.', timerMinutes: 30, sortBase: 4000 },
  { key: 'next_rocks', label: 'Set Next Quarter Rocks', description: 'Define 3-7 company Rocks. Who owns each? What\'s the measurable outcome?', timerMinutes: 45, sortBase: 5000 },
  { key: 'priority_issues', label: 'Priority Issues Only', description: 'Strategic issues only. No weekly operational items.', timerMinutes: 30, sortBase: 6000 },
  { key: 'cascade', label: 'Close & Cascade', description: 'Who communicates what to whom? Ensure alignment flows down.', timerMinutes: 10, sortBase: 7000 },
];

// Annual Meeting
const ANNUAL_SECTIONS: MeetingSectionConfig[] = [
  { key: 'expectations', label: 'Expectations & Objectives', description: 'What must we accomplish in this meeting? Set the bar.', timerMinutes: 15, sortBase: 1000 },
  { key: 'vto_review', label: 'Vision / VTO Review', description: 'Review the complete V/TO. Is our direction still right?', timerMinutes: 45, sortBase: 2000 },
  { key: 'core_values', label: 'Core Values Discussion', description: 'Are we living our values? Any changes needed?', timerMinutes: 30, sortBase: 3000 },
  { key: 'pictures', label: '1-Year and 3-Year Picture', description: 'Where are we going? Revenue, people, capabilities.', timerMinutes: 45, sortBase: 4000 },
  { key: 'strategic_issues', label: 'Major Strategic Issues', description: 'Big-picture issues only. Market, competition, structure.', timerMinutes: 60, sortBase: 5000 },
  { key: 'leadership', label: 'Leadership Alignment', description: 'Are we aligned as a team? Right people, right seats?', timerMinutes: 30, sortBase: 6000 },
  { key: 'commitments', label: 'Commitments for the Year', description: 'What are we committing to? Document and assign.', timerMinutes: 15, sortBase: 7000 },
];

export const MEETING_TYPES: Record<MeetingTypeKey, MeetingTypeConfig> = {
  L10: {
    key: 'L10',
    name: 'Weekly Level 10',
    description: '90-minute weekly leadership team meeting',
    purpose: 'Run the business',
    timeHorizon: 'Weekly',
    decisionType: 'Tactical execution',
    defaultDuration: 90,
    sections: L10_SECTIONS,
    guardrails: {
      allowTodos: true,
      allowRockCreation: false, // Only track status
      allowScorecardEditing: true,
      allowIdsOnSmallIssues: true,
      issueHorizonFilter: 'weekly',
    },
  },
  quarterly: {
    key: 'quarterly',
    name: 'Quarterly Planning',
    description: 'Reset priorities and focus for the next 90 days',
    purpose: 'Reset priorities and focus',
    timeHorizon: 'Next 90 days',
    decisionType: 'Near-term strategic alignment',
    defaultDuration: 240, // 4 hours
    sections: QUARTERLY_SECTIONS,
    guardrails: {
      allowTodos: false, // No weekly to-dos
      allowRockCreation: true, // Only place to set new Rocks
      allowScorecardEditing: true, // Quarterly view
      allowIdsOnSmallIssues: false, // No IDS on small operational issues
      issueHorizonFilter: 'quarterly',
    },
  },
  annual: {
    key: 'annual',
    name: 'Annual Planning',
    description: 'Set direction for the next 1-3 years',
    purpose: 'Set direction',
    timeHorizon: '1-3 years',
    decisionType: 'Vision, structure, leadership alignment',
    defaultDuration: 480, // 8 hours (full day)
    sections: ANNUAL_SECTIONS,
    guardrails: {
      allowTodos: false, // No to-dos in annual
      allowRockCreation: false, // Only themes, not detailed Rocks
      allowScorecardEditing: false, // No scorecard drilling
      allowIdsOnSmallIssues: false,
      issueHorizonFilter: 'annual',
    },
  },
};

export function getMeetingTypeConfig(type: string): MeetingTypeConfig {
  return MEETING_TYPES[type as MeetingTypeKey] || MEETING_TYPES.L10;
}

export function getMeetingTypeName(type: string): string {
  const config = getMeetingTypeConfig(type);
  return config.name;
}

export function getSectionConfig(meetingType: string, sectionKey: string): MeetingSectionConfig | undefined {
  const config = getMeetingTypeConfig(meetingType);
  return config.sections.find(s => s.key === sectionKey);
}

export function getSectionLabels(meetingType: string): Record<string, string> {
  const config = getMeetingTypeConfig(meetingType);
  return config.sections.reduce((acc, section) => {
    acc[section.key] = section.label;
    return acc;
  }, {} as Record<string, string>);
}

export function getSectionTimers(meetingType: string): Record<string, number> {
  const config = getMeetingTypeConfig(meetingType);
  return config.sections.reduce((acc, section) => {
    acc[section.key] = section.timerMinutes;
    return acc;
  }, {} as Record<string, number>);
}

export function getSectionOrder(meetingType: string): string[] {
  const config = getMeetingTypeConfig(meetingType);
  return config.sections.map(s => s.key);
}
