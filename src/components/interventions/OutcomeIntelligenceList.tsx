/**
 * OutcomeIntelligenceList - Filterable/sortable list of outcome cards
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Filter, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { 
  OutcomeIntelligenceCard, 
  OutcomeIntelligenceCardSkeleton,
  type OutcomeIntelligenceData 
} from "./OutcomeIntelligenceCard";
import { 
  useOutcomeIntelligence, 
  type OutcomeFilterType, 
  type OutcomeSortField 
} from "@/hooks/useOutcomeIntelligence";

interface OutcomeIntelligenceListProps {
  organizationId: string;
  metricId?: string;
  title?: string;
  variant?: "compact" | "full";
  showFilters?: boolean;
  showHeader?: boolean;
  defaultCollapsed?: boolean;
  limit?: number;
  className?: string;
}

const FILTER_OPTIONS: { value: OutcomeFilterType; label: string }[] = [
  { value: "all", label: "All Outcomes" },
  { value: "successful", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "inconclusive", label: "Inconclusive" },
  { value: "at_risk", label: "At Risk" },
  { value: "pending", label: "Pending" },
];

const SORT_OPTIONS: { value: OutcomeSortField; label: string }[] = [
  { value: "recency", label: "Most Recent" },
  { value: "impact", label: "Highest Impact" },
  { value: "confidence", label: "Highest Confidence" },
];

export function OutcomeIntelligenceList({
  organizationId,
  metricId,
  title = "Intervention Outcomes",
  variant = "full",
  showFilters = true,
  showHeader = true,
  defaultCollapsed = false,
  limit = 10,
  className = "",
}: OutcomeIntelligenceListProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [filter, setFilter] = useState<OutcomeFilterType>("all");
  const [sortBy, setSortBy] = useState<OutcomeSortField>("recency");

  const { data: outcomes, isLoading } = useOutcomeIntelligence({
    organizationId,
    metricId,
    filter,
    sortBy,
    limit,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          <OutcomeIntelligenceCardSkeleton variant={variant} />
          <OutcomeIntelligenceCardSkeleton variant={variant} />
        </CardContent>
      </Card>
    );
  }

  if (!outcomes || outcomes.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {title}
              <Badge variant="outline">{outcomes.length}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 p-0"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
      )}

      {!collapsed && (
        <CardContent className="space-y-4">
          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={filter} onValueChange={(v) => setFilter(v as OutcomeFilterType)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as OutcomeSortField)}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Outcome Cards */}
          <div className={variant === "compact" ? "space-y-2" : "space-y-3"}>
            {outcomes.map((outcome) => (
              <OutcomeIntelligenceCard
                key={outcome.interventionId}
                data={outcome}
                variant={variant}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
