/**
 * Hook for fetching intervention pattern clusters
 * Used by recommendation engine and pattern analysis views
 */

import { useQuery } from "@tanstack/react-query";
import { 
  fetchMatchingPatterns, 
  findPatternsForRecommendation,
  type PatternCluster,
  type PatternMatchCriteria,
  type PatternRecommendation,
  type OrgSizeBand,
} from "@/lib/interventions/interventionPatternService";

interface UsePatternClustersOptions {
  criteria?: PatternMatchCriteria;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch pattern clusters matching criteria
 */
export function usePatternClusters({
  criteria = {},
  limit = 20,
  enabled = true,
}: UsePatternClustersOptions = {}) {
  return useQuery<PatternCluster[]>({
    queryKey: ["intervention-patterns", criteria, limit],
    queryFn: () => fetchMatchingPatterns(criteria, limit),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - patterns don't change frequently
  });
}

interface UsePatternRecommendationsOptions {
  metricId: string;
  interventionType?: string;
  orgSizeBand: OrgSizeBand;
  specialtyType?: string;
  enabled?: boolean;
}

/**
 * Get pattern-based recommendations for a specific scenario
 */
export function usePatternRecommendations({
  metricId,
  interventionType,
  orgSizeBand,
  specialtyType,
  enabled = true,
}: UsePatternRecommendationsOptions) {
  return useQuery<PatternRecommendation[]>({
    queryKey: ["pattern-recommendations", metricId, interventionType, orgSizeBand, specialtyType],
    queryFn: () => findPatternsForRecommendation({
      metricId,
      interventionType,
      orgSizeBand,
      specialtyType,
    }),
    enabled: enabled && !!metricId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
