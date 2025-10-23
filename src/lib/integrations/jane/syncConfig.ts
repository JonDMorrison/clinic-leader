/**
 * Jane Sync Configuration
 * Central configuration for field mappings and sync behavior
 */

export const SYNC_CONFIG = {
  appointments: {
    fields: [
      "id",
      "start_at",
      "end_at",
      "status",
      "provider_name",
      "patient_id",
    ],
    aggregations: {
      total_visits: "count",
      completed_visits: "count where status = 'completed'",
      no_show_rate: "count where status = 'no_show' / count",
    },
  },
  
  payments: {
    fields: ["id", "amount", "date", "method", "status"],
    aggregations: {
      total_revenue: "sum(amount)",
      payment_count: "count",
      avg_payment: "avg(amount)",
    },
  },
  
  patients: {
    fields: [
      "id",
      "first_name",
      "last_name",
      "last_appointment_date",
      "status",
    ],
    aggregations: {
      total_patients: "count",
      active_patients: "count where status = 'active'",
      new_patients: "count where created_at >= week_start",
    },
  },
  
  metrics: {
    derive: [
      "visits_per_provider",
      "revenue_per_day",
      "patient_retention_rate",
      "appointment_utilization",
    ],
  },
};

/**
 * Maps Jane data to internal KPI format
 */
export function mapToKpiReadings(
  janeData: any[],
  dataType: string,
  weekStart: Date
) {
  const mappings: Record<string, any> = {
    appointments: {
      "Total Visits": janeData.length,
      "Completed Visits": janeData.filter((a) => a.status === "completed").length,
      "No-Show Rate": (
        (janeData.filter((a) => a.status === "no_show").length / janeData.length) *
        100
      ).toFixed(1),
    },
    
    payments: {
      "Total Revenue": janeData.reduce((sum, p) => sum + p.amount, 0),
      "Payment Count": janeData.length,
      "Average Payment": (
        janeData.reduce((sum, p) => sum + p.amount, 0) / janeData.length
      ).toFixed(2),
    },
    
    patients: {
      "Total Patients": janeData.length,
      "Active Patients": janeData.filter((p) => p.status === "active").length,
      "New Patients": janeData.filter(
        (p) => new Date(p.created_at) >= weekStart
      ).length,
    },
  };

  return mappings[dataType] || {};
}

/**
 * PHI Filtering - ensures no identifiable information is stored
 */
export function sanitizeData(data: any[], dataType: string) {
  const sanitizers: Record<string, (item: any) => any> = {
    appointments: (item) => ({
      id: item.id,
      start_at: item.start_at,
      status: item.status,
      provider_name: item.provider_name,
      // Remove patient identifiers
    }),
    
    patients: (item) => ({
      id: item.id,
      last_appointment_date: item.last_appointment_date,
      status: item.status,
      // Remove names and contact info
    }),
    
    payments: (item) => ({
      id: item.id,
      amount: item.amount,
      date: item.date,
      method: item.method,
      status: item.status,
    }),
  };

  const sanitizer = sanitizers[dataType];
  return sanitizer ? data.map(sanitizer) : data;
}
