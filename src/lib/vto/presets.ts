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
      core_values: [
        "Treat Our Patients Like We'd Want Our Family to be Treated",
        "Dedicated Can-Do Attitude",
        "Uncompromised Quality of Care – Be the Best at Whatever You Do",
        "Returning Customer Service to Health Care",
        "Patient Advocates"
      ],
      core_focus: { 
        purpose: "Uncompromised Excellence Treating Injured Workers and Car Accident Victims", 
        niche: "Specializing in a Unique Space on Injured Workers and Car Accidents" 
      },
      ten_year_target: "$10M revenue, 40% profit margin",
      marketing_strategy: {
        ideal_client: "Car Accident and work injury and brain injury with recent injury",
        differentiators: [
          "Multidisciplinary approach",
          "Access (24-48 hour scheduling)",
          "Culture/values/people",
          "Proven process (The NW Injury Clinic Way)"
        ],
        proven_process: "New Patient Scheduling → Triage/Full Workup → Imaging → Patient Education → Co-management/Referral → Attorney Collaboration",
        guarantee: "We Promise to Treat You Like Family"
      },
      three_year_picture: {
        revenue: "$6M (40% profit)",
        profit: "$4M out of Tri-Cities",
        measurables: [
          "Spokane Valley office open",
          "Inland Imaging MRIs partnership",
          "PT in-house in Spokane",
          "Telemed with mid-levels active"
        ],
        headcount: "Right people, right seats",
        notes: "Looking at second Spokane office and West side expansion"
      }
    },
    traction: {
      one_year_plan: {
        revenue: "$100k/mo in Pain Management billables",
        profit: "Sustainable growth trajectory",
        measurables: [
          "#MVAs",
          "#Total NP",
          "#LNI",
          "Close Rate",
          "Outgoing Charges",
          "Total Monthly Visits",
          "Avg $ Per Visit",
          "Avg $ Per Case",
          "Gross Income"
        ],
        goals: [
          "Spokane Valley Office opened",
          "Inland Imaging MRIs in Tri-Cities and Spokane",
          "Pain Management producing $100k/mo",
          "NCV/EMG services launched"
        ]
      },
      quarter_key: "Q2-2025",
      quarterly_rocks: [
        { title: "Lori – Updating Employee Manual – Job Descriptions and Operations", weight: 1 },
        { title: "Lori – Work with Billing on Aging", weight: 1 },
        { title: "Cross-Training and Back-Ups for front desk", weight: 1 },
        { title: "Mayra – Train Diana on Pain coordination", weight: 1 },
        { title: "Tim – Pain Management launch", weight: 1 },
        { title: "Tim – Marketing initiatives", weight: 1 },
        { title: "Aaron – Preceptor Program", weight: 1 }
      ],
      issues_company: [
        { title: "Staffing – Talk w Drea, change bonus structure to tiered" },
        { title: "Is everyone in the right seat?" },
        { title: "Marketing – Aaron Talk w Trevor" },
        { title: "MRIs – Best Med partnership" },
        { title: "Insurance Agents – talk w Bryan Robison and Jeff Hamilton" }
      ],
      issues_department: [],
      issues_personal: []
    }
  }
};
