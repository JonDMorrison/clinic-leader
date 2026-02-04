

# Plan: Clarify the Issues → Interventions Workflow

## Problem Analysis

The current Issues page has several UX clarity problems:

1. **"IDS Board" is confusing** - Users don't know what IDS means (Identify, Discuss, Solve) without context
2. **Connection to Interventions is unclear** - Users don't understand that solving an issue should ideally lead to an Intervention
3. **No visual workflow guidance** - There's no indication of what the "next step" is after identifying an issue
4. **The "Close the Loop" modal is hidden** - Users only see the intervention prompt when they click "Mark Solved"

## Solution Overview

Create a clear, educational UX that shows the Issues → Interventions workflow upfront, using a condensed workflow stepper (similar to the existing `InterventionEducationPanel`).

---

## Technical Changes

### 1. Rename "IDS Board" to "Issues List" with IDS subtitle

**File:** `src/pages/Issues.tsx`

- Change CardTitle from "IDS Board" to "Issues List"
- Add a collapsible workflow hint banner above the card explaining the IDS → Intervention flow

### 2. Create a new `IssuesWorkflowBanner` component

**File:** `src/components/issues/IssuesWorkflowBanner.tsx` (new)

A compact, collapsible education component that:
- Shows a 3-step horizontal workflow: **Identify → Discuss → Solve → Create Intervention**
- Highlights the "Intervention" step as the recommended next action
- Is dismissible (stores dismissal in localStorage to avoid annoyance)
- Explains in one sentence: "IDS stands for Identify, Discuss, Solve. When you solve an issue, create an Intervention to track your solution's impact."

```text
+-------------------------------------------------------+
|  🔍 How Issues Work                          [Dismiss] |
|                                                        |
|  [Identify] → [Discuss] → [Solve] → [Intervention ✨]  |
|                                                        |
|  "When you solve an issue, create an Intervention to   |
|   track whether your solution actually worked."        |
+-------------------------------------------------------+
```

### 3. Update the IDSBoard component headers

**File:** `src/components/issues/IDSBoard.tsx`

- Change "Open Issues (Drag to Prioritize)" → "Open Issues"
- Add a subtle instruction: "Drag to reorder by priority"

### 4. Update the Issues page card header

**File:** `src/pages/Issues.tsx`

- Replace the current `CardTitle` and description with clearer copy
- Integrate the `IssuesWorkflowBanner` between the header and the card

### 5. Add "IDS" glossary entry enhancement

**File:** `src/lib/help/glossary.ts`

- Already exists, but update the `learnMore` to link to `/issues` 
- Add reference to Interventions in the definition

### 6. Make the Intervention button more prominent on Issue cards

**File:** `src/components/issues/IssueCard.tsx`

- Move the "Intervention" button to be more visible (currently same level as "Add Todo")
- Add a subtle visual indicator (e.g., primary color outline) to guide users

---

## Component Structure

```text
Issues Page
├── Header (title + subtitle + HelpHint for "Issue")
├── IDSFollowThroughCard (existing metric)
├── IssuesWorkflowBanner (new - collapsible education)
│   └── 4-step horizontal workflow with Intervention highlighted
├── IssueSuggestionsBanner (existing AI suggestions)
└── Card
    ├── Header: "Issues List" (not "IDS Board")
    ├── Subtitle: "Drag issues to reorder by priority"
    └── IDSBoard (existing component)
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/issues/IssuesWorkflowBanner.tsx` | Create new education component |
| `src/pages/Issues.tsx` | Rename card title, add workflow banner |
| `src/components/issues/IDSBoard.tsx` | Simplify header copy |
| `src/components/issues/IssueCard.tsx` | Make Intervention button more prominent |
| `src/lib/help/glossary.ts` | Enhance IDS entry to mention Interventions |

---

## Design Notes

- **Minimal visual clutter**: The workflow banner should be compact and dismissible
- **Consistent styling**: Use the same design tokens as `InterventionEducationPanel` (primary accents, rounded corners, subtle borders)
- **Mobile responsive**: The 4-step workflow should stack vertically on mobile
- **No new dependencies**: Use existing framer-motion for animations

