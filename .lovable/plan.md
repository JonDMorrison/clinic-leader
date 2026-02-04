
# Dashboard Space Optimization Plan

## Problem Analysis

Looking at the screenshot and codebase, the dashboard has a significant empty space between the hero header (greeting + core values + Quick Actions) and the stat cards at the bottom. This happens because:

1. **Conditionally-hidden widgets leave gaps**: Several components like `ConnectDataCard`, `GettingStartedWidget`, `IssueSuggestionsWidget`, and `DemoBanner` only render when specific conditions are met. When these conditions are not met, the space is left empty.

2. **Missing key content cards**: The VTO Card, Monthly Pulse Widget, and other valuable widgets exist but are not included in the current layout.

3. **Poor layout density**: The 3-column grid (Recent Activity, Copilot Widget, Core Value of Week) is positioned after the stat cards, leaving the middle of the page sparse.

## Solution Architecture

Reorganize the dashboard into a denser, two-section layout:

```text
+-------------------------------------------------------------------+
| Hero Header (Greeting + Values + Quick Actions)                   |
+-------------------------------------------------------------------+
| [Demo Banner / Connect Data / Getting Started - conditional]      |
+-------------------------------------------------------------------+
| LEFT COLUMN (2/3)              | RIGHT COLUMN (1/3)               |
| +----------------------------+ | +-----------------------------+  |
| | Stat Cards (4 across)      | | | V/TO Strategic Progress     |  |
| +----------------------------+ | |                             |  |
| | Monthly Pulse Widget       | | +-----------------------------+  |
| +----------------------------+ | | AI Copilot                  |  |
| | Issue Suggestions          | | |                             |  |
| +----------------------------+ | +-----------------------------+  |
| | Recent Activity            | | | Core Value of the Week     |  |
| +----------------------------+ | +-----------------------------+  |
+-------------------------------------------------------------------+
| Year in Progress Preview (full width banner)                      |
+-------------------------------------------------------------------+
```

## Implementation Steps

### 1. Add VTO Card to Dashboard
Import and add the `VtoCard` component to the right sidebar. This provides strategic visibility that matches the premium feel of the app.

**File**: `src/pages/Home.tsx`

### 2. Add Monthly Pulse Widget
The `MonthlyPulseWidget` exists but is not used. Add it to provide scorecard health visibility for monthly metrics.

**File**: `src/pages/Home.tsx`

### 3. Reorganize into Two-Column Layout
Convert the current sequential layout into a responsive two-column grid:
- Left column (2/3 width): Stat cards, Monthly Pulse, Issue Suggestions, Recent Activity
- Right column (1/3 width): VTO Card, Copilot, Core Value of Week

This uses `lg:grid-cols-3` with the left content spanning 2 columns.

**File**: `src/pages/Home.tsx`

### 4. Move Stat Cards into Main Grid
Instead of placing stat cards in their own full-width row, integrate them within the left column of the main grid to maximize density.

**File**: `src/pages/Home.tsx`

### 5. Add Fallback Content for Empty States
When conditional widgets (Issue Suggestions, Monthly Pulse) don't render, add fallback placeholder cards that:
- Promote setting up the scorecard
- Encourage data connection
- Link to relevant documentation

**New component**: `src/components/dashboard/DashboardPlaceholders.tsx`

### 6. Adjust Vertical Spacing
Reduce excessive `space-y-8` gaps to `space-y-6` for tighter visual rhythm while maintaining readability.

**File**: `src/pages/Home.tsx`

## Technical Details

### Updated Layout Structure (Home.tsx)

```tsx
// Main content grid
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Left column - 2/3 width */}
  <div className="lg:col-span-2 space-y-6">
    {/* Stat cards in 2x2 grid on mobile, 4-across on desktop */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((slotIndex) => (
        <CustomizableStatCard ... />
      ))}
    </div>
    
    {/* Monthly Pulse or Scorecard Setup Card */}
    <MonthlyPulseWidget />
    
    {/* Issue Suggestions */}
    <IssueSuggestionsWidget />
    
    {/* Recent Activity */}
    <RecentActivityCard />
  </div>
  
  {/* Right sidebar - 1/3 width */}
  <div className="space-y-6">
    <VtoCard />
    <CopilotWidget />
    <CoreValueOfWeekCard />
  </div>
</div>
```

### New Fallback Component (DashboardPlaceholders.tsx)

Create a simple component that renders when no active widgets are shown:

```tsx
export const ScorecardSetupCard = () => (
  <Card className="border-dashed">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-brand" />
        Set Up Your Scorecard
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">
        Track weekly KPIs to keep your team aligned and on target.
      </p>
      <Button onClick={() => navigate('/scorecard')}>
        Get Started
      </Button>
    </CardContent>
  </Card>
);
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Reorganize layout, add VtoCard and MonthlyPulseWidget |
| `src/components/dashboard/DashboardPlaceholders.tsx` | New: fallback cards for empty states |

## Visual Impact

- Eliminates large empty space in the middle of the dashboard
- VTO Card prominently displays strategic progress
- Monthly Pulse shows scorecard health at a glance
- Copilot remains accessible but in sidebar context
- Layout adapts gracefully on mobile (stacks vertically)
- Dashboard feels dense and information-rich like premium SaaS tools (Linear, Notion)

## Mobile Behavior

On mobile (`< lg` breakpoint):
- Full layout stacks vertically
- Order: Header, Conditional Banners, Stat Cards, VTO Card, Monthly Pulse, Issue Suggestions, Copilot, Recent Activity, Core Value, Year Preview
- Quick Actions shown at bottom (existing behavior preserved)
