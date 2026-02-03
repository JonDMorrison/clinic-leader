import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, Clock } from "lucide-react";
import {
  INTERVENTION_STATUS_OPTIONS,
  INTERVENTION_TYPE_OPTIONS,
  type InterventionStatus,
  type InterventionType,
} from "@/lib/interventions/types";
import type { ProgressStatus } from "@/lib/interventions/interventionStatus";

export type ProgressFilterType = "all" | "at_risk" | "overdue";

interface InterventionFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: InterventionStatus | "all";
  onStatusChange: (value: InterventionStatus | "all") => void;
  typeFilter: InterventionType | "all";
  onTypeChange: (value: InterventionType | "all") => void;
  progressFilter?: ProgressFilterType;
  onProgressFilterChange?: (value: ProgressFilterType) => void;
  atRiskCount?: number;
  overdueCount?: number;
}

export function InterventionFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  progressFilter = "all",
  onProgressFilterChange,
  atRiskCount = 0,
  overdueCount = 0,
}: InterventionFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Quick filter buttons for risk/overdue */}
      {onProgressFilterChange && (atRiskCount > 0 || overdueCount > 0) && (
        <div className="flex gap-2">
          <Button
            variant={progressFilter === "at_risk" ? "default" : "outline"}
            size="sm"
            onClick={() => onProgressFilterChange(progressFilter === "at_risk" ? "all" : "at_risk")}
            className={progressFilter === "at_risk" 
              ? "bg-yellow-600 hover:bg-yellow-700" 
              : "border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950"
            }
            disabled={atRiskCount === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            At Risk ({atRiskCount})
          </Button>
          <Button
            variant={progressFilter === "overdue" ? "default" : "outline"}
            size="sm"
            onClick={() => onProgressFilterChange(progressFilter === "overdue" ? "all" : "overdue")}
            className={progressFilter === "overdue" 
              ? "bg-red-600 hover:bg-red-700" 
              : "border-red-500 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            }
            disabled={overdueCount === 0}
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Overdue ({overdueCount})
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search interventions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as InterventionStatus | "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {INTERVENTION_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as InterventionType | "all")}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {INTERVENTION_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
