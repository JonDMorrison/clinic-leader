
# Data-First Flow: Restructuring the Scorecard Journey

## The Problem

Right now there are two competing paths:
1. **Scorecard Setup Wizard** (`/scorecard/setup`) — asks users to define metrics from scratch before any data exists
2. **Data Page** (`/data`) — shows ingested data and lets users "Add to Scorecard" with a target

These create confusion about what comes first. The user's instinct is correct: **data should come first**, and the scorecard should be built by promoting data points the clinic owner cares about.

## The New Mental Model

```text
Data Ingestion --> Browse Available Data --> "Track This" (set goal) --> Scorecard --> Off-Track? --> Issue
```

1. **Data comes in** (Jane sync, workbook upload, manual entry, CSV)
2. **Clinic owner browses /data** and sees all available data points with current values
3. **They click "Track This"** on metrics they care about, setting a target/goal
4. **Those metrics appear on /scorecard** with status tracking
5. **Off-track metrics can be escalated** to Issues for the L10 meeting

## Changes Required

### 1. Redirect Scorecard Empty State to /data (not /scorecard/setup)

When a user has zero scorecard metrics, instead of showing the setup wizard, guide them to the Data page with a message like: "Connect your data first, then choose which metrics to track."

**Files:** `src/pages/Scorecard.tsx`, `src/components/dashboard/DashboardPrimaryStack.tsx`

### 2. Update the Dashboard CTA

The "Get Started" button on the dashboard currently points to `/scorecard/setup`. Change it to point to `/data` with copy like "Connect Your Data" or "See Your Data."

**File:** `src/components/dashboard/DashboardPrimaryStack.tsx`

### 3. Improve "Add to Scorecard" UX on the Data Page

The current "Add to Scorecard" option is buried in a dropdown menu. Make it more prominent:
- Add a visible "Track" or "Add to Scorecard" button directly on untracked metric rows
- Show a clear visual distinction between tracked (on scorecard) and untracked metrics
- Add a banner at the top: "Choose which metrics matter most to your clinic. Set a goal to start tracking."

**File:** `src/components/data/DataMetricsTable.tsx`

### 4. Keep Scorecard Setup Wizard as a Secondary Path

Don't remove `/scorecard/setup` entirely — it's still useful for clinics that want to define custom metrics not tied to Jane. But it should no longer be the primary onboarding path.

**File:** `src/pages/ScorecardSetup.tsx` (no changes needed, just de-prioritized)

### 5. Update ConnectDataCard on Dashboard

The existing `ConnectDataCard` already points users to `/data`. Update its copy to reinforce the data-first message: "Your scorecard starts with your data."

**File:** `src/components/dashboard/ConnectDataCard.tsx`

## Technical Details

- **No database changes required.** The `metrics` table, `metric_results`, and "Add to Scorecard" mutation all work correctly already.
- The `AddJaneMetricModal` already handles creating a metric with `import_key`, target, direction, and category when promoting from data.
- The `DataMetricsTable` already distinguishes `isTracked` vs untracked metrics.
- The key changes are UX routing and visual prominence, not backend logic.

## Summary of File Changes

| File | Change |
|------|--------|
| `src/pages/Scorecard.tsx` | Empty state redirects to `/data` instead of `/scorecard/setup` |
| `src/components/dashboard/DashboardPrimaryStack.tsx` | CTA points to `/data`, updated copy |
| `src/components/data/DataMetricsTable.tsx` | More prominent "Track This" buttons on untracked rows, guidance banner |
| `src/components/dashboard/ConnectDataCard.tsx` | Updated messaging |
