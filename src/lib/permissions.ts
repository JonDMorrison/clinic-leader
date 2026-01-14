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

/**
 * Navigation visibility permissions.
 * Maps nav item role requirements to permission checks.
 */
export type NavPermissionKey = 
  | "staff"      // All authenticated users
  | "manager"    // Managers and above
  | "admin"      // Admins only (owner, director)
  | "owner";     // Owner only

/**
 * Check if user can see a nav item based on its required permission level.
 * This replaces the old roles array check with permission-based logic.
 */
export function canSeeNavItem(
  requiredLevel: NavPermissionKey,
  roleData: RoleData | undefined | null
): boolean {
  if (!roleData) return false;
  
  switch (requiredLevel) {
    case "staff":
      // Everyone can see staff-level items
      return true;
    case "manager":
      // Managers and admins can see
      return roleData.isManager;
    case "admin":
      // Only admins (owner, director)
      return roleData.isAdmin;
    case "owner":
      // Only owner
      return roleData.role === "owner";
    default:
      return false;
  }
}

/**
 * Map old role array to new permission level.
 * Used for backward compatibility with existing nav definitions.
 */
export function getNavPermissionLevel(roles: string[]): NavPermissionKey {
  // If only owner, return owner
  if (roles.length === 1 && roles[0] === "owner") {
    return "owner";
  }
  // If includes owner and director (admin-level items)
  if (roles.includes("owner") && roles.includes("director") && !roles.includes("manager") && !roles.includes("staff")) {
    return "admin";
  }
  // If includes manager but not staff (manager-level items)
  if (roles.includes("manager") && !roles.includes("staff")) {
    return "manager";
  }
  // Default to staff (everyone)
  return "staff";
}
