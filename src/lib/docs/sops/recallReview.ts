export const RECALL_REVIEW_SOP = {
  title: "Recall Review",
  slug: "recall-review",
  tags: ["Front Desk", "Scheduling", "Follow Up", "Operations", "SOP"],
  requiresAck: true,
  quiz: {
    enabled: true,
    questions: [
      {
        q: "How often must the recall list be checked?",
        choices: ["Weekly", "Daily", "Monthly"],
        answer: 1,
      },
      {
        q: "What happens if a patient cancels or no-shows?",
        choices: [
          "Do nothing",
          "Set a recall for next day if not rescheduled",
          "Remove from system",
        ],
        answer: 1,
      },
      {
        q: "When a patient leaves, what must always be created?",
        choices: [
          "An appointment or a recall",
          "Only a recall",
          "Only an appointment",
        ],
        answer: 0,
      },
    ],
  },
  sections: [
    {
      heading: "Purpose",
      body: "Recalls ensure every active patient is either scheduled or has a dated follow-up task. Patients receive an automated reminder two days before the recall (for appointment recalls). Staff check the recall list daily and keep it current.",
    },
    {
      heading: "Daily Checklist",
      items: [
        "Open Recalls list; filter **Past Due** first.",
        "For each patient: call → if no answer, leave voicemail and add note.",
        "If reached: book the appointment immediately OR note reason and set a new recall date.",
        "If 'Staff Follow Up': review case with provider/lead as needed; document status; call if required.",
        "As patients leave visits: always book next appointment or set a recall unless being released.",
        "If cancel/no-show and can't reschedule on the spot: add next-day recall immediately.",
        "Enter all new appointments in the schedule immediately; no mental notes.",
        "Patients waiting on MRI/IME/claim decisions still need a **Staff Follow Up** recall.",
      ],
    },
    {
      heading: "Recall Types",
      body: `**Appointment Recalls:** Patient will receive automated reminder text 2 days before due date. Used when patient needs to book their next visit.

**Staff Follow Up:** Internal reminder only - patient receives no notification. Use for cases requiring internal review (claim status, imaging pending, provider consultation needed, etc.).`,
    },
    {
      heading: "Status Management",
      body: `**Open:** Active recall requiring action
**Completed:** Patient contacted and appointment booked or case resolved
**Deferred:** Patient requested later follow-up; new recall date set
**Unable to Contact:** Multiple attempts made, left voicemail, no response`,
    },
    {
      heading: "Printing & Reports",
      body: "Front desk may print the daily list via Reports → Appointments → Recall Visits (optional for paper workflow).",
    },
    {
      heading: "Red Flag Report",
      body: "A manager/back office reviews exceptions to catch patients missing from the recall system or needing status changes. Provide feedback to front desk as needed.",
    },
    {
      heading: "Key Rules",
      items: [
        "EVERY active patient must have either an appointment OR a recall at all times",
        "Check past due recalls FIRST every morning",
        "Never let a patient leave without scheduling next visit or setting a recall",
        "If unable to reschedule a cancellation immediately, add next-day recall",
        "Staff Follow Up recalls don't send patient reminders but still require daily review",
        "Document every call attempt, voicemail, and conversation in notes",
      ],
    },
  ],
  references: [
    {
      label: "Related SOPs",
      items: ["Front Desk Training Guide", "Scheduling Protocols", "Phone & Appointment Protocols"],
    },
  ],
};
