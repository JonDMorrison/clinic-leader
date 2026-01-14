/**
 * Centralized permission helpers derived from user_roles table.
 * These should be used with the useIsAdmin() hook data.
 * 
 * IMPORTANT: Never use users.role for permissions - it's a denormalized field.
 * Always use useIsAdmin() hook which queries the authoritative user_roles table.
 */

export interface RoleData {
  isAdmin: boolean;
  isManager: boolean;
  role?: string;
}

/**
 * Check if user can manage other users (map/unmap clinicians, edit user data).
 * Allowed for: owner, director, manager
 */
export function canManageUsers(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user can manage data (create/edit metrics, scorecards, rocks).
 * Allowed for: owner, director, manager
 */
export function canManageData(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user has admin-level access (org settings, integrations, billing).
 * Allowed for: owner, director
 */
export function canAccessAdmin(roleData: RoleData | undefined | null): boolean {
  return roleData?.isAdmin ?? false;
}

/**
 * Check if user can generate reports.
 * Allowed for: owner, director, manager
 */
export function canGenerateReports(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user can manage documents (create, edit, delete docs).
 * Allowed for: owner, director, manager
 */
export function canManageDocs(roleData: RoleData | undefined | null): boolean {
  return roleData?.isManager ?? false;
}

/**
 * Check if user can delete items (shoutouts, issues, etc created by others).
 * Allowed for: owner, director
 */
export function canDeleteOthersItems(roleData: RoleData | undefined | null): boolean {
  return roleData?.isAdmin ?? false;
}
