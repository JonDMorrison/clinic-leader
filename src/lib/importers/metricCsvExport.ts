import { format } from "date-fns";

export interface MetricExportRow {
  metric_name: string;
  week_of: string;
  actual: number | null;
  source: string;
}

export const exportMetricResultsToCSV = (data: MetricExportRow[]): string => {
  const headers = ["metric_name", "week_of", "actual", "source"];
  const csvRows = [headers.join(",")];

  data.forEach((row) => {
    const values = [
      `"${row.metric_name}"`,
      row.week_of,
      row.actual?.toString() || "",
      row.source,
    ];
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateCSVTemplate = (): string => {
  const headers = ["metric_name", "week_of", "actual", "source"];
  const exampleRow = [
    '"New Patients"',
    format(new Date(), "yyyy-MM-dd"),
    "25",
    "manual",
  ];
  
  return [headers.join(","), exampleRow.join(",")].join("\n");
};
