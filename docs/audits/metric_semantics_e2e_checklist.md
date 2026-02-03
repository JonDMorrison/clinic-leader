# Metric Semantics Governance – E2E Test Checklist

> **Purpose**: Manual verification checklist for the Metric Semantics Governance system.
> **Last Updated**: 2026-02-03

## Pre-requisites

- [ ] Admin user logged in
- [ ] Organization has metrics with `metric_results` data
- [ ] Run `MetricGovernanceDevSeeder` to create test scenarios (see below)

---

## 1. Multi-Source Conflict Resolution

### Test 1.1: Two sources, same metric, same period
**Setup**: Seeder creates `jane_pipe` (value=100) and `legacy_workbook` (value=95) for same metric/month  
**Steps**:
1. Navigate to `/admin/metrics-governance`
2. Open the seeded metric
3. Verify source policies show both sources
4. Run "Recompute Canonicals" for the test month
5. Check `metric_canonical_results` via debug panel

**Expected**: `jane_pipe` chosen (priority 10 < 20)

### Test 1.2: Three sources with different priorities
**Setup**: Add `manual` source (priority 90) to 1.1 scenario  
**Steps**:
1. Recompute canonicals
2. Check selection audit log

**Expected**: Still `jane_pipe`, audit log shows all 3 candidates

### Test 1.3: Disallowed source filtered out
**Setup**: Set `jane_pipe` policy `is_allowed=false`  
**Steps**:
1. Recompute canonicals
2. Verify new selection

**Expected**: `legacy_workbook` chosen (next highest priority among allowed)

### Test 1.4: All sources disallowed
**Setup**: Disable all source policies  
**Steps**:
1. Recompute canonicals
2. Check canonical result

**Expected**: `value=null`, `selection_reason` indicates no allowed sources

---

## 2. Override Precedence

### Test 2.1: Override forces different source
**Setup**: 
- `jane_pipe` has priority 10
- Add precedence override: period_type=month, source=`legacy_workbook`

**Steps**:
1. Recompute canonicals for month
2. Check canonical result

**Expected**: `legacy_workbook` chosen despite higher priority, `selection_reason` references override

### Test 2.2: Override only applies to specified period type
**Setup**: Override for `month` only, compute for `week`  
**Steps**:
1. Recompute canonicals for a week
2. Check result

**Expected**: Standard priority selection (no override applied to weekly)

### Test 2.3: Override source not in candidates
**Setup**: Override specifies `google_sheet` but no data exists from that source  
**Steps**:
1. Recompute canonicals

**Expected**: Falls back to priority-based selection, `selection_reason` notes override source unavailable

### Test 2.4: Multiple overrides (one per period type)
**Setup**: Add overrides for both `week` and `month`  
**Steps**:
1. Recompute both period types
2. Verify each uses its specified source

**Expected**: Each period type uses its configured override source

---

## 3. Audit-Required Sources

### Test 3.1: Source requires audit, has PASS status
**Setup**: 
- `legacy_workbook` policy: `requires_audit_pass=true`
- Result has `selection_meta.audit_status='PASS'`

**Steps**:
1. Recompute canonicals

**Expected**: `legacy_workbook` eligible, can be selected

### Test 3.2: Source requires audit, has FAIL status
**Setup**: Set `audit_status='FAIL'` on the result  
**Steps**:
1. Recompute canonicals

**Expected**: Source skipped, next priority source chosen

### Test 3.3: Source requires audit, no audit status
**Setup**: `selection_meta` is empty `{}`  
**Steps**:
1. Recompute canonicals

**Expected**: Source skipped (audit required but not passed)

### Test 3.4: N/A audit status passes requirement
**Setup**: `audit_status='N/A'` (e.g., Jane pipe auto-data)  
**Steps**:
1. Recompute canonicals

**Expected**: Source eligible (N/A counts as passing)

---

## 4. RLS Enforcement

### Test 4.1: Admin can view all org metrics
**Steps**:
1. Log in as org admin
2. Navigate to `/admin/metrics-governance`

