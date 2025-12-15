import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Archive, Link2, History, Database } from "lucide-react";
import {
  fetchDuplicateGroups,
  checkMetricLinks,
  archiveDuplicates,
  type DuplicateGroup,
} from "@/lib/scorecard/duplicateResolver";

interface ResolveDuplicatesSectionProps {
  orgId: string;
  isAdmin: boolean;
  duplicateCount: number;
  onResolved: () => void;
}

export function ResolveDuplicatesSection({
  orgId,
  isAdmin,
  duplicateCount,
  onResolved,
}: ResolveDuplicatesSectionProps) {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCanonical, setSelectedCanonical] = useState<Record<string, string>>({});
  const [pendingLinks, setPendingLinks] = useState<{ rockLinks: number; vtoLinks: number } | null>(null);

  // Fetch duplicate groups with usage stats
  const { data: duplicateGroups, isLoading, refetch } = useQuery({
    queryKey: ['duplicate-groups', orgId],
    queryFn: () => fetchDuplicateGroups(orgId),
    enabled: !!orgId && duplicateCount > 0,
  });

  // Pre-select the metric with most results or oldest if tied
  const getDefaultSelection = (group: DuplicateGroup): string => {
    const sorted = [...group.metrics].sort((a, b) => {
      if (b.result_count !== a.result_count) return b.result_count - a.result_count;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return sorted[0]?.id || '';
  };

  // Initialize selections when data loads
  const selections = duplicateGroups?.reduce((acc, group) => {
    acc[group.normalizedName] = selectedCanonical[group.normalizedName] || getDefaultSelection(group);
    return acc;
  }, {} as Record<string, string>) || {};

  const handleSelectionChange = (groupName: string, metricId: string) => {
    setSelectedCanonical(prev => ({ ...prev, [groupName]: metricId }));
  };

  // Check for links before confirming
  const handleInitiateArchive = async () => {
    if (!duplicateGroups) return;

    // Collect all metrics that would be archived
    const toArchiveIds: string[] = [];
    duplicateGroups.forEach(group => {
      const keepId = selections[group.normalizedName];
      group.metrics.forEach(m => {
        if (m.id !== keepId) toArchiveIds.push(m.id);
      });
    });

    // Check for existing links
    const links = await checkMetricLinks(toArchiveIds, orgId);
    setPendingLinks(links);
    setShowConfirmDialog(true);
  };

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!duplicateGroups) return 0;
      
      let totalArchived = 0;
      for (const group of duplicateGroups) {
        const keepId = selections[group.normalizedName];
        if (!keepId) continue;
        
        const allIds = group.metrics.map(m => m.id);
        const archived = await archiveDuplicates(keepId, allIds, orgId);
        totalArchived += archived;
      }
      return totalArchived;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['template-health'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-groups'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      setShowConfirmDialog(false);
      setPendingLinks(null);
      toast.success(`Duplicates resolved. Archived ${count} metrics removed from active scorecard.`);
      onResolved();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive duplicates');
    },
  });

  if (duplicateCount === 0) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading duplicate metrics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!duplicateGroups || duplicateGroups.length === 0) return null;

  const totalToArchive = duplicateGroups.reduce((sum, g) => sum + g.metrics.length - 1, 0);
  const allSelected = duplicateGroups.every(g => selections[g.normalizedName]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Resolve Duplicate Metrics ({duplicateGroups.length} groups)
          </CardTitle>
          <CardDescription>
            Select one canonical metric per group to keep active. Others will be archived (historical data preserved).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {duplicateGroups.map(group => (
            <div key={group.normalizedName} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-medium">{group.displayName}</h4>
                <p className="text-sm text-muted-foreground">
                  {group.metrics.length} duplicates found
                </p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Keep</TableHead>
                    <TableHead>ID (short)</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Import Key</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Database className="w-3 h-3" />
                        Results
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <History className="w-3 h-3" />
                        Last Period
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <RadioGroup
                    value={selections[group.normalizedName] || ''}
                    onValueChange={(val) => handleSelectionChange(group.normalizedName, val)}
                    disabled={!isAdmin}
                  >
                    {group.metrics.map(metric => (
                      <TableRow 
                        key={metric.id}
                        className={selections[group.normalizedName] === metric.id ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <RadioGroupItem value={metric.id} id={metric.id} disabled={!isAdmin} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {metric.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(metric.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {metric.owner || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {metric.target !== null ? metric.target : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {metric.import_key ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {metric.import_key}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {metric.result_count}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {metric.last_result_period_key || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </RadioGroup>
                </TableBody>
              </Table>
            </div>
          ))}

          {isAdmin && (
            <div className="flex justify-end">
              <Button
                onClick={handleInitiateArchive}
                disabled={!allSelected}
              >
                <Archive className="w-4 h-4 mr-2" />
                Keep Selected, Archive {totalToArchive} Others
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Archive</DialogTitle>
            <DialogDescription>
              This will archive {totalToArchive} duplicate metrics and remove them from active scorecards, imports, and mappings. Historical results will remain.
            </DialogDescription>
          </DialogHeader>

          {pendingLinks && (pendingLinks.rockLinks > 0 || pendingLinks.vtoLinks > 0) && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Link2 className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Warning:</strong> Some archived metrics have existing links:
                <ul className="list-disc list-inside mt-1">
                  {pendingLinks.rockLinks > 0 && (
                    <li>{pendingLinks.rockLinks} rock link(s) - remap to canonical metric</li>
                  )}
                  {pendingLinks.vtoLinks > 0 && (
                    <li>{pendingLinks.vtoLinks} VTO link(s) - remap to canonical metric</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archive Duplicates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
