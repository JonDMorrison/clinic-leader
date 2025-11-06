import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to trigger VTO progress recomputation when linked entities change
 * AND auto-populate L10 meeting KPI snapshots
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

    const updateL10KpiSnapshot = async () => {
      console.log('Updating L10 KPI snapshot for latest meeting');
      try {
        // Get the latest L10 meeting
        const { data: latestMeeting } = await supabase
          .from('meetings')
          .select('id')
          .eq('organization_id', teamId)
          .eq('type', 'L10')
          .order('scheduled_for', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestMeeting) return;

        // Get current week's metric results
        const { data: metrics } = await supabase
          .from('metrics')
          .select(`
            id,
            name,
            category,
            unit,
            target,
            direction,
            metric_results!inner(value, week_start)
          `)
          .eq('organization_id', teamId)
          .order('category');

        if (!metrics) return;

        // Build KPI snapshot
        const kpiSnapshot = metrics.map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          value: m.metric_results?.[0]?.value || null,
          target: m.target,
          unit: m.unit,
          direction: m.direction,
        }));

        // Update meeting notes
        await supabase
          .from('meeting_notes')
          .upsert({
            meeting_id: latestMeeting.id,
            kpi_snapshot: kpiSnapshot,
          }, {
            onConflict: 'meeting_id'
          });

        console.log('L10 KPI snapshot updated');
      } catch (error) {
        console.error('Error updating L10 KPI snapshot:', error);
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
          filter: `status=neq.${null}`,
        },
        () => triggerComputeProgress('rock_status_change')
      )
      .subscribe();

    // Listen for KPI readings - trigger both VTO and L10 update
    const kpiReadingsChannel = supabase
      .channel('vto-kpi-readings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kpi_readings',
        },
        () => {
          triggerComputeProgress('kpi_reading_added');
          updateL10KpiSnapshot();
        }
      )
      .subscribe();

    // Listen for metric_results changes - also update L10
    const metricResultsChannel = supabase
      .channel('vto-metric-results-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metric_results',
        },
        () => {
          updateL10KpiSnapshot();
        }
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
      supabase.removeChannel(metricResultsChannel);
      supabase.removeChannel(issuesChannel);
    };
  }, [teamId]);
}
