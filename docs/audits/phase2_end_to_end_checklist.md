# Phase 2 End-to-End Test Checklist

**Date:** 2026-02-02  
**Tester:** Lovable AI  
**Status:** PARTIAL - Requires manual Lori workbook upload

---

## Prerequisites

- [x] User is logged in to a "default" (Legacy) data mode organization
- [ ] Lori workbook (.xlsx) with at least one monthly sheet available ⚠️ **Manual upload required**

---

## Test Steps

### 1. Import Lori Workbook

⚠️ **LIMITATION**: Browser automation cannot upload real files. Manual testing required for this section.

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1.1 | Navigate to `/imports/monthly-report` | Page loads with upload form | ✅ Verified |
| 1.2 | Upload Lori workbook file | File accepted, auto-detects Lori format | ⏳ Manual |
| 1.3 | Confirm Lori preview shows | Sheet list with period_keys displayed | ⏳ Manual |
| 1.4 | Click "Import" button | Import processes, progress shown | ⏳ Manual |
| 1.5 | Verify audit table appears | PASS/FAIL table with metric verification | ⏳ Manual |
| 1.6 | Confirm PASS counts | At least some metrics show PASS | ⏳ Manual |
| 1.7 | Check sync blocked behavior | If FAILs exist, red banner appears | ⏳ Manual |
| 1.8 | Check NEEDS_DEFINITION warning | Yellow banner for undefined metrics | ⏳ Manual |

### 2. Scorecard Verification

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 2.1 | Navigate to `/scorecard` | Scorecard page loads | ✅ Verified |
| 2.2 | Verify metrics displayed | Metric cards with values/targets shown | ✅ Verified |
| 2.3 | Check period selector | Can select different months | ✅ Verified |
| 2.4 | Confirm metric status badges | on_track/off_track/needs_* shown | ✅ Verified |

### 3. Off-Track Detection

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 3.1 | Navigate to `/scorecard/off-track` | Off-track view loads | ⏳ Manual |
| 3.2 | Check metric statuses | Metrics show computed status | ⏳ Manual |
| 3.3 | Verify period filter | Can filter by month | ⏳ Manual |
| 3.4 | Confirm off-track metrics listed | Metrics below target shown | ⏳ Manual |

### 4. Issue Creation from Metric

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 4.1 | Find an off-track metric | Metric with actionable status visible | ⏳ Manual |
| 4.2 | Click "Create Issue" button | CreateIssueFromMetricModal opens | ⏳ Manual |
| 4.3 | Fill issue details | Title pre-filled from metric name | ⏳ Manual |
| 4.4 | Submit issue | Issue created successfully | ⏳ Manual |
| 4.5 | Verify issue in Issues list | Issue appears with metric_id link | ⏳ Manual |

### 5. Meeting Agenda Generation

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 5.1 | Navigate to `/meetings` | Meeting page loads | ⏳ Manual |
| 5.2 | Create or select meeting | Meeting detail view shown | ⏳ Manual |
| 5.3 | Check IDS section | Created issue shows in agenda | ⏳ Manual |
| 5.4 | Verify issue context | Metric context preserved | ⏳ Manual |

---

## Implementation Verified (Code Review)

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| Audit Module | `src/lib/legacy/legacyDerivedMetricAudit.ts` | PASS/FAIL verification | ✅ |
| Bridge Module | `src/lib/legacy/legacyMetricBridge.ts` | Metric extraction + upsert | ✅ |
| Import UI | `src/pages/ImportMonthlyReport.tsx` | Audit-first flow, blocking | ✅ |
| Metric Status | `src/lib/scorecard/metricStatus.ts` | On/off-track computation | ✅ |
| Issue Modal | `src/components/scorecard/CreateIssueFromMetricModal.tsx` | Issue creation from metric | ✅ |
| Agenda Generator | `src/lib/meetings/agendaGenerator.ts` | Issue → agenda item | ✅ |

---

## Results Summary

| Category | Passed | Pending | Failed | Total |
|----------|--------|---------|--------|-------|
| Import | 1 | 7 | 0 | 8 |
| Scorecard | 4 | 0 | 0 | 4 |
| Off-Track | 0 | 4 | 0 | 4 |
| Issue Creation | 0 | 5 | 0 | 5 |
| Meeting Agenda | 0 | 4 | 0 | 4 |
| **TOTAL** | **5** | **20** | **0** | **25** |

---

## Manual Testing Instructions

To complete Phase 2 validation:

1. **Upload Lori Workbook**
   - Go to `/imports/monthly-report`
   - Click "Choose File" and select a Lori workbook (.xlsx)
   - Verify the system auto-detects Lori format (shows month tabs)
   - Click "Import Selected Months"
   - Check the audit PASS/FAIL table appears after import
   - Verify red banner if any FAIL, yellow banner if NEEDS_DEFINITION only

2. **Verify Scorecard Sync**
   - Navigate to `/scorecard`
   - Select the imported month from period dropdown
   - Confirm values match workbook data

3. **Test Off-Track Detection**
   - Go to `/scorecard/off-track`
   - Verify metrics with values below target show "Off Track"
   - Confirm status computation matches `metricStatus.ts` logic

4. **Create Issue from Metric**
   - Find an off-track metric on `/scorecard/off-track`
   - Click the "+" button to create issue
   - Submit the issue form
   - Verify issue appears in `/issues` list

5. **Meeting Agenda Integration**
   - Go to `/meetings` and create/open a weekly meeting
   - Check IDS section includes the created issue
   - Confirm issue context shows metric details

---

## Notes

- **Browser automation limitation**: File upload cannot be automated with real files
- **Scorecard page verified**: Metrics display correctly with status badges
- **Code implementation complete**: All Phase 2 components are implemented and connected
- **Audit-first flow implemented**: Import now runs verification before syncing to metric_results

---

## Sign-off

- [x] All critical code paths implemented
- [ ] All UI paths manually verified (pending Lori upload)
- [ ] Phase 2 scope criteria met (per docs/audits/phase2_scope.md)
