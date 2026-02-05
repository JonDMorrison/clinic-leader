/**
 * PlaybookCandidateScanner - Shows pattern clusters that qualify for playbook generation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  Plus,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePlaybookCandidates,
  useGeneratePlaybook,
} from "@/hooks/usePlaybooks";
import { PLAYBOOK_THRESHOLDS } from "@/lib/interventions/playbookGenerator";
import type { PatternCluster } from "@/lib/interventions/interventionPatternService";

interface PlaybookCandidateScannerProps {
  className?: string;
}

export function PlaybookCandidateScanner({ className }: PlaybookCandidateScannerProps) {
  const { data: candidates = [], isLoading, refetch } = usePlaybookCandidates();
  const generateMutation = useGeneratePlaybook();

  const handleGenerate = (pattern: PatternCluster) => {
    generateMutation.mutate(pattern);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            Playbook Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4 text-primary" />
            Playbook Candidates
            {candidates.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {candidates.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            Scan
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Thresholds:</span>
          <span>≥{(PLAYBOOK_THRESHOLDS.minSuccessRate * 100).toFixed(0)}% success</span>
          <span>≥{PLAYBOOK_THRESHOLDS.minSampleSize} samples</span>
        </div>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No pattern clusters currently meet the thresholds for playbook generation. 
              Build more intervention history to unlock auto-generated playbooks.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {candidates.map((pattern) => (
              <CandidateRow
                key={pattern.id}
                pattern={pattern}
                onGenerate={handleGenerate}
                isGenerating={generateMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CandidateRow({
  pattern,
  onGenerate,
  isGenerating,
}: {
  pattern: PatternCluster;
  onGenerate: (pattern: PatternCluster) => void;
  isGenerating: boolean;
}) {
  const successPct = Math.round(pattern.successRate);
  const typeLabel = pattern.interventionType.replace(/_/g, " ");

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-sm truncate capitalize">
            {typeLabel}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {pattern.orgSizeBand}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <TrendingUp className={cn(
                  "h-3 w-3",
                  successPct >= 70 ? "text-green-600" : "text-primary"
                )} />
                <span className={cn(
                  successPct >= 70 ? "text-green-600" : ""
                )}>
                  {successPct}% success
                </span>
              </TooltipTrigger>
              <TooltipContent>Historical success rate</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {pattern.sampleSize} cases
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pattern.timeHorizonBand}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onGenerate(pattern)}
        disabled={isGenerating}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Generate
      </Button>
    </div>
  );
}
