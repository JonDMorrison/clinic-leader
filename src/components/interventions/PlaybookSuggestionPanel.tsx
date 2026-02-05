/**
 * PlaybookSuggestionPanel - Surface playbooks in recommendations UI
 * Shows approved playbooks relevant to the current metric
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Sparkles } from "lucide-react";
import { PlaybookCard } from "./PlaybookCard";
import { useApprovedPlaybooks } from "@/hooks/usePlaybooks";
import type { Playbook } from "@/lib/interventions/playbookGenerator";

interface PlaybookSuggestionPanelProps {
  metricId?: string;
  onSelectPlaybook?: (playbook: Playbook) => void;
  className?: string;
  maxItems?: number;
}

export function PlaybookSuggestionPanel({
  metricId,
  onSelectPlaybook,
  className,
  maxItems = 3,
}: PlaybookSuggestionPanelProps) {
  const { data: playbooks = [], isLoading } = useApprovedPlaybooks();

  // Filter playbooks relevant to this metric if provided
  const relevantPlaybooks = metricId
    ? playbooks.filter(
        (p) => p.expectedMetricMovement?.metricId === metricId
      )
    : playbooks;

  // Sort by success rate and limit
  const displayPlaybooks = relevantPlaybooks
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, maxItems);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            Playbooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayPlaybooks.length === 0) {
    return null; // Don't show panel if no relevant playbooks
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            Proven Playbooks
            <Badge variant="secondary" className="text-[10px]">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              {displayPlaybooks.length}
            </Badge>
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Operational playbooks from successful intervention patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayPlaybooks.map((playbook) => (
          <PlaybookCard
            key={playbook.id}
            playbook={playbook}
            compact
            showActions={!!onSelectPlaybook}
            onUse={onSelectPlaybook}
          />
        ))}
      </CardContent>
    </Card>
  );
}
