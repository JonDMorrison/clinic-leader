import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Loader2 } from "lucide-react";

const TABLES = [
  "teams",
  "users", 
  "kpis",
  "rocks",
  "issues",
  "todos",
  "rock_metric_links",
  "meeting_items",
  "user_roles",
  "user_departments",
  "seat_users",
  "seats",
  "org_core_values",
  "vto",
  "vto_links",
];

function toCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExport() {
  const [status, setStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  const exportTable = async (table: string) => {
    setStatus((s) => ({ ...s, [table]: "loading" }));
    try {
      const { data, error } = await (supabase.from(table as any).select("*") as any);
      if (error) throw error;
      if (!data || data.length === 0) {
        setStatus((s) => ({ ...s, [table]: "done" }));
        return;
      }
      const csv = toCsv(data);
      downloadFile(`${table}.csv`, csv);
      setStatus((s) => ({ ...s, [table]: "done" }));
    } catch (e) {
      console.error(`Error exporting ${table}:`, e);
      setStatus((s) => ({ ...s, [table]: "error" }));
    }
  };

  const exportAll = async () => {
    for (const table of TABLES) {
      await exportTable(table);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Data Export</h1>
      <p className="text-muted-foreground mb-6">Download each table as a CSV file.</p>

      <Button onClick={exportAll} className="mb-6" size="lg">
        <Download className="mr-2 h-4 w-4" />
        Export All Tables
      </Button>

      <div className="space-y-2">
        {TABLES.map((table) => (
          <div key={table} className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-mono text-sm">{table}</span>
            <div className="flex items-center gap-2">
              {status[table] === "done" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {status[table] === "error" && <span className="text-xs text-red-500">Error</span>}
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportTable(table)}
                disabled={status[table] === "loading"}
              >
                {status[table] === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
