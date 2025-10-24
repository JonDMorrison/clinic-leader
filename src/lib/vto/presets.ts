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
  classic_eos: {
    label: "Classic EOS",
    description: "Full EOS framework for established clinics with comprehensive structure",
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
  },

  clinic_growth: {
    label: "Clinic Growth",
    description: "Focused on rapid scaling with evidence-based processes",
    vision: {
      core_values: ["Patient First", "Be Clear", "Own It", "Improve Weekly"],
      core_focus: { 
        purpose: "Restore function & confidence", 
        niche: "Evidence-based, multi-provider plans" 
      },
      ten_year_target: "Regional leader in injury rehabilitation",
      marketing_strategy: {
        ideal_client: "WC/MVA referrals; primary care partners",
        differentiators: [
          "Fast intake",
          "Proven plan-of-care",
          "Transparent scheduling"
        ],
        proven_process: "Intake → Plan → Treat → Measure → Report",
        guarantee: "Next-appointment booked or recall before exit"
      },
      three_year_picture: {
        revenue: "Growing",
        profit: "Healthy",
        measurables: [
          "Referral conversion ≥ 85%",
          "NPS ≥ 80",
          "Utilization ≥ 85%"
        ],
        headcount: "Scaled with clear seats",
        notes: "SOPs standardized"
      }
    },
    traction: {
      one_year_plan: {
        revenue: "Meet plan",
        profit: "Meet plan",
        measurables: [
          "New patients/week",
          "Revenue/week",
          "Referral conversion %"
        ],
        goals: [
          "Standardize referral capture & scheduling",
          "Instrument real-time KPIs from Jane",
          "Reduce no-shows with reminders & quick-fill",
          "Quarterly 1:1s with People Analyzer"
        ]
      },
      quarter_key: "current",
      quarterly_rocks: [
        { title: "Referrals → Scheduled flow live", weight: 1 },
        { title: "KPI auto-seed & weekly email summary", weight: 1 },
        { title: "No-show rescue playbook", weight: 1 }
      ],
      issues_company: [],
      issues_department: [],
      issues_personal: []
    }
  },

  lean_vto: {
    label: "Lean VTO",
    description: "Minimal, essential structure for getting started quickly",
    vision: {
      core_values: ["Respect", "Clarity", "Accountability"],
      core_focus: { 
        purpose: "Great care, simply delivered", 
        niche: "Lean ops" 
      },
      ten_year_target: "Durable, efficient growth",
      marketing_strategy: {
        ideal_client: "Local referrals; self-pay friendly",
        differentiators: [
          "Friendly access",
          "Clear plan",
          "Reliable outcomes"
        ],
        proven_process: "Assess → Treat → Reassess",
        guarantee: "Clear next step"
      },
      three_year_picture: {
        revenue: "On plan",
        profit: "On plan",
        measurables: [
          "Visits/week",
          "NPS",
          "Days in AR"
        ],
        headcount: "Right seats",
        notes: ""
      }
    },
    traction: {
      one_year_plan: {
        revenue: "On plan",
        profit: "On plan",
        measurables: [
          "Visits/week",
          "Collection rate %"
        ],
        goals: [
          "SOPs acknowledged",
          "Scorecard rhythm",
          "Clean AR 90+"
        ]
      },
      quarter_key: "current",
      quarterly_rocks: [
        { title: "Weekly Scorecard habit", weight: 1 },
        { title: "Top 20 SOPs published", weight: 1 }
      ],
      issues_company: [],
      issues_department: [],
      issues_personal: []
    }
  }
};
