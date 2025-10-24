import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to trigger VTO progress recomputation when linked entities change
 * This ensures traction scores stay up-to-date
 */
export function useVTORealtimeSync(teamId: string | undefined) {
  useEffect(() => {
    if (!teamId) return;

    const triggerComputeProgress = async (type: string) => {
      console.log(`VTO: ${type} changed, triggering progress compute`);
      try {
        await supabase.functions.invoke('vto-trigger-compute', {
          body: { teamId, triggerType: type }
        });
      } catch (error) {
        console.error('Error triggering VTO compute:', error);
      }
    };

    // Listen for Rock status changes
    const rocksChannel = supabase
      .channel('vto-rocks-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rocks',
          filter: `status=neq.${null}`, // Only when status changes
        },
        () => triggerComputeProgress('rock_status_change')
      )
      .subscribe();

    // Listen for KPI readings
    const kpiReadingsChannel = supabase
      .channel('vto-kpi-readings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kpi_readings',
        },
        () => triggerComputeProgress('kpi_reading_added')
      )
      .subscribe();

    // Listen for Issue status changes
    const issuesChannel = supabase
      .channel('vto-issues-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
          filter: `status=neq.${null}`,
        },
        () => triggerComputeProgress('issue_status_change')
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rocksChannel);
      supabase.removeChannel(kpiReadingsChannel);
      supabase.removeChannel(issuesChannel);
    };
  }, [teamId]);
}
