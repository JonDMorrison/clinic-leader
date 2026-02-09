

## Inline Data Modals for Meetings

Make the meeting page self-contained so you never have to leave it. When you click on a scorecard, rock, or issue agenda item, the relevant data opens in a modal right there.

### What Changes

**1. Scorecard Modal ("Review the Numbers")**
When you click on a metric agenda item during a live meeting, instead of just showing an editable title, a modal will pop up showing:
- All scorecard metrics for the current period (name, owner, actual vs target, on/off track badge)
- One-click "Create Issue" for any off-track metric (same as the existing ScorecardSnapshot component)
- The modal uses the metric data already prefetched on the page -- no extra loading

**2. Rock Review Modal**
Clicking a rock agenda item shows a modal with:
- Rock title, owner, status, confidence level
- Linked metrics and their reality gap data (already fetched via `rockGapMap`)
- Quick actions: reassign owner, add collaborator

**3. Todo Summary Modal**
Clicking the "To-Do List" section header shows:
- All open to-dos with owner and due date
- Overdue items highlighted
- Ability to check off completed items

**4. Section Header Click Behavior**
Each section header (Scorecard, Rock Review, etc.) becomes clickable during live meetings. Clicking opens the relevant data modal for that whole section, not just individual items.

---

### Technical Details

**New Component: `src/components/meetings/ScorecardModal.tsx`**
- A Dialog that fetches all active metrics + results for the org's current period (reusing the same query pattern from `ScorecardSnapshot`)
- Renders the metric list with status icons, actual/target values, and "Create Issue" buttons
- Props: `open`, `onClose`, `organizationId`, `periodKey`

**New Component: `src/components/meetings/RockReviewModal.tsx`**
- Dialog showing rocks with status, confidence, owner, and linked metric gaps
- Reuses data from the existing `rockGapMap` query
- Props: `open`, `onClose`, `organizationId`, `periodKey`

**New Component: `src/components/meetings/TodoReviewModal.tsx`**
- Dialog showing all org to-dos (not just meeting-specific ones), with check-off capability
- Props: `open`, `onClose`, `organizationId`

**Modified: `src/pages/MeetingDetail.tsx`**
- Add state variables for each modal (`showScorecardModal`, `showRockModal`, `showTodoModal`)
- Make section headers in the `SECTION_ORDER.map()` loop clickable during live/preview mode
- For the "scorecard" section, clicking the header opens `ScorecardModal`
- For the "rock_review" section, clicking opens `RockReviewModal`
- For the "todo_list" section, clicking opens `TodoReviewModal`
- Add a small eye/expand icon next to the section title to signal it's clickable

**Modified: `src/components/meetings/AgendaItemRow.tsx`**
- For metric items: add an "expand" icon that opens the scorecard modal for that specific metric (shows value, target, trend)
- For rock items: the existing `RockGapPanel` popover already works well; no change needed
- This keeps the row-level click for editing, while adding a dedicated icon for data preview

### What This Means for You

- During your weekly meeting, clicking "Scorecard" shows all your numbers in a popup -- no navigation needed
- You can create issues from off-track metrics right from the modal
- Rock review shows reality gaps inline
- To-do review lets you check things off without switching pages
- Everything stays on the meeting page so the team stays focused

