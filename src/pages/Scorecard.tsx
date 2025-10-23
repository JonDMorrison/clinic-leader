import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/button";
import { Plus, Activity, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiRow } from "@/components/scorecard/KpiRow";
import { IssueModal } from "@/components/scorecard/IssueModal";
import { AddKpiModal } from "@/components/scorecard/AddKpiModal";
import { TrackedKpiCard } from "@/components/scorecard/TrackedKpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadDefaultsDialog } from "@/components/scorecard/LoadDefaultsDialog";
import { EmptyState } from "@/components/ui/EmptyState";

const Scorecard = () => {
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [addKpiModalOpen, setAddKpiModalOpen] = useState(false);
  const [loadDefaultsOpen, setLoadDefaultsOpen] = useState(false);
  const [issuePrefillData, setIssuePrefillData] = useState<any>(null);

  const { data: kpis, isLoading, refetch } = useQuery({
    queryKey: ["kpis-detailed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*, kpi_readings(value, week_start), users(full_name)")
        .eq("active", true)
        .order("category")
        .order("week_start", { foreignTable: "kpi_readings", ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", authData.user.email)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: trackedKpis, isLoading: trackedLoading } = useQuery({
    queryKey: ["tracked-kpis", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("tracked_kpis")
        .select(`
          *,
          users(full_name),
          import_mappings(id, source_system, source_label)
        `)
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true)
        .order("category")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const handleCreateIssue = (kpiName: string, week: string, value: number, target: number) => {
    setIssuePrefillData({ kpiName, week, value, target });
    setIssueModalOpen(true);
  };

  const groupedTrackedKpis = trackedKpis?.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, any[]>);

  const hasAnyKpis = (kpis && kpis.length > 0) || (trackedKpis && trackedKpis.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 gradient-brand bg-clip-text text-transparent">
            Scorecard
          </h1>
          <p className="text-muted-foreground">Track and manage your key performance indicators</p>
        </div>
        <div className="flex gap-2">
          {hasAnyKpis && (
            <Button onClick={() => setLoadDefaultsOpen(true)} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Load Defaults
            </Button>
          )}
          <Button onClick={() => setAddKpiModalOpen(true)} className="gradient-brand">
            <Plus className="w-4 h-4 mr-2" />
            Add KPI
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tracked" className="w-full">
        <TabsList className="glass mb-6">
          <TabsTrigger value="tracked" className="gap-2">
            <Activity className="h-4 w-4" />
            Tracked KPIs
          </TabsTrigger>
          <TabsTrigger value="weekly">Weekly Scorecard</TabsTrigger>
        </TabsList>

        <TabsContent value="tracked" className="space-y-6">
          {trackedLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading tracked KPIs...</p>
            </div>
          ) : !trackedKpis || trackedKpis.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-12 w-12" />}
              title="No KPIs yet"
              description="Start tracking your clinic's performance with industry-standard KPIs"
              action={
                <Button onClick={() => setLoadDefaultsOpen(true)} className="gradient-brand">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Load Default KPIs
                </Button>
              }
            />
          ) : (
            <>
              {Object.entries(groupedTrackedKpis || {}).map(([category, categoryKpis]) => (
                <div key={category}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span className="gradient-brand bg-clip-text text-transparent">{category}</span>
                    <span className="text-sm text-muted-foreground">({categoryKpis.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryKpis.map((kpi) => (
                      <TrackedKpiCard key={kpi.id} kpi={kpi} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Weekly Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading metrics...</p>
              ) : kpis && kpis.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>This Week</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Trend (Last 8 Weeks)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpis.map((kpi) => (
                        <KpiRow
                          key={kpi.id}
                          kpi={kpi}
                          users={users || []}
                          onUpdate={refetch}
                          onCreateIssue={handleCreateIssue}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No KPIs with data yet. Add your first KPI to start tracking.</p>
                  <Button onClick={() => setAddKpiModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First KPI
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <IssueModal
        open={issueModalOpen}
        onClose={() => {
          setIssueModalOpen(false);
          setIssuePrefillData(null);
        }}
        prefillData={issuePrefillData}
        users={users || []}
        teamId={currentUser?.team_id || null}
        onSuccess={refetch}
      />

      <AddKpiModal
        open={addKpiModalOpen}
        onClose={() => setAddKpiModalOpen(false)}
        users={users || []}
        onSuccess={refetch}
      />

      <LoadDefaultsDialog
        open={loadDefaultsOpen}
        onOpenChange={setLoadDefaultsOpen}
        organizationId={currentUser?.team_id || ""}
      />
    </div>
  );
};

export default Scorecard;
