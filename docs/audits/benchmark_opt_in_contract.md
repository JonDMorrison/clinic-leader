# Cross-Organization Benchmark Opt-In Contract

## Overview

Organizations must explicitly opt-in to contribute their anonymized data to cross-organization benchmarks. This document defines the privacy rules and implementation requirements.

## Database Schema

```sql
-- Added to teams table
benchmark_opt_in BOOLEAN NOT NULL DEFAULT false
```

## Privacy Rules

### Rule 1: Opt-In is Explicit
- Default value is `false` (opted out)
- Only org admins/owners/directors can change opt-in status
- All changes are audited to `benchmark_audit_log`

### Rule 2: Non-Opted-In Orgs Never Contribute
- `bench_compute_snapshot()` only includes organizations where `benchmark_opt_in = true`
- `bench_get_matched_comparison()` only considers opted-in orgs
- Intervention analysis and data quality aggregates respect opt-in

### Rule 3: Minimum 5 Org Suppression
- If fewer than 5 opted-in orgs pass quality gates, results are suppressed
- Suppression is logged to audit log with reason

### Rule 4: Self-Data Always Visible
- Organizations can always see their own data
- Opted-out orgs can view benchmarks but cannot see their position vs cohort

## Audit Trail

Every opt-in change creates an audit log entry:
```json
{
  "action": "opt_in_enabled" | "opt_in_disabled",
  "user_id": "<uuid>",
  "details": {
    "organization_id": "<uuid>",
    "organization_name": "Example Clinic",
    "previous_value": false,
    "new_value": true,
    "changed_at": "2026-02-03T21:00:00Z"
  }
}
```

## UI Requirements

### Settings Page Toggle
Location: `/settings/organization`

Must display:
1. Clear on/off toggle
2. Current status badge
3. What data is shared:
   - Anonymized metrics only
   - Aggregate statistics (combined with 5+ orgs)
   - No raw values disclosed
4. Benefits of opting in vs out
5. Audit notice

## RPCs

### `get_org_benchmark_opt_in(_org_id UUID)`
Returns current opt-in status.

### `set_org_benchmark_opt_in(_org_id UUID, _opt_in BOOLEAN)`
Updates opt-in status. Restricted to org admins/directors/owners.
Automatically triggers audit via trigger.

## Acceptance Criteria

- [ ] Opt-out org never contributes to cross-org aggregates
- [ ] Opt-in is explicit (default false) and logged
- [ ] Comparisons only use opted-in participants
- [ ] UI clearly explains what is shared
- [ ] Minimum 5 org suppression enforced
