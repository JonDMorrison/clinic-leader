import { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, X, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KpiRowProps {
  kpi: any;
  users: any[];
  onUpdate: () => void;
  onCreateIssue: (kpiName: string, week: string, value: number, target: number) => void;
}

export const KpiRow = ({ kpi, users, onUpdate, onCreateIssue }: KpiRowProps) => {
  const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState(kpi.target?.toString() || "");
  const [editOwner, setEditOwner] = useState(kpi.owner_id || "");
  const [weekValue, setWeekValue] = useState("");
  const { toast } = useToast();

  const latestReading = kpi.kpi_readings?.[0];
  const last8Weeks = kpi.kpi_readings?.slice(0, 8).reverse() || [];
  const trendData = last8Weeks.map((r: any) => parseFloat(String(r.value)));

  const formatValue = (value: number) => {
    if (kpi.unit === "$") return `$${value.toLocaleString()}`;
    if (kpi.unit === "%") return `${value}%`;
    return value.toString();
  };

  const getCellStatus = (value: number, target: number, direction: string) => {
    if (!target) return "muted";
    
    if (direction === ">=") {
      return value >= target ? "success" : "danger";
    } else if (direction === "<=") {
      return value <= target ? "success" : "danger";
    } else {
      return value === target ? "success" : "danger";
    }
  };

  const handleSaveEdits = async () => {
    try {
      const { error } = await supabase
        .from("kpis")
        .update({
          target: parseFloat(editTarget),
          owner_id: editOwner || null,
        })
        .eq("id", kpi.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KPI updated successfully",
      });
      setEditMode(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddWeekValue = async () => {
    if (!weekValue.trim()) return;

    try {
      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      const weekStartStr = currentWeekStart.toISOString().split("T")[0];

      const { error } = await supabase
        .from("kpi_readings")
        .upsert({
          kpi_id: kpi.id,
          week_start: weekStartStr,
          value: parseFloat(weekValue),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Value recorded successfully",
      });
      setWeekValue("");
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const currentStatus = latestReading
    ? getCellStatus(parseFloat(String(latestReading.value)), parseFloat(String(kpi.target)), kpi.direction)
    : "muted";

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div>
          <div className="flex items-center gap-2">
            {kpi.name}
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{kpi.category}</div>
        </div>
      </TableCell>

      <TableCell>
        {editMode ? (
          <Input
            type="number"
            value={editTarget}
            onChange={(e) => setEditTarget(e.target.value)}
            className="w-24"
          />
        ) : (
          formatValue(parseFloat(String(kpi.target)))
        )}
      </TableCell>

      <TableCell>
        {editMode ? (
          <Select value={editOwner} onValueChange={setEditOwner}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm">{kpi.users?.full_name || "—"}</span>
        )}
      </TableCell>

      {editMode && (
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdits}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      )}

      {!editMode && (
        <>
          <TableCell>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter value"
                value={weekValue}
                onChange={(e) => setWeekValue(e.target.value)}
                className="w-24"
              />
              <Button size="sm" onClick={handleAddWeekValue} disabled={!weekValue.trim()}>
                Add
              </Button>
            </div>
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-2">
              <Badge variant={currentStatus as "success" | "danger" | "muted"}>
                {currentStatus === "success" ? "On Track" : currentStatus === "danger" ? "Off Track" : "No Data"}
              </Badge>
              {currentStatus === "danger" && latestReading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onCreateIssue(
                      kpi.name,
                      latestReading.week_start,
                      parseFloat(String(latestReading.value)),
                      parseFloat(String(kpi.target))
                    )
                  }
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Create Issue
                </Button>
              )}
            </div>
          </TableCell>

          <TableCell>
            <KpiSparkline data={trendData} className="h-8" />
          </TableCell>
        </>
      )}
    </TableRow>
  );
};
