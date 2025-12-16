export const MONTHLY_OPERATING_RHYTHM_SOP = {
  title: "Monthly Operating Rhythm",
  slug: "monthly-operating-rhythm",
  tags: ["Operations", "Scorecard", "Meetings", "SOP"],
  requiresAck: false,
  quiz: {
    enabled: false,
    questions: [],
  },
  sections: [
    {
      heading: "How We Run the Month",
      body: "This monthly rhythm keeps our clinic on track by aligning numbers, priorities, and meetings.",
    },
    {
      heading: "Step 1 — Update the Numbers",
      body: `**Who:** Office Manager
**When:** First week of the month

1. Open the Scorecard Input Google Sheet
2. Update the value column for the new month
3. Click Sync (or Upload) in ClinicLeader

If something isn't recognized, ClinicLeader will show exactly what needs attention. No data is lost.`,
    },
    {
      heading: "Step 2 — Check the Pulse",
      body: `**Who:** Owner or Manager

1. Open the Dashboard or Focus page
2. Review off-track metrics, missing data, and recurring issues

This is about noticing reality, not fixing it yet.`,
    },
    {
      heading: "Step 3 — Prepare the Meeting",
      body: `**Who:** Meeting leader

1. Open the upcoming meeting
2. The agenda is pre-filled automatically
3. Edit, remove, or add anything you need

Everything is flexible.`,
    },
    {
      heading: "Step 4 — Run the Meeting",
      items: [
        "Review the scorecard",
        "Review Rocks",
        "Turn problems into Issues",
        "Assign To-Dos",
      ],
      body: "ClinicLeader captures the outcomes as you go.",
    },
    {
      heading: "What 'Aligned' Means",
      body: `**Aligned** means your scorecard, meetings, and Rocks are all running on the same numbers.

You can switch to flexible mode at any time and realign later.`,
    },
  ],
  references: [
    {
      label: "Related Pages",
      items: ["Dashboard", "Scorecard", "Focus", "L10 Meetings"],
    },
  ],
};
