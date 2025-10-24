export interface GlossaryEntry {
  short: string;
  definition: string;
  why: string[];
  learnMore?: { label: string; href: string };
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  "KPI": {
    short: "Key number you track weekly.",
    definition: "A KPI (Key Performance Indicator) is a single number that shows how a part of the clinic is performing. We track KPIs weekly so trends are clear and action is fast.",
    why: [
      "Creates a simple weekly scoreboard.",
      "Makes problems visible early.",
      "Connects to Rocks and the V/TO."
    ],
    learnMore: { label: "Open Scorecard", href: "/scorecard" }
  },
  "Scorecard": {
    short: "Your weekly KPI dashboard.",
    definition: "The Scorecard is the weekly view of your most important KPIs. Green means on target; red means discuss and assign an action.",
    why: [
      "Aligns the team weekly",
      "Turns data into action",
      "Feeds L10 agenda"
    ],
    learnMore: { label: "Go to Scorecard", href: "/scorecard" }
  },
  "Rock": {
    short: "A top priority for this quarter.",
    definition: "A Rock is one of 3–7 most important priorities you'll complete this quarter. Each Rock has an owner, due date, and weekly status.",
    why: [
      "Focuses effort on what matters",
      "Connects to your 1-Year Plan",
      "Improves follow-through"
    ],
    learnMore: { label: "Open Rocks", href: "/rocks" }
  },
  "V/TO": {
    short: "Your Vision & Traction plan.",
    definition: "The Vision/Traction Organizer captures your Core Values, long-term vision, and the 1-Year Plan with quarterly priorities.",
    why: [
      "Gives everyone the same North Star",
      "Links goals to KPIs and Rocks",
      "Makes progress measurable"
    ],
    learnMore: { label: "Open V/TO", href: "/vto" }
  },
  "Issue": {
    short: "A problem or idea to solve.",
    definition: "An Issue is anything that needs discussion or a decision. You'll solve Issues in your weekly meeting using IDS (Identify-Discuss-Solve).",
    why: [
      "Prevents rehashing",
      "Captures decisions",
      "Feeds To-Dos"
    ],
    learnMore: { label: "Open Issues", href: "/issues" }
  },
  "Recall": {
    short: "A dated follow-up task for a patient.",
    definition: "A Recall is a reminder for staff to contact a patient or schedule a visit by a specific date. It keeps active patients from slipping through the cracks.",
    why: [
      "Protects continuity of care",
      "Prevents no-shows and drop-offs",
      "Feeds KPI trends"
    ],
    learnMore: { label: "Open Recalls", href: "/recalls" }
  },
  "L10 Meeting": {
    short: "Your weekly 90-minute team meeting.",
    definition: "The Level 10 Meeting keeps the team aligned: review Scorecard, Rocks, and solve Issues. It's timed, focused, and repeatable.",
    why: [
      "Builds rhythm",
      "Turns plans into results",
      "Improves accountability"
    ],
    learnMore: { label: "Open Meetings", href: "/l10" }
  },
  "SOP": {
    short: "Your playbooks and policies.",
    definition: "Standard Operating Procedures (SOPs) are step-by-step guides for how work gets done. Staff can read, search, and acknowledge them here.",
    why: [
      "Consistency across staff",
      "Faster training",
      "Lower risk"
    ],
    learnMore: { label: "Open Docs", href: "/docs" }
  },
  "Docs": {
    short: "Your playbooks and policies.",
    definition: "Standard Operating Procedures (SOPs) are step-by-step guides for how work gets done. Staff can read, search, and acknowledge them here.",
    why: [
      "Consistency across staff",
      "Faster training",
      "Lower risk"
    ],
    learnMore: { label: "Open Docs", href: "/docs" }
  },
  "People Analyzer": {
    short: "Values & seat fit check-in.",
    definition: "A simple tool to check if a team member fits Core Values and GWC (Gets it, Wants it, Capacity to do it).",
    why: [
      "Right people, right seats",
      "Better reviews",
      "Healthier culture"
    ],
    learnMore: { label: "Open People Analyzer", href: "/people" }
  }
};
