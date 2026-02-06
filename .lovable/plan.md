
# Plan: Remove Missing Targets Banner, Add Quiet Per-Card Indicator

## Overview
Replace the aggregate "32 metrics missing targets" banner with a subtle, non-judgmental "Needs Target" indicator on individual metric cards. This aligns with the project philosophy of avoiding shame-based aggregate counts.

## Changes

### 1. Remove MissingTargetsBanner from Scorecard Page
**File:** `src/pages/Scorecard.tsx`
- Remove the import for `MissingTargetsBanner` (line 35)
- Remove the `metricsWithoutTargets` memo calculation (lines 492-501)
- Remove the `handleConfigureTarget` function (lines 504-506)
- Remove the `<MissingTargetsBanner>` component rendering (lines 589-593)

### 2. Add Quiet "Needs Target" Indicator to MetricCard
**File:** `src/components/scorecard/MetricCard.tsx`
- In the "Target & Trend" section (around line 228-258), when `metric.target` is null/undefined, display a subtle muted badge saying "Needs Target" instead of showing nothing
- Keep it visually quiet: use muted/gray styling, small text, no warning colors
- The card already opens a detail drawer on click, where users can set the target

## Visual Design
The indicator will appear in the existing Target & Trend row:
- **When target exists:** Shows "Target: ↑ 50 visits" (current behavior)  
- **When target is missing:** Shows a quiet gray badge "Needs Target" - no warning icon, no alarming colors

## Technical Details

```text
┌────────────────────────────────────────┐
│  Target & Trend Row (line ~228)        │
├────────────────────────────────────────┤
│  IF target exists:                     │
│    [Target: ↑ 50 visits]  [↑ Trending] │
│                                        │
│  IF target is null:                    │
│    [Needs Target]         [↑ Trending] │
│    (muted gray badge)                  │
└────────────────────────────────────────┘
```

### Code Changes Summary

**Scorecard.tsx removals:**
- Line 35: Remove `MissingTargetsBanner` import
- Lines 492-506: Remove unused memo and handler
- Lines 589-593: Remove banner component

**MetricCard.tsx addition:**
- Lines 230-242: Add else-branch when `!metric.target` to show a quiet "Needs Target" badge with muted styling
