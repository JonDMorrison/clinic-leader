export type TrendDirection = "up" | "down" | "stable" | "insufficient-data";

export interface TrendData {
  direction: TrendDirection;
  percentage: number;
  icon: string;
  label: string;
}

/**
 * Calculate trend based on last 3 weeks of data
 * Returns trend direction and percentage change
 */
export const calculateTrend = (
  values: (number | null)[],
  targetDirection: "up" | "down"
): TrendData => {
  // Need at least 2 data points for trend
  const validValues = values.filter(v => v !== null) as number[];
  
  if (validValues.length < 2) {
    return {
      direction: "insufficient-data",
      percentage: 0,
      icon: "→",
      label: "No trend data",
    };
  }

  // Take last 3 values for trend calculation
  const recent = validValues.slice(-3);
  const oldest = recent[0];
  const newest = recent[recent.length - 1];

  // Calculate percentage change
  const change = ((newest - oldest) / oldest) * 100;
  const absChange = Math.abs(change);

  // Determine if trend is significant (>5% change)
  const isSignificant = absChange > 5;

  if (!isSignificant) {
    return {
      direction: "stable",
      percentage: change,
      icon: "→",
      label: "Stable",
    };
  }

  // Determine if trend is improving based on target direction
  const isIncreasing = change > 0;
  const isImproving = targetDirection === "up" ? isIncreasing : !isIncreasing;

  if (isImproving) {
    return {
      direction: "up",
      percentage: change,
      icon: "↗️",
      label: "Improving",
    };
  } else {
    return {
      direction: "down",
      percentage: change,
      icon: "↘️",
      label: "Declining",
    };
  }
};

/**
 * Calculate week-over-week comparison
 */
export const calculateWeekOverWeek = (
  currentValue: number | null,
  previousValue: number | null
): { change: number; percentage: number; isPositive: boolean } | null => {
  if (currentValue === null || previousValue === null || previousValue === 0) {
    return null;
  }

  const change = currentValue - previousValue;
  const percentage = (change / previousValue) * 100;

  return {
    change,
    percentage,
    isPositive: change > 0,
  };
};

/**
 * Get category color classes
 */
export const getCategoryColor = (category: string): { 
  bg: string; 
  border: string; 
  text: string;
  badgeBg: string;
} => {
  const normalized = category.toLowerCase();
  
  if (normalized.includes("operation")) {
    return {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      badgeBg: "bg-blue-100",
    };
  }
  
  if (normalized.includes("finance")) {
    return {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      badgeBg: "bg-green-100",
    };
  }
  
  if (normalized.includes("clinical")) {
    return {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      badgeBg: "bg-purple-100",
    };
  }
  
  if (normalized.includes("referral")) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      badgeBg: "bg-amber-100",
    };
  }
  
  return {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badgeBg: "bg-gray-100",
  };
};
