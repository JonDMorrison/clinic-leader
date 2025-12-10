import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Target, Mountain, Lightbulb, Calendar, User } from "lucide-react";
import { VTOImpactBadge, VTOImpactSectionList } from "./VTOImpactBadge";
import { format } from "date-fns";

interface VTOHistoryEntry {
  id: string;
  vto_version: number;
  changed_at: string;
  changed_by: string;
  vto_snapshot: any;
  scorecard_snapshot: any[];
  rocks_snapshot: any[];
  change_summary: string;
  impacted_sections: string[];
  scorecard_impact: any;
  rocks_impact: any;
  ai_insights: string | null;
}

interface VTOHistorySnapshotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: VTOHistoryEntry | null;
  userName?: string;
}

export function VTOHistorySnapshotModal({
  open,
  onOpenChange,
  entry,
  userName,
}: VTOHistorySnapshotModalProps) {
  if (!entry) return null;

  const snapshot = entry.vto_snapshot || {};

  const handleExportPdf = () => {
    // TODO: Implement PDF export
    console.log('Export to PDF', entry);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                VTO Snapshot - Version {entry.vto_version}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                <Calendar className="inline h-3 w-3 mr-1" />
                {format(new Date(entry.changed_at), 'PPP p')}
                {userName && (
                  <span className="ml-2">
                    <User className="inline h-3 w-3 mr-1" />
                    {userName}
                  </span>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          <div className="mt-4">
            <VTOImpactBadge
              impactedSections={entry.impacted_sections}
              scorecardImpact={entry.scorecard_impact}
              rocksImpact={entry.rocks_impact}
            />
          </div>

          {entry.change_summary && (
            <p className="text-sm text-muted-foreground mt-2 border-l-2 border-primary/30 pl-3">
              {entry.change_summary}
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue="vto" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="vto" className="gap-2">
              <FileText className="h-4 w-4" />
              VTO Content
            </TabsTrigger>
            <TabsTrigger value="scorecard" className="gap-2">
              <Target className="h-4 w-4" />
              Scorecard ({entry.scorecard_snapshot?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="rocks" className="gap-2">
              <Mountain className="h-4 w-4" />
              Rocks ({entry.rocks_snapshot?.length || 0})
            </TabsTrigger>
            {entry.ai_insights && (
              <TabsTrigger value="insights" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Insights
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="vto" className="m-0">
              <div className="space-y-4">
                {/* Core Values */}
                {snapshot.core_values?.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Core Values</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {snapshot.core_values.map((value: string, i: number) => (
                          <Badge key={i} variant="secondary">{value}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Core Focus */}
                {(snapshot.core_focus?.purpose || snapshot.core_focus?.niche) && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Core Focus</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2">
                      {snapshot.core_focus.purpose && (
                        <div>
                          <span className="text-xs text-muted-foreground">Purpose:</span>
                          <p className="text-sm">{snapshot.core_focus.purpose}</p>
                        </div>
                      )}
                      {snapshot.core_focus.niche && (
                        <div>
                          <span className="text-xs text-muted-foreground">Niche:</span>
                          <p className="text-sm">{snapshot.core_focus.niche}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 10-Year Target */}
                {snapshot.ten_year_target && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">10-Year Target</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-sm">{snapshot.ten_year_target}</p>
                    </CardContent>
                  </Card>
                )}

                {/* 3-Year Picture */}
                {snapshot.three_year_picture && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">3-Year Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2">
                      {snapshot.three_year_picture.revenue && (
                        <p className="text-sm">Revenue: ${Number(snapshot.three_year_picture.revenue).toLocaleString()}</p>
                      )}
                      {snapshot.three_year_picture.profit && (
                        <p className="text-sm">Profit: {snapshot.three_year_picture.profit}%</p>
                      )}
                      {snapshot.three_year_picture.measurables?.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Measurables:</span>
                          <ul className="list-disc list-inside text-sm">
                            {snapshot.three_year_picture.measurables.map((m: string, i: number) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 1-Year Plan */}
                {snapshot.one_year_plan?.goals?.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">1-Year Goals</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {snapshot.one_year_plan.goals.map((goal: any, i: number) => (
                          <li key={i}>{typeof goal === 'string' ? goal : goal.title || goal.description}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="scorecard" className="m-0">
              {entry.scorecard_snapshot?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.scorecard_snapshot.map((metric: any) => (
                      <TableRow key={metric.id}>
                        <TableCell className="font-medium">{metric.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{metric.category}</Badge>
                        </TableCell>
                        <TableCell>{metric.target}</TableCell>
                        <TableCell>{metric.direction}</TableCell>
                        <TableCell className="text-muted-foreground">{metric.owner || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No scorecard metrics at this snapshot</p>
              )}
            </TabsContent>

            <TabsContent value="rocks" className="m-0">
              {entry.rocks_snapshot?.length > 0 ? (
                <div className="grid gap-3">
                  {entry.rocks_snapshot.map((rock: any) => (
                    <Card key={rock.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{rock.title}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{rock.quarter}</Badge>
                              <Badge variant={rock.status === 'complete' ? 'default' : 'secondary'}>
                                {rock.status}
                              </Badge>
                            </div>
                          </div>
                          {rock.confidence && (
                            <Badge variant="outline">{rock.confidence}% confidence</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No rocks at this snapshot</p>
              )}
            </TabsContent>

            {entry.ai_insights && (
              <TabsContent value="insights" className="m-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Strategic Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm whitespace-pre-wrap">{entry.ai_insights}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
