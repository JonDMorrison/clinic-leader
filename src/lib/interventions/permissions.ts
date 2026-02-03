/**
 * Intervention Intelligence Permission Model
 * 
 * Permission Levels:
 * - Admin (owner, director): Full CRUD, delete interventions, evaluate outcomes
 * - Leadership (manager): Create/edit interventions, view outcomes
 * - Staff: View only
 */

import type { RoleData } from "@/lib/permissions";

/**
 * Check if user can view interventions (all authenticated users in same org)
 */
export function canViewIntervention(roleData: RoleData | undefined | null): boolean {
  // All authenticated users can view - RLS handles org scoping
  return true;
}

/**
 * Check if user can create interventions (manager and above)
 */
export function canCreateIntervention(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user can edit an intervention
 * - Admins can edit any
 * - Managers can edit any
 * - Creators can edit their own (handled by RLS)
 */
export function canEditIntervention(
  roleData: RoleData | undefined | null,
  isCreator: boolean = false
): boolean {
  if (roleData?.isAdmin) return true;
  if (roleData?.isManager) return true;
  return isCreator;
}

/**
 * Check if user can delete an intervention (admin only)
 */
export function canDeleteIntervention(roleData: RoleData | undefined | null): boolean {
  return roleData?.isAdmin ?? false;
}

/**
 * Check if user can evaluate outcomes (admin only - high impact action)
 */
export function canEvaluateOutcome(roleData: RoleData | undefined | null): boolean {
  return roleData?.isAdmin ?? false;
}

/**
 * Check if user can link/unlink metrics (manager and above)
 */
export function canLinkMetrics(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user can trigger auto issue creation (admin only)
 */
export function canTriggerAutoIssue(roleData: RoleData | undefined | null): boolean {
  return roleData?.isAdmin ?? false;
}

/**
 * Check if user can generate AI insights (manager and above)
 */
export function canGenerateAIInsight(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user can view meeting intervention signals (manager and above)
 */
export function canViewMeetingSignals(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Get permission summary for UI display
 */
export function getInterventionPermissions(roleData: RoleData | undefined | null) {
  return {
    canView: canViewIntervention(roleData),
    canCreate: canCreateIntervention(roleData),
    canEdit: canEditIntervention(roleData),
    canDelete: canDeleteIntervention(roleData),
    canEvaluate: canEvaluateOutcome(roleData),
    canLinkMetrics: canLinkMetrics(roleData),
    canTriggerAutoIssue: canTriggerAutoIssue(roleData),
    canGenerateAIInsight: canGenerateAIInsight(roleData),
    canViewMeetingSignals: canViewMeetingSignals(roleData),
  };
}

/**
 * Permission error messages for user feedback
 */
export const PERMISSION_MESSAGES = {
  CREATE: "Only managers and above can create interventions.",
  EDIT: "Only the creator, managers, or admins can edit this intervention.",
  DELETE: "Only admins can delete interventions.",
  EVALUATE: "Only admins can evaluate outcomes.",
  LINK_METRICS: "Only managers and above can link metrics.",
  AUTO_ISSUE: "Only admins can trigger auto issue creation.",
  AI_INSIGHT: "Only managers and above can generate AI insights.",
  MEETING_SIGNALS: "Only managers and above can view meeting signals.",
} as const;
