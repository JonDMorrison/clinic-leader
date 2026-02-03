# Master Admin Security Contract

## Overview

Master Admins have platform-level access to cross-organization benchmark data. This document defines the security model.

---

## 1. Role Definition

### platform_roles Table

```sql
CREATE TABLE platform_roles (
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,  -- 'master_admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
```

### RLS Policies

- **SELECT**: Only master admins can view platform_roles
- **INSERT/UPDATE/DELETE**: Only master admins can manage, AND cannot modify their own role

### Self-Assignment Prevention

The `is_master_admin()` function is `SECURITY DEFINER` and cannot be spoofed. Users cannot add themselves to platform_roles via normal API calls.

---

## 2. Authentication Helpers

### Server-Side (RPC)

```sql
is_master_admin(_user_id UUID DEFAULT NULL) RETURNS BOOLEAN
```

- SECURITY DEFINER
- SET search_path = public
- Checks platform_roles table directly

### Client-Side

| File | Purpose |
|------|---------|
| `src/lib/auth/isMasterAdmin.ts` | Utility functions for checking master admin |
| `src/hooks/useMasterAdminGate.ts` | React hook with loading/error states |
| `src/hooks/useMasterAdmin.ts` | Simple boolean hook |

---

## 3. Protected Routes

| Route | Protection |
|-------|------------|
| `/admin/benchmarks` | Master admin only |
| `/admin/benchmarks/jane-vs-nonjane` | Master admin only |
| `/analytics/emr-benchmark` | Admin/Director for own org, Master admin for cross-org |

### UI Behavior for Non-Master-Admins

- Shows `AccessRestrictedView` component
- No queries are executed (enabled flag checks isMasterAdmin)
- Cannot access data via DevTools (RPCs reject requests)

---

## 4. Data Access Model

### All Cross-Org Data Access via RPCs

| RPC | Purpose | Audited |
|-----|---------|---------|
| `bench_get_cohorts()` | List cohorts | Yes |
| `bench_create_cohort()` | Create cohort | Yes |
| `bench_delete_cohort()` | Delete cohort | Yes |
| `bench_get_cohort_members()` | List members | Yes |
| `bench_add_cohort_member()` | Add team | Yes |
| `bench_remove_cohort_member()` | Remove team | Yes |
| `bench_get_snapshot()` | Get single snapshot | Yes |
| `bench_list_snapshots()` | List snapshots | Yes |
| `bench_compute_snapshot()` | Compute snapshot | Yes |
| `bench_search_teams()` | Search all teams | Yes |
| `bench_get_audit_log()` | View audit log | Yes |

### RPC Security Pattern

Every RPC:
1. Calls `is_master_admin()` first
2. Raises exception if not master admin
3. Logs to `benchmark_audit_log`
4. Uses `SECURITY DEFINER` with `SET search_path = public`

---

## 5. Audit Logging

### benchmark_audit_log Table

```sql
CREATE TABLE benchmark_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Logged Actions

- `create_cohort`, `delete_cohort`
- `add_cohort_member`, `remove_cohort_member`
- `compute_snapshot`
- `list_snapshots`

### Audit Log UI

Visible in Benchmark Admin → "Audit Log" tab (master admin only).

---

## 6. Threat Model

| Threat | Mitigation |
|--------|------------|
| Self-assign master admin | RLS prevents INSERT to platform_roles |
| Direct table access | RLS blocks all SELECT on benchmark_* tables for non-masters |
| Spoof is_master_admin() | SECURITY DEFINER function, cannot be called with fake UID |
| Access via DevTools | RPCs reject before returning data |
| Cross-org data leakage | All queries enforce master admin check |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-03 | Initial master admin security contract |
