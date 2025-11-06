// Coaching tips for different metric alert types

export const COACHING_TIPS: Record<string, Record<string, string>> = {
  // Operations metrics
  "new patients": {
    off_target: "Review your marketing channels and referral sources. Consider running a patient acquisition campaign.",
    downtrend: "Check referral follow-ups and online booking funnel. Run recall list and encourage patient reviews.",
    missing_data: "Weekly tracking of new patients helps identify growth opportunities. Update this metric to stay on track."
  },
  "total visits": {
    off_target: "Analyze appointment types and provider schedules. Look for gaps in the schedule that can be filled.",
    downtrend: "Review no-show rates and cancellation patterns. Consider implementing reminder systems.",
    missing_data: "Visit volume is a key performance indicator. Keep this metric updated weekly."
  },
  "% scheduled": {
    off_target: "Increase same-day rebooking prompts at front desk. Train staff on rebooking scripts.",
    downtrend: "Review scheduling protocols and patient communication. Focus on appointment confirmation processes.",
    missing_data: "Tracking scheduled appointments helps optimize capacity. Update to monitor booking efficiency."
  },

  // Finance metrics
  "revenue": {
    off_target: "Review unbilled visits and claims not submitted. Check for coding accuracy and timely billing.",
    downtrend: "Analyze service mix and pricing strategy. Review collection rates and outstanding balances.",
    missing_data: "Revenue tracking is critical for financial health. Ensure weekly updates for accurate forecasting."
  },
  "weekly revenue": {
    off_target: "Review unbilled visits and claims not submitted. Check for coding accuracy and timely billing.",
    downtrend: "Analyze service mix and pricing strategy. Review collection rates and outstanding balances.",
    missing_data: "Revenue tracking is critical for financial health. Ensure weekly updates for accurate forecasting."
  },
  "aging": {
    off_target: "Focus on accounts over 60 days. Implement consistent follow-up processes for overdue balances.",
    downtrend: "Increase collection efforts and review payment plan options. Consider bringing in collection support.",
    missing_data: "AR aging impacts cash flow. Track this metric weekly to maintain healthy receivables."
  },
  "cost per patient": {
    off_target: "Review operational expenses and efficiency. Look for areas to streamline processes.",
    downtrend: "Rising costs may indicate inefficiencies. Analyze major expense categories for reduction opportunities.",
    missing_data: "Cost per patient helps manage profitability. Regular updates enable better financial decisions."
  },

  // Clinical metrics
  "care plans": {
    off_target: "Increase provider education on treatment planning. Review completion barriers with clinical team.",
    downtrend: "Focus on patient education and engagement. Consider automating care plan follow-ups.",
    missing_data: "Care plan completion impacts outcomes. Track this to improve treatment success rates."
  },
  "% completed care plans": {
    off_target: "Increase provider education on treatment planning. Review completion barriers with clinical team.",
    downtrend: "Focus on patient education and engagement. Consider automating care plan follow-ups.",
    missing_data: "Care plan completion impacts outcomes. Track this to improve treatment success rates."
  },
  "visits per case": {
    off_target: "Review treatment protocols and patient progress. Ensure proper documentation of care plans.",
    downtrend: "Assess case complexity and treatment duration. May indicate better outcomes or incomplete care.",
    missing_data: "Average visits per case helps measure treatment efficiency. Keep this metric current."
  },

  // Referrals
  "referrals": {
    off_target: "Strengthen referral partnerships and communication. Consider referral incentive programs.",
    downtrend: "Reach out to referral sources. Review referral process for barriers or delays.",
    missing_data: "Referral tracking helps maintain key relationships. Update weekly to monitor source performance."
  },
  "total referrals": {
    off_target: "Strengthen referral partnerships and communication. Consider referral incentive programs.",
    downtrend: "Reach out to referral sources. Review referral process for barriers or delays.",
    missing_data: "Referral tracking helps maintain key relationships. Update weekly to monitor source performance."
  },
  "% scheduled referrals": {
    off_target: "Improve referral coordination and patient outreach. Simplify booking process for referred patients.",
    downtrend: "Review referral communication process. Consider automated follow-up for referrals.",
    missing_data: "Scheduled referral rate shows conversion efficiency. Track weekly for improvement opportunities."
  },

  // Default fallback
  default: {
    off_target: "Review your processes and identify blockers. Consider what changes could improve this metric.",
    downtrend: "A declining trend suggests intervention is needed. Analyze root causes and implement corrective actions.",
    missing_data: "Regular data entry ensures accurate performance tracking. Update this metric to maintain insights."
  }
};

export const getCoachingTip = (metricName: string, alertType: string): string => {
  const normalizedName = metricName.toLowerCase();
  
  // Try exact match first
  if (COACHING_TIPS[normalizedName]) {
    return COACHING_TIPS[normalizedName][alertType] || COACHING_TIPS.default[alertType];
  }
  
  // Try partial match
  for (const key in COACHING_TIPS) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return COACHING_TIPS[key][alertType] || COACHING_TIPS.default[alertType];
    }
  }
  
  // Fallback to default
  return COACHING_TIPS.default[alertType];
};
