import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Target, ChevronDown, ChevronUp } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IssueModal } from "@/components/scorecard/IssueModal";
import { AddKpiModal } from "@/components/scorecard/AddKpiModal";
import { LoadDefaultsDialog } from "@/components/scorecard/LoadDefaultsDialog";
import { KpiCardCompact } from "@/components/scorecard/KpiCardCompact";
import { ScorecardOnboardingWizard } from "@/components/scorecard/ScorecardOnboardingWizard";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Scorecard = () => {
  const [addKpiModalOpen, setAddKpiModalOpen] = useState(false);
  const [loadDefaultsOpen, setLoadDefaultsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

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

  const groupedKpis = kpis?.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, any[]>);

  const groupedTrackedKpis = trackedKpis?.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate quick stats
  const totalKpis = kpis?.length || 0;
  const onTrackCount = kpis?.filter(kpi => {
    const latestReading = kpi.kpi_readings?.[0];
    if (!latestReading || !kpi.target) return false;
    const value = parseFloat(String(latestReading.value));
    const target = parseFloat(String(kpi.target));
    
    if (kpi.direction === ">=") return value >= target;
    if (kpi.direction === "<=") return value <= target;
    return false;
  }).length || 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-2 flex items-center">
            Scorecard
            <HelpHint term="Scorecard" context="scorecard_header" />
          </h1>
          {totalKpis > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="muted">
                <Target className="w-3 h-3 mr-1" />
                {totalKpis} KPIs tracked
              </Badge>
              <Badge variant="success">
                {onTrackCount} on target this week
              </Badge>
            </div>
          )}
        </div>
        
        {totalKpis > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gradient-brand">
                <Plus className="w-4 h-4 mr-2" />
                New KPI
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLoadDefaultsOpen(true)}>
                Quick Start (Load Defaults)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddKpiModalOpen(true)}>
                Custom KPI
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your scorecard...</p>
        </div>
      ) : totalKpis === 0 ? (
        <ScorecardOnboardingWizard
          onQuickStart={() => setLoadDefaultsOpen(true)}
          onCustomKpi={() => setAddKpiModalOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* Active KPIs Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center">
                Your Active KPIs
                <HelpHint term="KPI" context="scorecard_active_kpis" size="sm" />
              </h2>
              <p className="text-sm text-muted-foreground">
                💡 Tip: Click "+ Add This Week's Value" to update metrics
              </p>
            </div>

            {Object.entries(groupedKpis || {}).map(([category, categoryKpis]) => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="gradient-brand bg-clip-text text-transparent">
                    {category}
                  </span>
                  <Badge variant="muted" className="text-xs">
                    {categoryKpis.length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryKpis.map((kpi) => (
                    <KpiCardCompact key={kpi.id} kpi={kpi} onUpdate={refetch} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Available Templates Section - Collapsible */}
          {trackedKpis && trackedKpis.length > 0 && (
            <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <section className="glass rounded-2xl p-6 border border-border">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        Browse KPI Templates
                      </h3>
                      <Badge variant="muted">{trackedKpis.length} available</Badge>
                    </div>
                    {templatesOpen ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Pre-configured KPIs you can start tracking with one click
                  </p>
                  
                  {Object.entries(groupedTrackedKpis || {}).map(([category, categoryKpis]) => (
                    <div key={category} className="mb-6">
                      <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryKpis.map((kpi: any) => (
                          <div
                            key={kpi.id}
                            className="glass rounded-xl p-4 border border-border hover:border-primary/40 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-foreground mb-1">{kpi.name}</h5>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {kpi.description}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" className="ml-2">
                                Track
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    onClick={() => setLoadDefaultsOpen(true)}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Load More Templates
                  </Button>
                </CollapsibleContent>
              </section>
            </Collapsible>
          )}
        </div>
      )}

      {/* Modals */}
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
