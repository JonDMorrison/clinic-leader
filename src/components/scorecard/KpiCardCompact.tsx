import { useState } from "react";
import { motion } from "framer-motion";
import { MoreVertical, Edit2, Trash2, Pause, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KpiCardCompactProps {
  kpi: any;
  onUpdate: () => void;
}

export const KpiCardCompact = ({ kpi, onUpdate }: KpiCardCompactProps) => {
  const [weekValue, setWeekValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTarget, setEditTarget] = useState(kpi.target?.toString() || "");
  const { toast } = useToast();

  const latestReading = kpi.kpi_readings?.[0];
  const last8Weeks = kpi.kpi_readings?.slice(0, 8).reverse() || [];
  const trendData = last8Weeks.map((r: any) => parseFloat(String(r.value)));

  const formatValue = (value: number) => {
    if (kpi.unit === "$") return `$${value.toLocaleString()}`;
    if (kpi.unit === "%") return `${value}%`;
    return value.toString();
  };

  const getStatus = () => {
    if (!latestReading || !kpi.target) return { status: "muted", label: "No Data" };
    
    const value = parseFloat(String(latestReading.value));
    const target = parseFloat(String(kpi.target));
    
    if (kpi.direction === ">=") {
      return value >= target 
        ? { status: "success", label: "On Track" }
        : { status: "danger", label: "Off Track" };
    } else if (kpi.direction === "<=") {
      return value <= target
        ? { status: "success", label: "On Track" }
        : { status: "danger", label: "Off Track" };
    }
    return { status: "muted", label: "No Target" };
  };

  const getTrendIcon = () => {
    if (trendData.length < 2) return <Minus className="w-4 h-4" />;
    const recent = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];
    
    if (recent > previous) return <TrendingUp className="w-4 h-4 text-success" />;
    if (recent < previous) return <TrendingDown className="w-4 h-4 text-danger" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Production: "bg-primary/20 text-primary",
      Financial: "bg-success/20 text-success",
      Referral: "bg-warning/20 text-warning",
      Operational: "bg-accent/20 text-accent",
      Quality: "bg-purple-500/20 text-purple-500",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  const handleAddValue = async () => {
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
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this KPI?")) return;

    try {
      const { error } = await supabase
        .from("kpis")
        .update({ active: false })
        .eq("id", kpi.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KPI deleted successfully",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from("kpis")
        .update({
          target: parseFloat(editTarget),
        })
        .eq("id", kpi.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KPI updated successfully",
      });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePause = async () => {
    try {
      const { error } = await supabase
        .from("kpis")
        .update({ active: false })
        .eq("id", kpi.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KPI paused successfully",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const status = getStatus();
  const borderColor = status.status === "success" 
    ? "border-success/50" 
    : status.status === "danger" 
    ? "border-danger/50" 
    : "border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 border-2 ${borderColor} transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{kpi.name}</h3>
          <Badge className={`${getCategoryColor(kpi.category)} text-xs`}>
            {kpi.category}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Target
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePause}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Tracking
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-danger">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Value & Target */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass rounded-xl p-3">
          <div className="text-2xl font-bold text-foreground">
            {latestReading ? formatValue(parseFloat(String(latestReading.value))) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">This Week</div>
        </div>
        <div className="glass rounded-xl p-3">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="number"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="h-8"
                placeholder="Target"
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditTarget(kpi.target?.toString() || "");
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 text-lg font-semibold text-foreground">
                Target: {kpi.target ? formatValue(parseFloat(String(kpi.target))) : "—"}
              </div>
              <Badge variant={status.status as "success" | "danger" | "muted"} className="mt-1">
                {status.label}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {trendData.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Last 8 Weeks</span>
            {getTrendIcon()}
          </div>
          <KpiSparkline data={trendData} className="h-12" />
        </div>
      )}

      {/* Add Value Section */}
      {isAdding ? (
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Enter value"
            value={weekValue}
            onChange={(e) => setWeekValue(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button size="sm" onClick={handleAddValue}>
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            setIsAdding(false);
            setWeekValue("");
          }}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          + Add This Week's Value
        </Button>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Owner: {kpi.users?.full_name || "Unassigned"}</span>
        {latestReading && (
          <span>Updated {new Date(latestReading.week_start).toLocaleDateString()}</span>
        )}
      </div>
    </motion.div>
  );
};
