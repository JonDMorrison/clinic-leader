/**
 * InterventionSelector - Dropdown to link a to-do to an existing intervention
 * With option to create new intervention inline
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { QuickInterventionModal } from "./QuickInterventionModal";

interface InterventionSelectorProps {
  organizationId: string;
  value?: string | null;
  onChange: (interventionId: string | null) => void;
  disabled?: boolean;
  metricId?: string; // Pre-filter to interventions linked to this metric
  className?: string;
}

export function InterventionSelector({
  organizationId,
  value,
  onChange,
  disabled = false,
  metricId,
  className,
}: InterventionSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch active interventions for this org
  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ["intervention-selector", organizationId, metricId],
    queryFn: async () => {
      let query = supabase
        .from("interventions")
        .select(`
          id, 
          title, 
          status,
          intervention_metric_links!inner(metric_id)
        `)
        .eq("organization_id", organizationId)
        .in("status", ["active", "planned"])
        .order("created_at", { ascending: false })
        .limit(50);

      // If metricId provided, filter to interventions linked to that metric
      if (metricId) {
        query = query.eq("intervention_metric_links.metric_id", metricId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Also fetch all interventions without metric filter for general use
  const { data: allInterventions = [] } = useQuery({
    queryKey: ["intervention-selector-all", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("id, title, status")
        .eq("organization_id", organizationId)
        .in("status", ["active", "planned"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!metricId, // Only when filtering, need fallback
  });

  const displayInterventions = metricId && interventions.length === 0 
    ? allInterventions 
    : interventions;

  const selectedIntervention = displayInterventions.find((i) => i.id === value);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Select
          value={value || "none"}
          onValueChange={(val) => onChange(val === "none" ? null : val)}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Link to intervention (optional)">
              {selectedIntervention ? (
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="truncate">{selectedIntervention.title}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">No intervention</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No intervention</span>
            </SelectItem>
            {displayInterventions.map((int) => (
              <SelectItem key={int.id} value={int.id}>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="truncate max-w-[200px]">{int.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {int.status}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            onClick={() => setShowCreateModal(true)}
            title="Create new intervention"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {value && (
          <Link to={`/interventions/${value}`} target="_blank">
            <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {metricId && interventions.length === 0 && allInterventions.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Showing all interventions (none linked to this metric)
        </p>
      )}

      <QuickInterventionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        organizationId={organizationId}
        originContext={metricId ? { 
          originType: "manual", 
          preSelectedMetricId: metricId 
        } : undefined}
        onSuccess={(newInterventionId) => {
          onChange(newInterventionId);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}