**Expected**: See all organization metrics

### Test 4.2: Member cannot access governance page
**Steps**:
1. Log in as org member (non-admin)
2. Navigate to `/admin/metrics-governance`

**Expected**: Access restricted view shown

### Test 4.3: Admin cannot see other org's metrics
**Steps**:
1. Log in as admin of Org A
2. Attempt to query metrics from Org B

**Expected**: No data returned (RLS blocks cross-org access)

### Test 4.4: Compute RPC requires admin role
**Steps**:
1. As non-admin, attempt to call `compute_canonical_for_month`

**Expected**: RPC throws permission error

---

## 5. Recompute Canonicals Flow

### Test 5.1: Recompute for month success
**Steps**:
1. Open Recompute dialog
2. Select period type: Monthly
3. Select a month with data
4. Click Recompute

**Expected**: Success message with counts, results visible in dialog

### Test 5.2: Recompute for week success
**Steps**:
1. Select period type: Weekly
2. Select a week with data
3. Click Recompute

**Expected**: Success message, weekly canonicals updated

### Test 5.3: Recompute with no data
**Steps**:
1. Select a period with no `metric_results`
2. Click Recompute

**Expected**: Completes with 0 metrics processed or null values

### Test 5.4: Recompute updates existing canonical
**Steps**:
1. Run recompute for a period
2. Change source priorities
3. Run recompute again

**Expected**: Canonical result updated to reflect new selection

---

## 6. Fallback Behavior (Scorecard)

### Test 6.1: Canonical exists, used in scorecard
**Setup**: Ensure `metric_canonical_results` has data  
**Steps**:
1. Navigate to Scorecard
2. Check metric value display

**Expected**: Value matches canonical, no fallback warning

### Test 6.2: No canonical, fallback to raw results
**Setup**: Delete canonical result for a metric  
**Steps**:
1. Navigate to Scorecard
2. Check metric with debug panel open

**Expected**: Raw value shown, `is_canonical=false` flag, dev warning in console

### Test 6.3: Mixed canonical and fallback
**Setup**: Some metrics have canonicals, others don't  
**Steps**:
1. View Scorecard with multiple metrics

**Expected**: Each metric correctly sourced, fallback metrics marked

### Test 6.4: Debug panel shows selection details
**Steps**:
1. Open metric details drawer
2. Expand Canonical Selection Debug panel

**Expected**: Shows candidates, chosen source, selection reason, audit log entry

---

## Test Data Seeder

Run the `MetricGovernanceDevSeeder` component (dev-only) to create test scenarios:

```tsx
// Add to any dev page or run from console
import { seedGovernanceTestData } from '@/lib/dev/governance-seeder';
await seedGovernanceTestData(organizationId);
```

This creates:
- Two competing sources for a test metric
- One source with audit requirement
- Override configuration
- Audit log entries

---

## Sign-Off

| Test | Passed | Tester | Date | Notes |
|------|--------|--------|------|-------|
| 1.1 | ☐ | | | |
| 1.2 | ☐ | | | |
| 1.3 | ☐ | | | |
| 1.4 | ☐ | | | |
| 2.1 | ☐ | | | |
| 2.2 | ☐ | | | |
| 2.3 | ☐ | | | |
| 2.4 | ☐ | | | |
| 3.1 | ☐ | | | |
| 3.2 | ☐ | | | |
| 3.3 | ☐ | | | |
| 3.4 | ☐ | | | |
| 4.1 | ☐ | | | |
| 4.2 | ☐ | | | |
| 4.3 | ☐ | | | |
| 4.4 | ☐ | | | |
| 5.1 | ☐ | | | |
| 5.2 | ☐ | | | |
| 5.3 | ☐ | | | |
| 5.4 | ☐ | | | |
| 6.1 | ☐ | | | |
| 6.2 | ☐ | | | |
| 6.3 | ☐ | | | |
| 6.4 | ☐ | | | |
