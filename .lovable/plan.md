

## Plan: Replace Status Badges with Percentage Change Indicators

### Overview
Replace the "On Track" / "Off Track" / "Tracked" status badges in the `/data` page metrics table with percentage change indicators that show month-over-month change with directional arrows (green ↑ / red ↓) and percentage values, matching the pattern used in the Executive Summary Card.

---

### Current Behavior
The `getStatusBadge` function in `DataMetricsTable.tsx` shows text-based badges:
- "Tracked" (green) - when on track
- "Off Track" (red) - when below target  
- "Available" - when not tracked

### New Behavior  
Display percentage change vs previous month:
- **Green arrow + positive %** when value increased
- **Red arrow + negative %** when value decreased  
- **Gray dash + 0%** when stable (no significant change)
- **"—"** when no previous month data to compare

---

### Files to Modify

**1. `src/components/data/DataMetricsTable.tsx`**

Update the data model to include previous month values:
- Add `prevMonthValue` field to the `DataMetric` interface
- Populate `prevMonthValue` from `metricResults.monthly` using `lastMonthKey`

Replace `getStatusBadge` function with a new `renderPercentChange` function:
- Calculate percentage change: `((current - previous) / |previous|) * 100`
- Display with `TrendingUp` (green) or `TrendingDown` (red) icons from lucide-react
- Handle edge cases (null values, zero previous, stable)

The rendering pattern will match `ExecutiveSummaryCard.tsx`:
```tsx
// If change is positive:
<span className="flex items-center gap-0.5 text-sm font-medium text-success">
  <TrendingUp className="w-3.5 h-3.5" />
  +12%
</span>

// If change is negative:
<span className="flex items-center gap-0.5 text-sm font-medium text-destructive">
  <TrendingDown className="w-3.5 h-3.5" />
  -8%
</span>

// If stable:
<span className="flex items-center gap-0.5 text-sm text-muted-foreground">
  <Minus className="w-3.5 h-3.5" />
  0%
</span>
```

---

### Technical Details

**Calculate change function** (reusable helper):
```typescript
function calculatePercentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  if (previous === 0 && current === 0) return { percent: 0, direction: 'stable' };
  if (previous === 0) return { percent: 100, direction: current > 0 ? 'up' : 'down' };
  
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.5) return { percent: 0, direction: 'stable' };
  
  return {
    percent: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : 'down'
  };
}
```

**Color logic based on metric direction preference:**
- For metrics where higher is better (direction: "up"): green = increase, red = decrease
- For metrics where lower is better (direction: "down"): red = increase, green = decrease

This matches the `getTrendColor` function already used in `ExecutiveSummaryCard.tsx`.

---

### Column Label Update
The "Status" column header will be renamed to **"Change"** or **"MoM"** (Month-over-Month) to reflect the new content.

---

### Edge Cases Handled
1. **No previous month data**: Display "—"
2. **No current month data**: Display "—"  
3. **Both values are zero**: Display "0%" with stable indicator
4. **Previous is zero, current is positive**: Display "+100%"
5. **Small changes < 0.5%**: Treat as stable (0%)

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/data/DataMetricsTable.tsx` | Add `prevMonthValue` to interface, add `TrendingDown`/`Minus` imports, update data population, replace `getStatusBadge` with `renderPercentChange`, rename column header |

