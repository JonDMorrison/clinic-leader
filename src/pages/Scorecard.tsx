import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiRow } from "@/components/scorecard/KpiRow";
import { IssueModal } from "@/components/scorecard/IssueModal";
import { AddKpiModal } from "@/components/scorecard/AddKpiModal";

const Scorecard = () => {
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [addKpiModalOpen, setAddKpiModalOpen] = useState(false);
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

  const handleCreateIssue = (kpiName: string, week: string, value: number, target: number) => {
    setIssuePrefillData({ kpiName, week, value, target });
    setIssueModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Scorecard</h1>
          <p className="text-muted-foreground">Track and manage your key performance indicators</p>
        </div>
        <Button onClick={() => setAddKpiModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add KPI
        </Button>
      </div>

      <Card>
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
              <p className="text-muted-foreground mb-4">No KPIs yet. Add your first KPI to start tracking.</p>
              <Button onClick={() => setAddKpiModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First KPI
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Scorecard;
