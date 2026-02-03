# Interventions Module - E2E Test Checklist

## Setup Steps

### Prerequisites
1. **User Accounts**: Create two test users in the same organization:
   - `admin@test.com` - with `owner` or `director` role in `user_roles`
   - `member@test.com` - with `staff` role in `user_roles`

2. **Organization**: Ensure both users have `team_id` set to the same organization UUID.

3. **Metrics**: Create at least 2 metrics in the organization:
   - Navigate to Scorecard → Add Metric
   - Record metric IDs for testing

4. **Metric Results**: Seed monthly metric results for testing baselines:
   ```sql
   INSERT INTO metric_results (metric_id, period_type, period_start, value, source)
   VALUES 
     ('<metric_id>', 'monthly', '2025-01-01', 100, 'manual'),
     ('<metric_id>', 'monthly', '2025-02-01', 110, 'manual'),
     ('<metric_id>', 'monthly', '2025-03-01', 115, 'manual');
   ```

5. **Dev Diagnostics**: Enable diagnostics panel by running app in development mode (`npm run dev`).

---

## Manual Tests

### 1. Permissions - List View Access
**As member**: Navigate to `/interventions`
- [ ] Can view interventions list
- [ ] Can see "New Intervention" button
- [ ] Cannot see "Evaluate Outcomes" button on cards

**As admin**: Navigate to `/interventions`
- [ ] Can view interventions list
- [ ] Can see "New Intervention" button

---

### 2. Create Intervention - Basic
**As member**:
- [ ] Click "New Intervention"
- [ ] Fill title (min 4 chars), type, description
- [ ] Set confidence level (1-5)
- [ ] Set time horizon (7-365 days)
- [ ] Add tags
- [ ] Submit → Redirects to detail page
- [ ] Verify `origin_type` = 'manual' in diagnostics

---

### 3. Create Intervention from Issue
**As member**:
- [ ] Navigate to `/issues`
- [ ] Click "Intervention" button on an issue card
- [ ] Verify modal is pre-filled with issue title/context
- [ ] Submit → Redirects to detail page
- [ ] Verify `origin_type` = 'issue' in detail page
- [ ] Verify "Origin: Issue #..." link appears and is clickable

---

### 4. Edit Intervention - Creator
**As creator (member)**:
- [ ] Open intervention you created
- [ ] Click "Edit" → Modal opens
- [ ] Change title, description, status
- [ ] Save → Changes reflected

---

### 5. Edit Intervention - Admin Override
**As admin** (not creator):
- [ ] Open intervention created by another user
- [ ] Verify "Edit" button is enabled
- [ ] Edit and save → Changes persist

---

### 6. Edit Intervention - Member Restriction
**As member** (not creator):
- [ ] Open intervention created by another user
- [ ] Verify "Edit" button is disabled or hidden
- [ ] Verify cannot edit via API (RLS enforced)

---

### 7. Delete Intervention - Admin Only
**As admin**:
- [ ] Open any intervention
- [ ] Click "Delete" → Confirmation dialog
- [ ] Confirm → Intervention deleted
- [ ] Verify redirect to list

**As member**:
- [ ] Open any intervention
- [ ] Verify "Delete" button is disabled with tooltip "Only admins can delete"

---

### 8. Link Metric - Success
**As creator or admin**:
- [ ] Open intervention → Click "Link Metric"
- [ ] Search and select a metric
- [ ] Set expected direction (up/down/stable)
- [ ] Set expected magnitude (optional)
- [ ] Submit
- [ ] Verify linked metric appears in list
- [ ] Verify baseline value is captured (or shows "No baseline yet")
- [ ] Verify baseline period start is displayed

---

### 9. Link Metric - Duplicate Prevention
**As creator or admin**:
- [ ] Attempt to link the same metric twice
- [ ] Verify error toast: "This metric is already linked"
- [ ] Verify no duplicate entry created

---

### 10. Link Metric - Missing Baseline
**Setup**: Create a metric with NO metric_results for current month
- [ ] Link this metric to an intervention
- [ ] Verify "No baseline yet" message displays
- [ ] Verify baseline_value is null in database

---

### 11. Evaluate Outcomes - Admin Only
**As admin**:
- [ ] Open an intervention with status = 'active' and linked metrics
- [ ] Click "Evaluate Outcomes"
- [ ] Verify loading state
- [ ] Verify outcomes appear in Outcomes section
- [ ] Verify delta values calculated correctly

