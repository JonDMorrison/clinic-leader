export interface Report {
  id: string;
  team_id: string | null;
  period: "weekly" | "monthly";
  week_start: string;
  summary: ReportSummary;
  file_url: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSummary {
  period_label: string;
  executive_summary: string[];
  wins: string[];
  challenges: string[];
  opportunities: string[];
  kpi_summary: KpiSummaryItem[];
  rocks_summary: {
    total: number;
    on_track: number;
    at_risk: number;
    completed: number;
  };
  issues_summary: {
    opened: number;
    solved: number;
    open: number;
  };
  forecast: {
    kpi_name: string;
    predicted: number;
    confidence: number;
  }[];
  ai_commentary: string;
}

export interface KpiSummaryItem {
  name: string;
  current: number;
  target: number;
  trend: "up" | "down" | "stable";
  status: "success" | "warning" | "danger";
  unit: string;
}
