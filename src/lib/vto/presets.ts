export interface VTOPreset {
  label: string;
  description: string;
  vision: {
    core_values: string[];
    core_focus: { purpose: string; niche: string };
    ten_year_target: string;
    marketing_strategy: {
      ideal_client: string;
      differentiators: string[];
      proven_process: string;
      guarantee: string;
    };
    three_year_picture: {
      revenue: string;
      profit: string;
      measurables: string[];
      headcount: string;
      notes: string;
    };
  };
  traction: {
    one_year_plan: {
      revenue: string;
      profit: string;
      measurables: string[];
      goals: string[];
    };
    quarter_key: string;
    quarterly_rocks: Array<{ title: string; weight: number }>;
    issues_company: any[];
    issues_department: any[];
    issues_personal: any[];
  };
}

export const VTO_PRESETS: Record<string, VTOPreset> = {
  clinic_standard: {
    label: "Clinic Standard",
    description: "Pre-configured template for healthcare clinics",
    vision: {
      core_values: ["Ownership", "Empathy", "Excellence", "Growth", "Team First"],
      core_focus: { 
        purpose: "Help patients recover and return to work", 
        niche: "Multidisciplinary injury care" 
      },
      ten_year_target: "Serve 100,000 patients with top-decile outcomes",
      marketing_strategy: {
        ideal_client: "Injured workers and MVA patients who value coordinated care",
        differentiators: [
          "Same-week access",
          "Integrated providers",
          "Claims expertise",
          "Data-visible outcomes"
        ],
        proven_process: "Triage → Treatment Plan → Coordinated Care → Recovery → Follow-up",
        guarantee: "Clear next step at every visit"
      },
      three_year_picture: {
        revenue: "▲ Sustainable growth",
        profit: "Healthy margin",
        measurables: [
          "No-show ≤ 5%",
          "Collection rate ≥ 90%",
          "Avg visit-to-plan ≥ target"
        ],
        headcount: "Right people, right seats",
        notes: "Known locally for care + outcomes"
      }
    },
    traction: {
      one_year_plan: {
        revenue: "Hit annual revenue target",
        profit: "Hit annual profit target",
        measurables: [
          "New patients/week",
          "Total visits/week",
          "Collection rate %",
          "AR 90+ $"
        ],
        goals: [
          "Launch recall excellence program",
          "Lift collection rate 5 points",
          "Reduce time-to-next-available to ≤ 3 days",
          "Publish and acknowledge top 20 SOPs"
        ]
      },
      quarter_key: "current",
      quarterly_rocks: [
        { title: "Recall system: daily zero past-due", weight: 1 },
        { title: "Clean-claim checklist live", weight: 1 },
        { title: "Provider templates to open access", weight: 1 },
        { title: "Core Values rollout and People Analyzer cadence", weight: 1 }
      ],
      issues_company: [],
      issues_department: [],
      issues_personal: []
    }
  }
};
