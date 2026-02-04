# IDS Follow-through E2E Test Checklist

This document provides manual test cases for verifying the IDS → Intervention enforcement layer.

## Prerequisites
- Test account with manager+ permissions
- Test account with staff permissions (for permission testing)
- At least one existing issue in the organization

---

## Test Cases

### 1. Close The Loop Modal Appears on Resolve
**Steps:**
1. Navigate to Issues page
2. Find an open issue
3. Click "Mark Solved" button

**Expected:**
- CloseTheLoopModal appears
- Shows issue title and context
- Displays three options: Create Intervention, No intervention needed, Defer

**Status:** [ ] Pass / [ ] Fail

---

### 2. Create Intervention Flow
**Steps:**
1. Trigger Close The Loop modal
2. Add optional resolution note
3. Click "Create Intervention"
4. Fill intervention form (title should be prefilled)
5. Save intervention

**Expected:**
- Intervention modal opens with prefilled title
- On save, issue is marked solved
- issue.linked_intervention_id is set
- issue.resolution_type = 'intervention_created'
- Two issue_resolution_events created (resolved + intervention_linked)

**Status:** [ ] Pass / [ ] Fail

---

### 3. No Intervention Needed Flow
**Steps:**
1. Trigger Close The Loop modal
2. Add resolution note
3. Click "No intervention needed"

**Expected:**
- Issue marked solved
- resolution_type = 'no_intervention_needed'
- One issue_resolution_event created with event_type = 'resolved'
- Toast confirms action

**Status:** [ ] Pass / [ ] Fail

---

### 4. Defer Flow
**Steps:**
1. Trigger Close The Loop modal
2. Click "Defer / decide later"

**Expected:**
- Issue marked solved
- resolution_type = 'defer'
- One issue_resolution_event created
- Issue shows deferred badge in resolution section

**Status:** [ ] Pass / [ ] Fail

---

### 5. Resolution Section Display
**Steps:**
1. Resolve an issue with any resolution type
2. View the issue card

**Expected:**
- Resolution section appears showing:
  - Resolution type badge
  - Resolution note (if provided)
  - Resolver name
  - Resolution date
  - Linked intervention (if applicable)

**Status:** [ ] Pass / [ ] Fail

---

### 6. Admin Edit Resolution
**Steps:**
1. Log in as admin (owner/director)
2. View a resolved issue
3. Click Edit on resolution section
4. Change resolution_type and note
5. Save

**Expected:**
- Changes persist
- New issue_resolution_event created with event_type = 'resolution_updated'
- Non-admins should NOT see edit button

**Status:** [ ] Pass / [ ] Fail

---

### 7. Follow-through Metric Calculation
**Steps:**
1. Create multiple issues and resolve with different resolution types:
   - 2 with intervention_created
   - 1 with no_intervention_needed
   - 1 with defer
2. View IDSFollowThroughCard

**Expected:**
- Percentage = 2/(2+1) = 66%
- Deferred issues excluded from denominator
- Breakdown shows correct counts

**Status:** [ ] Pass / [ ] Fail

---

### 8. RLS - Cross-Org Isolation
**Steps:**
1. Create issue_resolution_events in Org A
2. Log in as user from Org B
3. Query issue_resolution_events

**Expected:**
- Org B user cannot see Org A events
- No data leakage across organizations

**Status:** [ ] Pass / [ ] Fail

---

### 9. RLS - Insert Permission
**Steps:**
1. Log in as staff user
2. Resolve an issue

**Expected:**
- Staff can trigger resolution flow
- Events are created successfully
- organization_id matches user's org

**Status:** [ ] Pass / [ ] Fail

---

### 10. RLS - Update/Delete Restriction
**Steps:**
1. Log in as non-admin user
2. Attempt to update/delete issue_resolution_events via API

**Expected:**
- Operation fails with permission error
- Only admins can modify events

**Status:** [ ] Pass / [ ] Fail

---

## Sign-off

| Tester | Date | Issues Found |
|--------|------|--------------|
|        |      |              |

## Notes
- All tests should be run in both light and dark mode
- Test on mobile viewport for responsive behavior
- Verify toast messages appear correctly
