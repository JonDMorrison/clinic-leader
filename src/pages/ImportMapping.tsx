import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Link as LinkIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { registerMapping, removeMapping } from "@/lib/imports/mappingService";
import { SmartMappingSuggestions } from "@/components/scorecard/SmartMappingSuggestions";

export default function ImportMapping() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [sourceSystem, setSourceSystem] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [transform, setTransform] = useState("");

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

  const { data: trackedKpis, isLoading } = useQuery({
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

  const createMappingMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id || !selectedKpi) return;
      return registerMapping(
        currentUser.team_id,
        selectedKpi.id,
        sourceSystem,
        sourceLabel,
        transform || undefined
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-kpis"] });
      toast({
        title: "Mapping created",
        description: "Data source mapping has been configured",
      });
      setMappingDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create mapping: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: removeMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-kpis"] });
      toast({
        title: "Mapping deleted",
        description: "Data source mapping has been removed",
      });
    },
  });

  const resetForm = () => {
    setSelectedKpi(null);
    setSourceSystem("");
    setSourceLabel("");
    setTransform("");
  };

  const openMappingDialog = (kpi: any) => {
    setSelectedKpi(kpi);
    setMappingDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 gradient-brand bg-clip-text text-transparent">
          KPI Data Mapping
        </h1>
        <p className="text-muted-foreground">
          Connect your tracked KPIs to data sources (Jane, CSV, Billing systems)
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading tracked KPIs...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentUser?.team_id && (
            <SmartMappingSuggestions 
              organizationId={currentUser.team_id}
            />
          )}
          
          <div className="grid gap-4">
          {trackedKpis?.map((kpi) => (
            <Card key={kpi.id} className="glass p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{kpi.name}</h3>
                    <Badge variant="muted" className="text-xs">
                      {kpi.category}
                    </Badge>
                    {kpi.import_mappings && kpi.import_mappings.length > 0 && (
                      <Badge variant="success" className="text-xs">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Mapped
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {kpi.description}
                  </p>
                  {kpi.import_mappings && kpi.import_mappings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {kpi.import_mappings.map((mapping: any) => (
                        <div
                          key={mapping.id}
                          className="flex items-center gap-2 bg-surface/50 px-3 py-1 rounded-lg"
                        >
                          <span className="text-xs font-mono">
                            {mapping.source_system}: {mapping.source_label}
                          </span>
                          <button
                            onClick={() => deleteMappingMutation.mutate(mapping.id)}
                            className="text-danger hover:text-danger/80"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => openMappingDialog(kpi)}
                  className="ml-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </div>
            </Card>
          ))}
          </div>
        </div>
      )}

      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Map Data Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">KPI</Label>
              <p className="text-muted-foreground mt-1">{selectedKpi?.name}</p>
            </div>
            <div>
              <Label htmlFor="source-system">Source System</Label>
              <Select value={sourceSystem} onValueChange={setSourceSystem}>
                <SelectTrigger id="source-system">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jane">Jane (EMR)</SelectItem>
                  <SelectItem value="csv">CSV Upload</SelectItem>
                  <SelectItem value="billing">Billing System</SelectItem>
                  <SelectItem value="quickbooks">QuickBooks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source-label">Source Field/Column</Label>
              <Input
                id="source-label"
                placeholder="e.g., appointments.completed"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="transform">Transform Logic (optional)</Label>
              <Textarea
                id="transform"
                placeholder='{"operation": "sum", "filter": "status=completed"}'
                value={transform}
                onChange={(e) => setTransform(e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                JSON describing how to transform source data
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMappingMutation.mutate()}
              disabled={!sourceSystem || !sourceLabel}
            >
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