**As member**:
- [ ] Open same intervention
- [ ] Verify "Evaluate Outcomes" button is not visible

---

### 12. Evaluate Outcomes - Status Restriction
**As admin**:
- [ ] Change intervention status to 'planned'
- [ ] Verify "Evaluate Outcomes" button is disabled
- [ ] Tooltip says "Intervention must be active or completed"

---

### 13. Evaluate Outcomes - AI Summary Generation
**As admin**:
- [ ] Evaluate an intervention with at least 2 linked metrics with results
- [ ] Wait for evaluation to complete
- [ ] Verify "AI Summary" panel appears on detail page
- [ ] Verify summary mentions intervention title
- [ ] Verify summary references actual metric values (no invented numbers)
- [ ] Verify summary is 3-6 sentences

---

### 14. Error Handling - RLS Violation
**Setup**: Temporarily remove user from organization (set team_id = null)
- [ ] Attempt to create intervention
- [ ] Verify error: "Access denied" or similar
- [ ] Verify no data leaked from other organizations

---

### 15. Interventions Dashboard Tab
**Navigate to `/data` → Interventions tab**:
- [ ] Verify "Active Interventions" count matches actual
- [ ] Verify "Completed (Last 90 Days)" count is accurate
- [ ] Verify "Most Impactful" shows top 5 by delta_percent
- [ ] Verify "At Risk" shows overdue interventions without outcomes
- [ ] Verify filter tabs (All/Active/Completed) work
- [ ] Verify clicking intervention navigates to detail

---

## Diagnostics Panel Verification (Dev-Only)

Open the Dev Diagnostics panel (bottom-right corner in dev mode):

| Field | Expected Value |
|-------|----------------|
| org_id | Current user's organization UUID |
| auth_user_id | Current authenticated user UUID |
| Role badge | "Admin" or "Member" based on user_roles |
| Interventions count | Total interventions in org |
| Links count | Total metric links in org |
| Outcomes count | Total outcomes evaluated in org |

### After Evaluating Outcomes
| Field | Expected Value |
|-------|----------------|
| Evaluated Outcomes count | Matches number of linked metrics |
| Per-metric baseline | Value from intervention_metric_links |
| Per-metric current | Computed from metric_results |
| Per-metric status | "computed" or "insufficient_data" |
| current_period | Month of the metric_result used |

---

## Edge Cases to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| Metric deleted after linking | Link row shows "Unknown metric", no crash |
| User deleted after creating intervention | Creator shows "Unknown", intervention persists |
| Evaluate with no metric_results | Shows "insufficient data" in summary |
| Evaluate with baseline = 0 | delta_percent = null (division by zero handled) |
| Very long title (200+ chars) | Truncated in list, full in detail |
| Special characters in tags | Rendered correctly, no XSS |
| Concurrent evaluation requests | Second request waits or returns cached |

---

## Database Verification Queries

```sql
-- Check intervention counts per org
SELECT organization_id, status, COUNT(*) 
FROM interventions 
GROUP BY organization_id, status;

-- Check orphaned links (intervention deleted)
SELECT * FROM intervention_metric_links 
WHERE intervention_id NOT IN (SELECT id FROM interventions);

-- Check outcomes without links
SELECT * FROM intervention_outcomes 
WHERE metric_id NOT IN (
  SELECT metric_id FROM intervention_metric_links 
  WHERE intervention_id = intervention_outcomes.intervention_id
);

-- Verify RLS is enforced
SET ROLE authenticated;
SET request.jwt.claim.email = 'member@test.com';
SELECT * FROM interventions; -- Should only see own org
```

---

## Sign-off

| Test # | Passed | Tester | Date | Notes |
|--------|--------|--------|------|-------|
| 1 | [ ] | | | |
| 2 | [ ] | | | |
| 3 | [ ] | | | |
| 4 | [ ] | | | |
| 5 | [ ] | | | |
| 6 | [ ] | | | |
| 7 | [ ] | | | |
| 8 | [ ] | | | |
| 9 | [ ] | | | |
| 10 | [ ] | | | |
| 11 | [ ] | | | |
| 12 | [ ] | | | |
| 13 | [ ] | | | |
| 14 | [ ] | | | |
| 15 | [ ] | | | |
