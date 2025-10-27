export type UserRole = 'owner' | 'director' | 'manager' | 'billing' | 'front_desk' | 'provider' | 'staff';

export const ROLE_TIPS: Record<string, Partial<Record<UserRole, string[]>>> = {
  "Rock": {
    owner: ["Make sure each Rock has a single owner.", "Keep total Rocks per leader to 3–7."],
    director: ["Make sure each Rock has a single owner.", "Keep total Rocks per leader to 3–7."],
    manager: ["Update status weekly.", "Break big Rocks into 2–3 To-Dos."],
    staff: ["Ask your manager how your To-Dos support Rocks."]
  },
  "KPI": {
    billing: ["Watch Collection Rate and AR 90+ weekly."],
    front_desk: ["Track No-Show % and Recalls completed daily."],
    manager: ["Review red KPIs each week and assign Issues or To-Dos."],
    owner: ["Ensure each KPI has a clear owner and weekly goal."]
  },
  "Recall": {
    front_desk: ["Clear Past Due first.", "If can't reach, set next recall date."],
    provider: ["Check recall completion rates weekly to ensure continuity of care."]
  },
  "Scorecard": {
    owner: ["Review weekly trends and ensure red KPIs get addressed."],
    manager: ["Discuss off-track KPIs in your weekly meeting."],
    billing: ["Focus on collection and AR aging metrics."]
  },
  "Issue": {
    manager: ["Use IDS (Identify, Discuss, Solve) method in weekly meetings."],
    staff: ["Bring any blockers or ideas as Issues to your team meeting."]
  },
  "V/TO": {
    owner: ["Update quarterly and link Rocks to your 1-Year Plan."],
    director: ["Update quarterly and link Rocks to your 1-Year Plan."],
    manager: ["Ensure your Rocks align with company V/TO goals."]
  },
  "Meeting": {
    owner: ["Run the meeting on time; stick to the agenda."],
    manager: ["Come prepared with your Scorecard and Rock updates."],
    staff: ["Bring Headlines and open Issues to discuss."]
  }
};
