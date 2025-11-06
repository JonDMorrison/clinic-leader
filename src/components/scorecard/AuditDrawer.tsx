import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricResultId: string | null;
  metricName: string;
}

export function AuditDrawer({ open, onOpenChange, metricResultId, metricName }: AuditDrawerProps) {
  const { data: auditRecords, isLoading } = useQuery({
    queryKey: ["metric-audit", metricResultId],
    queryFn: async () => {
      if (!metricResultId) return [];
      
      const { data: auditData, error: auditError } = await supabase
        .from("metric_results_audit")
        .select("*")
        .eq("metric_result_id", metricResultId)
        .order("changed_at", { ascending: false });

      if (auditError) throw auditError;

      // Fetch user details separately
      const userIds = [...new Set(auditData.map(r => r.changed_by))];
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);

      if (userError) throw userError;

      // Combine the data
      const userMap = new Map(userData?.map(u => [u.id, u]) || []);
      return auditData.map(record => ({
        ...record,
        user: userMap.get(record.changed_by),
      }));
    },
    enabled: !!metricResultId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit History - {metricName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !auditRecords || auditRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No edit history available
            </div>
          ) : (
            <div className="space-y-4">
              {auditRecords.map((record) => {
                const oldVal = record.old_value ? Number(record.old_value) : null;
                const newVal = record.new_value ? Number(record.new_value) : null;
                const isIncrease = oldVal !== null && newVal !== null && newVal > oldVal;
                const isDecrease = oldVal !== null && newVal !== null && newVal < oldVal;

                return (
                  <div
                    key={record.id}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {record.user?.full_name || record.user?.email || "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(record.changed_at), "MMM d, yyyy h:mm a")}
                          </Badge>
                        </div>
                        {record.reason && (
                          <p className="text-sm text-muted-foreground">{record.reason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div className="flex-1 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Previous</div>
                        <div className="text-lg font-semibold">
                          {oldVal !== null ? oldVal.toLocaleString() : "—"}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isIncrease && <TrendingUp className="h-5 w-5 text-green-600" />}
                        {isDecrease && <TrendingDown className="h-5 w-5 text-red-600" />}
                        {!isIncrease && !isDecrease && (
                          <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                            →
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-xs text-muted-foreground mb-1">New</div>
                        <div className="text-lg font-semibold">
                          {newVal !== null ? newVal.toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
