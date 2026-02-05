/**
 * Hook for Assisted Intervention Detection
 * 
 * Manages detection state, dismissals, and provides actions for
 * confirming, editing, or dismissing detected interventions.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  runAssistedDetection, 
  type DetectedIntervention,
  type DetectionSignalType,
} from "@/lib/interventions/assistedInterventionDetection";

interface UseAssistedInterventionDetectionOptions {
  organizationId: string | undefined;
  enabled?: boolean;
  pollInterval?: number; // In milliseconds, 0 to disable
}

interface DismissedDetection {
  id: string;
  dismissedAt: Date;
}

// Session-level storage for dismissed detections
const dismissedDetectionsStorage = new Map<string, DismissedDetection[]>();

export function useAssistedInterventionDetection({
  organizationId,
  enabled = true,
  pollInterval = 0,
}: UseAssistedInterventionDetectionOptions) {
  const queryClient = useQueryClient();
  
  // Get dismissed detections for this org
  const getDismissed = useCallback((): DismissedDetection[] => {
    if (!organizationId) return [];
    return dismissedDetectionsStorage.get(organizationId) || [];
  }, [organizationId]);

  // Fetch detections
  const {
    data: rawDetections,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["assisted-intervention-detection", organizationId],
    queryFn: async () => {
      if (!organizationId) return { detections: [], hasDetections: false };
      return runAssistedDetection(organizationId);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: pollInterval > 0 ? pollInterval : undefined,
  });

  // Filter out dismissed detections
  const detections = useMemo(() => {
    if (!rawDetections?.detections) return [];
    
    const dismissed = getDismissed();
    const dismissedIds = new Set(dismissed.map(d => d.id));
    
    return rawDetections.detections.filter(d => !dismissedIds.has(d.id));
  }, [rawDetections, getDismissed]);

  // Dismiss a detection
  const dismissDetection = useCallback((detectionId: string) => {
    if (!organizationId) return;
    
    const current = dismissedDetectionsStorage.get(organizationId) || [];
    dismissedDetectionsStorage.set(organizationId, [
      ...current,
      { id: detectionId, dismissedAt: new Date() },
    ]);
    
    // Force re-render by invalidating the query
    queryClient.invalidateQueries({ 
      queryKey: ["assisted-intervention-detection", organizationId] 
    });
  }, [organizationId, queryClient]);

  // Clear all dismissals (useful for testing)
  const clearDismissals = useCallback(() => {
    if (!organizationId) return;
    dismissedDetectionsStorage.delete(organizationId);
    queryClient.invalidateQueries({ 
      queryKey: ["assisted-intervention-detection", organizationId] 
    });
  }, [organizationId, queryClient]);

  // Filter detections by signal type
  const filterByType = useCallback(
    (type: DetectionSignalType): DetectedIntervention[] => {
      return detections.filter(d => d.signalType === type);
    },
    [detections]
  );

  // Get highest priority detection
  const highestPriority = useMemo(() => {
    if (detections.length === 0) return null;
    return detections.reduce((highest, current) => 
      current.confidence > highest.confidence ? current : highest
    );
  }, [detections]);

  return {
    detections,
    hasDetections: detections.length > 0,
    highestPriority,
    isLoading,
    error,
    refetch,
    dismissDetection,
    clearDismissals,
    filterByType,
    
    // Counts by type
    todoClusterCount: filterByType("todo_cluster").length,
    slopeChangeCount: filterByType("metric_slope_change").length,
    emrConfigCount: filterByType("emr_config_change").length,
  };
}
