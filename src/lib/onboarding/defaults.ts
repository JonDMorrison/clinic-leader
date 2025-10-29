export const getTimezoneByCountry = (country: string): string => {
  const timezoneMap: Record<string, string> = {
    USA: "America/New_York",
    Canada: "America/Toronto",
    UK: "Europe/London",
    Australia: "Australia/Sydney",
    // Add more as needed
  };
  return timezoneMap[country] || "America/Los_Angeles";
};

export const getCurrencyByCountry = (country: string): string => {
  const currencyMap: Record<string, string> = {
    USA: "USD",
    Canada: "CAD",
    UK: "GBP",
    Australia: "AUD",
    // Add more as needed
  };
  return currencyMap[country] || "USD";
};

export const getUnitSystemByCountry = (country: string): "imperial" | "metric" => {
  return country === "USA" ? "imperial" : "metric";
};

export const getDefaultMetricsByIndustry = (
  industry: string,
  teamSize: number
): string[] => {
  const baseMetrics = ["Visits", "New Patients", "Revenue", "No-Show %"];
  
  if (teamSize > 10) {
    baseMetrics.push("Utilization", "Collection Rate");
  }
  
  if (industry === "Chiropractic" || industry === "Physiotherapy") {
    baseMetrics.push("Referrals", "Time-to-Next-Available");
  }
  
  return baseMetrics;
};

export const getDefaultMeetingRhythm = (eosEnabled: boolean): string => {
  return eosEnabled ? "weekly_l10" : "monthly_l10";
};

export const DEFAULT_CORE_VALUES = [
  "Patient-Centered Care",
  "Continuous Improvement",
  "Team Collaboration",
  "Integrity & Transparency",
];

export const DEFAULT_MODULES = [
  "Scorecard",
  "Rocks",
  "People Analyzer",
  "V/TO",
  "Issues",
  "L10 Meetings",
];
