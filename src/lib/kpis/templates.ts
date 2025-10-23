export interface KPITemplateItem {
  name: string;
  unit: "count" | "$" | "%" | "ratio" | "score" | "days" | "min";
  direction: ">=" | "<=";
  group: string;
  is_computed?: boolean;
  expression?: string;
  sample_target?: number;
}

export interface KPITemplate {
  label: string;
  description: string;
  items: KPITemplateItem[];
  bundles: {
    [key: string]: KPITemplateItem[];
  };
}

export const KPI_TEMPLATES: Record<string, KPITemplate> = {
  clinic_standard: {
    label: "Clinic Standard (EOS)",
    description: "Production, Financial, Referral, Operational, and Quality KPIs commonly used in clinic scorecards.",
    items: [
      // --- Production ---
      { name: "New Patients", unit: "count", direction: ">=", group: "Production", sample_target: 15 },
      { name: "Total Visits", unit: "count", direction: ">=", group: "Production", sample_target: 100 },
      { name: "Avg Visit per Case", unit: "ratio", direction: ">=", group: "Production", sample_target: 8 },
      { name: "Provider Utilization %", unit: "%", direction: ">=", group: "Production", sample_target: 75 },
      { name: "No-Show Rate %", unit: "%", direction: "<=", group: "Production", sample_target: 5 },

      // --- Financial ---
      { name: "Charges Billed", unit: "$", direction: ">=", group: "Financial", sample_target: 50000 },
      { name: "Revenue Collected", unit: "$", direction: ">=", group: "Financial", sample_target: 45000 },
      { name: "Collection Rate %", unit: "%", direction: ">=", group: "Financial", sample_target: 90 },
      { name: "A/R 30–60 Days", unit: "$", direction: "<=", group: "Financial", sample_target: 5000 },
      { name: "A/R 60–90 Days", unit: "$", direction: "<=", group: "Financial", sample_target: 3000 },
      { name: "A/R 90+ Days", unit: "$", direction: "<=", group: "Financial", sample_target: 2000 },

      // --- Referral ---
      { name: "Referrals (count)", unit: "count", direction: ">=", group: "Referral", sample_target: 20 },
      { name: "Scheduled (count)", unit: "count", direction: ">=", group: "Referral", sample_target: 15 },
      { 
        name: "Referral Conversion %", 
        unit: "%", 
        direction: ">=", 
        group: "Referral", 
        is_computed: true, 
        expression: "{scheduled} / {referrals}",
        sample_target: 75
      },

      // --- Operational ---
      { name: "Time to Next Available (days)", unit: "days", direction: "<=", group: "Operational", sample_target: 7 },
      { name: "Check-in to Room (min)", unit: "min", direction: "<=", group: "Operational", sample_target: 10 },

      // --- Quality ---
      { name: "Patient NPS", unit: "score", direction: ">=", group: "Quality", sample_target: 50 }
    ],
    bundles: {
      financial: [
        { name: "Clean Claim Rate %", unit: "%", direction: ">=", group: "Financial", sample_target: 95 },
        { name: "Days in A/R", unit: "days", direction: "<=", group: "Financial", sample_target: 30 }
      ],
      referral: [
        { name: "Referrals by Source (count)", unit: "count", direction: ">=", group: "Referral", sample_target: 10 },
        { name: "Google Conversion %", unit: "%", direction: ">=", group: "Referral", sample_target: 20 }
      ],
      ops: [
        { name: "Rebooking Rate %", unit: "%", direction: ">=", group: "Production", sample_target: 80 },
        { name: "Cancellation Rate %", unit: "%", direction: "<=", group: "Production", sample_target: 10 }
      ]
    }
  }
};

export const getBundleOptions = (templateKey: string) => {
  const template = KPI_TEMPLATES[templateKey];
  if (!template) return [];
  
  return Object.keys(template.bundles).map(key => ({
    value: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count: template.bundles[key].length
  }));
};
