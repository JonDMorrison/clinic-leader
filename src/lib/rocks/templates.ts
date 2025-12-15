export interface RockTemplateItem {
  level: "company" | "team" | "individual";
  title: string;
  note?: string;
  group: string;
}

export interface RockTemplate {
  label: string;
  description: string;
  quarterHint: string;
  items: RockTemplateItem[];
  bundles: {
    [key: string]: RockTemplateItem[];
  };
}

export const ROCK_TEMPLATES: Record<string, RockTemplate> = {
  clinic_eos_default: {
    label: "Default Rocks (EOS)",
    description: "High-leverage, clinic-ready Rocks aligned to EOS best practices.",
    quarterHint: "This Quarter",
    items: [
      // -------- Company-level Rocks --------
      { 
        level: "company",  
        title: "Establish weekly Scorecard rhythm", 
        note: "Run a Level 10 every week with red/green review and IDS.", 
        group: "Company" 
      },
      { 
        level: "company",  
        title: "Document and roll out Top 20 SOPs", 
        note: "Identify mission-critical SOPs; publish and require acknowledgement.", 
        group: "Company" 
      },
      { 
        level: "company",  
        title: "Publish Accountability Chart", 
        note: "Define seats and measurables for each role.", 
        group: "Company" 
      },
      { 
        level: "company",  
        title: "Launch Onboarding & Training Playbook", 
        note: "30/60/90 plan with SOP-based checklists.", 
        group: "Company" 
      },

      // -------- Team-level Rocks --------
      { 
        level: "team",     
        title: "Reduce No-Show Rate with reminders & same-day fills", 
        note: "Implement SMS reminders; create quick-fill list; measure weekly.", 
        group: "Team" 
      },
      { 
        level: "team",     
        title: "Standardize referral capture & scheduling", 
        note: "One script and workflow; report weekly conversion.", 
        group: "Team" 
      },
      { 
        level: "team",     
        title: "Close billing loops weekly", 
        note: "Post charges EOW; follow up denials; reconcile payments.", 
        group: "Team" 
      },
      { 
        level: "team",     
        title: "Improve Time-to-Next-Available", 
        note: "Template schedules; open capacity; measure days to next slot.", 
        group: "Team" 
      },

      // -------- Individual-level Rocks --------
      { 
        level: "individual", 
        title: "Complete SOP acknowledgements", 
        note: "Acknowledge all required SOPs and policies in the app.", 
        group: "Individual" 
      },
      { 
        level: "individual", 
        title: "Quarterly 1:1 and People Analyzer", 
        note: "Values + GWC review; define 1–3 development goals.", 
        group: "Individual" 
      }
    ],
    bundles: {
      financial: [
        { 
          level: "company",   
          title: "A/R Clean-up Sprint", 
          note: "Tackle 90+ day A/R; weekly targets and owner assigned.", 
          group: "Company" 
        },
        { 
          level: "team",      
          title: "Lift Collection Rate", 
          note: "Claim scrubbing & follow-ups; monitor weekly collections.", 
          group: "Team" 
        },
        { 
          level: "team",      
          title: "Adopt Clean-Claim Checklist", 
          note: "Zero missing fields; reduce first-pass denials.", 
          group: "Team" 
        }
      ],
      ops: [
        { 
          level: "company",   
          title: "Provider Capacity & Template Redesign", 
          note: "Balance provider mix; create access for new patients.", 
          group: "Company" 
        },
        { 
          level: "team",      
          title: "Reduce Check-in→Room Time", 
          note: "Front desk + clinical handoff standard; track weekly mins.", 
          group: "Team" 
        },
        { 
          level: "team",      
          title: "Rebooking & Plan-of-Care Adherence", 
          note: "Scripts + next-appointment workflow; track rebooking %.", 
          group: "Team" 
        }
      ],
      growth_people: [
        { 
          level: "company",   
          title: "Hire & Onboard Key Seat", 
          note: "Recruit, interview scorecard, 30/60/90 checklist.", 
          group: "Company" 
        },
        { 
          level: "team",      
          title: "Core Values Rollout", 
          note: "Posters, recognition cadence, People Analyzer integration.", 
          group: "Team" 
        },
        { 
          level: "individual",
          title: "Clinical Skills Focus", 
          note: "Select a CE topic; practice & measure outcome metric.", 
          group: "Individual" 
        }
      ]
    }
  }
};

export const getBundleOptions = (templateKey: string) => {
  const template = ROCK_TEMPLATES[templateKey];
  if (!template) return [];
  
  return Object.keys(template.bundles).map(key => ({
    value: key,
    label: key === "growth_people" 
      ? "Growth & People" 
      : key.charAt(0).toUpperCase() + key.slice(1),
    count: template.bundles[key].length
  }));
};

export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function getPreviousQuarter(): string {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;
  
  // Go back one quarter
  quarter -= 1;
  if (quarter < 1) {
    quarter = 4;
    year -= 1;
  }
  
  return `Q${quarter} ${year}`;
}

export function getEndOfQuarter(quarter?: string): Date {
  const now = new Date();
  let year = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;

  if (quarter) {
    const match = quarter.match(/Q(\d) (\d{4})/);
    if (match) {
      q = parseInt(match[1]);
      year = parseInt(match[2]);
    }
  }

  const endMonth = q * 3;
  return new Date(year, endMonth, 0); // Last day of the quarter's last month
}
