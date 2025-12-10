import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Eye,
  GitCompare,
  RotateCcw,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { VTOHistorySnapshotModal } from "@/components/vto/VTOHistorySnapshotModal";
import { VTOCompareModal } from "@/components/vto/VTOCompareModal";
import { VTOImpactBadge, VTOImpactSectionList } from "@/components/vto/VTOImpactBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VTOHistoryEntry {
  id: string;
  organization_id: string;
  vto_version_id: string | null;
  vto_version: number;
  changed_by: string;
  changed_at: string;
  vto_snapshot: any;
  scorecard_snapshot: any[];
  rocks_snapshot: any[];
  change_summary: string;
  impacted_sections: string[];
  scorecard_impact: any;
  rocks_impact: any;
  ai_insights: string | null;
  tags: string[];
  is_manual: boolean;
}

export default function VTOHistory() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const orgId = currentUser?.team_id;
  const [selectedEntry, setSelectedEntry] = useState<VTOHistoryEntry | null>(null);
  const [compareEntry, setCompareEntry] = useState<VTOHistoryEntry | null>(null);
  const [previousEntry, setPreviousEntry] = useState<VTOHistoryEntry | null>(null);
  const [restoreEntry, setRestoreEntry] = useState<VTOHistoryEntry | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));

  const { data: history, isLoading } = useQuery({
    queryKey: ['vto-history', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('vto_history')
        .select('*')
        .eq('organization_id', orgId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as VTOHistoryEntry[];
    },
    enabled: !!orgId,
  });

  const { data: users } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: async () => {
      if (!orgId) return {};

      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('team_id', orgId);

      const userMap: Record<string, string> = {};
      data?.forEach(u => { userMap[u.id] = u.full_name; });
      return userMap;
    },
    enabled: !!orgId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (historyId: string) => {
      const { data, error } = await supabase.functions.invoke('vto-restore-version', {
        body: { history_id: historyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('VTO restored as a new draft. Review and publish when ready.');
      queryClient.invalidateQueries({ queryKey: ['vto-history'] });
      queryClient.invalidateQueries({ queryKey: ['vto-versions'] });
      setRestoreEntry(null);
    },
    onError: (error: any) => {
      toast.error('Failed to restore VTO: ' + (error.message || 'Unknown error'));
    },
  });

  // Group history by year
  const historyByYear = history?.reduce((acc, entry) => {
    const year = new Date(entry.changed_at).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(entry);
    return acc;
  }, {} as Record<number, VTOHistoryEntry[]>) || {};

  const years = Object.keys(historyByYear).map(Number).sort((a, b) => b - a);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const handleCompare = (entry: VTOHistoryEntry, index: number, yearEntries: VTOHistoryEntry[]) => {
    setCompareEntry(entry);
    // Find the previous entry
    const prev = yearEntries[index + 1] || null;
    setPreviousEntry(prev);
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            VTO Evolution Timeline
          </h1>
          <p className="text-muted-foreground">
            Track strategic changes over time with snapshots of your Scorecard and Rocks
          </p>
        </div>
      </div>

      {!history?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No VTO History Yet</h3>
            <p className="text-muted-foreground">
              VTO snapshots will appear here as you make updates to your strategic plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 pr-4">
            {years.map(year => (
              <Card key={year}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleYear(year)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {year}
                      <Badge variant="secondary">{historyByYear[year].length} versions</Badge>
                    </span>
                    {expandedYears.has(year) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </CardTitle>
                </CardHeader>

                {expandedYears.has(year) && (
                  <CardContent className="pt-0">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                      <div className="space-y-4">
                        {historyByYear[year].map((entry, index) => (
                          <div key={entry.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                            <Card className="hover:shadow-md transition-shadow">
                              <CardContent className="py-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline">v{entry.vto_version}</Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {format(new Date(entry.changed_at), 'PPp')}
                                      </span>
                                      {users?.[entry.changed_by] && (
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {users[entry.changed_by]}
                                        </span>
                                      )}
                                    </div>

                                    {entry.change_summary && (
                                      <p className="text-sm mb-2">{entry.change_summary}</p>
                                    )}

                                    <div className="mb-2">
                                      <VTOImpactBadge
                                        impactedSections={entry.impacted_sections}
                                        scorecardImpact={entry.scorecard_impact}
                                        rocksImpact={entry.rocks_impact}
                                        compact
                                      />
                                    </div>

                                    <VTOImpactSectionList sections={entry.impacted_sections} />
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedEntry(entry)}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                    {index < historyByYear[year].length - 1 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCompare(entry, index, historyByYear[year])}
                                      >
                                        <GitCompare className="h-4 w-4 mr-1" />
                                        Compare
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setRestoreEntry(entry)}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Restore
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Snapshot Modal */}
      <VTOHistorySnapshotModal
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        entry={selectedEntry}
        userName={selectedEntry ? users?.[selectedEntry.changed_by] : undefined}
      />

      {/* Compare Modal */}
      <VTOCompareModal
        open={!!compareEntry && !!previousEntry}
        onOpenChange={(open) => {
          if (!open) {
            setCompareEntry(null);
            setPreviousEntry(null);
          }
        }}
        currentEntry={compareEntry}
        previousEntry={previousEntry}
      />

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreEntry} onOpenChange={(open) => !open && setRestoreEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore VTO Version {restoreEntry?.vto_version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new draft version of your VTO based on this snapshot.
              Your current Scorecard and Rocks will not be automatically changed.
              Alignment tools will be available to sync them with the restored version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreEntry && restoreMutation.mutate(restoreEntry.id)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? 'Restoring...' : 'Restore as Draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
