// VTO Progress Rollup Calculation Logic

import { VTOVersion, VTOLink, VTOProgress } from './models';

interface LinkedItem {
  type: 'kpi' | 'rock' | 'issue' | 'doc';
  id: string;
  status?: string;
  value?: number;
  target?: number;
  direction?: 'up' | 'down';
}

/**
 * Calculate vision completeness score (0-100)
 * Based on which fields are filled out
 */
export function calculateVisionScore(version: VTOVersion): number {
  const checks = [
    version.core_values.length >= 3,
    version.core_focus.purpose?.length > 0,
    version.core_focus.niche?.length > 0,
    version.ten_year_target?.length > 0,
    version.marketing_strategy.ideal_client?.length > 0,
    version.marketing_strategy.differentiators?.length >= 3,
    version.marketing_strategy.proven_process?.length > 0,
    version.marketing_strategy.guarantee?.length > 0,
    version.three_year_picture.measurables?.length >= 3,
    (version.three_year_picture.revenue ?? 0) > 0,
  ];

  const filledCount = checks.filter(Boolean).length;
  return Math.round((filledCount / checks.length) * 100);
}

/**
 * Calculate progress for a single linked item
 */
export function calculateItemProgress(item: LinkedItem): number {
  switch (item.type) {
    case 'rock':
      // Rock status mapping: on_track=1, at_risk=0.5, off_track=0
      if (item.status === 'on_track') return 1.0;
      if (item.status === 'at_risk') return 0.5;
      if (item.status === 'off_track') return 0.0;
      return 0.5; // default to at_risk if unknown

    case 'kpi':
      // KPI progress: % to target, clipped 0..1
      if (item.value === undefined || item.target === undefined || item.target === 0) {
        return 0.5; // no data = neutral
      }
      
      const ratio = item.value / item.target;
      
      // Adjust for direction
      if (item.direction === 'down') {
        // For "lower is better" KPIs, invert the ratio
        return Math.max(0, Math.min(1, 2 - ratio));
      } else {
        // For "higher is better" KPIs
        return Math.max(0, Math.min(1, ratio));
      }

    case 'issue':
      // Issues: resolved=+0.2, open=0 (neutral, doesn't hurt score)
      return item.status === 'resolved' ? 0.2 : 0;

    case 'doc':
      // Docs are informational, don't affect progress
      return 0;

    default:
      return 0;
  }
}

/**
 * Calculate traction score based on linked items
 * Weighted average of all linked KPIs, Rocks, and Issues
 */
export function calculateTractionScore(
  links: VTOLink[],
  linkedItems: Map<string, LinkedItem>
): { score: number; breakdown: Record<string, any> } {
  const breakdown: Record<string, any> = {};
  
  // Group links by goal_key
  const goalLinks = new Map<string, Array<{ link: VTOLink; item: LinkedItem }>>();
  
  for (const link of links) {
    const item = linkedItems.get(link.link_id);
    if (!item) continue;
    
    if (!goalLinks.has(link.goal_key)) {
      goalLinks.set(link.goal_key, []);
    }
    goalLinks.get(link.goal_key)!.push({ link, item });
  }

  // Calculate progress for each goal
  let totalWeightedProgress = 0;
  let totalWeight = 0;

  for (const [goalKey, items] of goalLinks.entries()) {
    let goalProgress = 0;
    let goalWeight = 0;

    for (const { link, item } of items) {
      const itemProgress = calculateItemProgress(item);
      goalProgress += itemProgress * link.weight;
      goalWeight += link.weight;
    }

    if (goalWeight > 0) {
      const avgProgress = goalProgress / goalWeight;
      breakdown[goalKey] = {
        progress: Math.round(avgProgress * 100),
        linked_items: items.map(({ link, item }) => ({
          type: item.type,
          id: item.id,
          contribution: Math.round(calculateItemProgress(item) * link.weight * 100) / 100
        }))
      };

      totalWeightedProgress += avgProgress * goalWeight;
      totalWeight += goalWeight;
    }
  }

  const score = totalWeight > 0 
    ? Math.round((totalWeightedProgress / totalWeight) * 100)
    : 0;

  return { score, breakdown };
}

/**
 * Compute full VTO progress
 */
export function computeVTOProgress(
  version: VTOVersion,
  links: VTOLink[],
  linkedItems: Map<string, LinkedItem>
): Omit<VTOProgress, 'id' | 'vto_version_id' | 'computed_at'> {
  const visionScore = calculateVisionScore(version);
  const { score: tractionScore, breakdown } = calculateTractionScore(links, linkedItems);

  return {
    vision_score: visionScore,
    traction_score: tractionScore,
    details: breakdown
  };
}

/**
 * Find goals that are off-track (< 50% progress)
 */
export function getOffTrackGoals(progress: VTOProgress): Array<{ goalKey: string; progress: number }> {
  const offTrack: Array<{ goalKey: string; progress: number }> = [];
  
  for (const [goalKey, data] of Object.entries(progress.details)) {
    if (data.progress < 50) {
      offTrack.push({ goalKey, progress: data.progress });
    }
  }

  return offTrack.sort((a, b) => a.progress - b.progress);
}
