import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export function BenchmarkAuditLog() {
  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["benchmark-audit-log"],
    queryFn: async () => {
      // Use secure RPC instead of direct table access
      const { data, error } = await (supabase.rpc as any)("bench_get_audit_log", {
        _limit: 100,
      });
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "outline" => {
    if (action.includes("compute")) return "default";
    if (action.includes("create") || action.includes("add")) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Loading audit log...</div>
        ) : !logs?.length ? (
          <div className="text-muted-foreground text-center py-8">
            No audit log entries yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, yyyy h:mm:ss a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <code className="text-xs bg-muted px-2 py-1 rounded block overflow-auto max-h-20">
                      {JSON.stringify(log.details, null, 2)}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {log.user_email || log.user_id?.slice(0, 8) + "..." || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
