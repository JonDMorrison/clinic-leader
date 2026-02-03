# Access Contract - Authorization Model

## Overview

This document defines the canonical access control model for the ClinicLeader platform. All RLS policies, edge functions, and UI permission checks MUST use only the helpers defined here.

---

## 1. Organization ID Source of Truth

**Canonical Column**: `team_id` on the `users` table

- Every user belongs to exactly one organization via `users.team_id`
- All data tables use `organization_id` (FK → `teams.id`) for tenant isolation
- The `teams` table is the authoritative organization registry

### Helper Functions (DB Layer)

| Function | Purpose | Returns |
|----------|---------|---------|
| `public.current_user_team()` | Get authenticated user's organization | `uuid` (team_id) |
| `public.is_same_team(check_team_id uuid)` | Verify user belongs to org | `boolean` |
| `public.get_user_team_id()` | Get current auth user's team_id | `uuid` |

---

## 2. Role Taxonomy

### Authoritative Source

**Table**: `user_roles` (NOT `users.role`)

```sql
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    UNIQUE (user_id, role)
);

CREATE TYPE public.user_role AS ENUM (
    'owner',      -- Highest privilege, org owner
    'director',   -- Admin-level, full access
    'manager',    -- Can manage data, users
    'staff',      -- Read-only access
    'billing'     -- Financial access only
);
```

### Role Hierarchy

| Level | Roles | Capabilities |
|-------|-------|--------------|
| **Admin** | `owner`, `director` | Full CRUD, org settings, user management, delete any item |
| **Manager** | `manager` | Create/edit data, manage users, generate reports |
| **Staff** | `staff` | Read-only access to assigned data |
| **Billing** | `billing` | Financial data access only |

### Platform-Wide Roles

**Table**: `platform_roles`

| Role | Purpose |
|------|---------|
| `master_admin` | Cross-org access for benchmarking, support |

---

## 3. Allowed Helper Functions

### Database Layer (SQL/RLS)

These are the ONLY functions allowed in RLS policies:

```sql
-- Organization membership
public.is_same_team(check_team_id uuid) → boolean
public.current_user_team() → uuid
public.get_user_team_id() → uuid

-- Role checks (standard)
public.is_admin() → boolean          -- owner, director
public.is_manager() → boolean        -- owner, director, manager
public.is_admin_simple() → boolean   -- same as is_admin, legacy

-- Role checks (parameterized)
public.has_role(_user_id uuid, _role user_role) → boolean
public.get_user_role(_user_id uuid) → user_role
public.is_user_admin(_user_id uuid) → boolean
public.is_user_manager(_user_id uuid) → boolean

-- Platform-wide
public.is_master_admin() → boolean   -- platform_roles check

-- Intervention-specific
public.can_modify_intervention(intervention_id uuid) → boolean
public.is_intervention_creator(intervention_id uuid) → boolean
public.is_org_admin_for(org_id uuid) → boolean
```

### Application Layer (TypeScript)

Location: `src/lib/permissions.ts`

```typescript
// Data derived from useIsAdmin() hook
interface RoleData {
  isAdmin: boolean;    // owner or director
  isManager: boolean;  // owner, director, or manager
  role?: string;       // actual role string
}

// Allowed permission helpers
canManageUsers(roleData)         // Managers+
canManageData(roleData)          // Managers+
canAccessAdmin(roleData)         // Admins only
canGenerateReports(roleData)     // Managers+
canManageDocs(roleData)          // Managers+
canDeleteOthersItems(roleData)   // Admins only
canSeeNavItem(level, roleData)   // Nav visibility
```

---

## 4. Removed Assumptions

The following patterns are **EXPLICITLY FORBIDDEN**:

### ❌ DO NOT USE

- `users.role` column for permission checks (legacy/display-only)
- Direct auth.users table access (use `users` table instead)
- Hardcoded role strings in client code (use permission helpers)
- "or equivalent" fallbacks in RLS policies
- localStorage/sessionStorage for role checks
- Client-side admin detection without server validation

### ✅ ALWAYS USE

- `user_roles` table as source of truth
- SECURITY DEFINER functions for cross-table checks
- `is_same_team()` for all org-scoped data access
- `is_admin()` / `is_manager()` for role checks
- `useIsAdmin()` hook + permission helpers in UI

---

## 5. RLS Policy Templates

### Standard Table Access

```sql
-- SELECT: Org members can view
CREATE POLICY "Org members can view"
ON public.table_name FOR SELECT
USING (public.is_same_team(organization_id));

-- INSERT: Managers can create for their org
CREATE POLICY "Managers can create"
ON public.table_name FOR INSERT
WITH CHECK (
  public.is_manager() 
  AND public.is_same_team(organization_id)
  AND created_by = auth.uid()
);

-- UPDATE: Creator or admin can update
CREATE POLICY "Creator or admin can update"
ON public.table_name FOR UPDATE
USING (
  public.is_same_team(organization_id)
  AND (public.is_admin() OR created_by = auth.uid())
);

-- DELETE: Admin only
CREATE POLICY "Admin can delete"
ON public.table_name FOR DELETE
USING (
  public.is_same_team(organization_id)
  AND public.is_admin()
);
```

### Cross-Org Access (Master Admin)

```sql
CREATE POLICY "Master admin can read all"
ON public.table_name FOR SELECT
USING (public.is_master_admin());
```

---

## 6. Edge Function Authorization

All edge functions MUST:

1. Extract and validate auth header
2. Use `getTenantContext()` from `_shared/tenant-context.ts`
3. Verify org membership before data access
4. Use service role only for writes after validation

```typescript
import { getTenantContext } from '../_shared/tenant-context.ts';

const tenantContext = await getTenantContext(req);
// tenantContext.teamId is the validated org ID
// tenantContext.userId is the authenticated user
// tenantContext.userRole is the user's role
```

---

## 7. Intervention-Specific Access

| Action | Required Permission |
|--------|---------------------|
| View interventions | Org member |
| Create intervention | Manager+ |
| Edit own intervention | Creator or Admin |
| Delete intervention | Admin only |
| Link/unlink metrics | Creator or Admin |
| Evaluate outcomes | Admin only |
| Generate AI summary | Admin only |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-03 | Initial access contract documentation | System |
