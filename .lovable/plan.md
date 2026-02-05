
# Cleaner Data Page UI: Consolidated Toolbar

## Overview
Consolidate the two rows of tabs into a single, unified toolbar row. Replace the month tabs (which grow indefinitely) with a compact dropdown selector, and convert the view toggle into a sleek segmented control. This mirrors patterns from Linear, Stripe, and Notion - keeping controls compact while maintaining quick access.

## Current Issues
- **Two rows of controls** - month tabs (row 1) + view toggle (row 2) creates visual clutter
- **Month tabs don't scale** - as more months are imported, the tab row becomes unwieldy
- **Inconsistent styling** - the two tab rows look slightly different

## Proposed Layout

```text
+------------------------------------------------------------------------+
| [Database Icon] Data                                                    |
| Monthly clinic metrics                                                  |
+------------------------------------------------------------------------+
| [January 2026 ▼]  |  [◉ Summary | Raw]  |  Jan 15, 2:30 PM    [Import] |
+------------------------------------------------------------------------+
|                                                                        |
|                        (Report Content)                                |
|                                                                        |
+------------------------------------------------------------------------+
```

## Changes

### 1. Replace Month Tabs with Select Dropdown
- Use the existing `Select` component from shadcn/ui
- Shows "January 2026" (full month name) with dropdown chevron
- Dropdown lists all months + YTD option at the top
- YTD gets a subtle highlight/separator in the dropdown

### 2. Convert View Toggle to Segmented Control
- Use `ToggleGroup` with `outline` variant for the Summary/Raw toggle
- More compact than full TabsList
- Icons only on desktop; icons + text possible but optional

### 3. Merge Into Single Toolbar Row
- All controls in one `flex` row with proper spacing
- Left: Period dropdown
- Center: View segmented control (only when viewing a single month, not YTD)
- Right: Timestamp metadata + Import button

### 4. Styling
- Dropdown trigger styled with subtle border, matches app aesthetic
- Segmented control uses muted backgrounds with primary highlight for active state
- Consistent with glassmorphic/clean design language

---

## Technical Details

### Files to Modify
- `src/pages/DataDefaultHome.tsx` - main restructure

### Component Changes

**Remove:**
- First `<Tabs>` block (month tabs, lines 263-290)
- Second `<Tabs>` block wrapper (view toggle, lines 299-327)

**Add:**
- Import `Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator` from `@/components/ui/select`
- Import `ToggleGroup, ToggleGroupItem` from `@/components/ui/toggle-group`
- Single toolbar `<div>` containing:
  - Period `<Select>` dropdown
  - View `<ToggleGroup>` (conditional: only for single month, hidden for YTD)
  - Metadata span + Import button

### Code Structure

```tsx
{/* Unified Toolbar */}
<motion.div ...>
  <div className="flex items-center justify-between gap-4">
    {/* Left: Period Selector */}
    <Select value={...} onValueChange={setSelectedPeriod}>
      <SelectTrigger className="w-[180px]">
        <Calendar className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currentYearMonths.length > 0 && (
          <>
            <SelectItem value="ytd">
              <TrendingUp /> {currentYear} YTD
            </SelectItem>
            <SelectSeparator />
          </>
        )}
        {[...availableMonths].reverse().map(month => (
          <SelectItem key={month.period_key} value={month.period_key}>
            {formatPeriodKey(month.period_key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Center: View Toggle (only for single month) */}
    {!isYTDSelected && reportData?.payload && (
      <ToggleGroup type="single" value={viewTab} onValueChange={...}>
        <ToggleGroupItem value="summary">
          <BarChart3 /> Summary
        </ToggleGroupItem>
        <ToggleGroupItem value="raw">
          <FileText /> Raw
        </ToggleGroupItem>
      </ToggleGroup>
    )}

    {/* Right: Metadata + Import */}
    <div className="flex items-center gap-3 ml-auto">
      {reportData && (
        <span className="text-sm text-muted-foreground">
          <Clock /> {format(...)}
        </span>
      )}
      <Button ...>Import</Button>
    </div>
  </div>
</motion.div>
```

### Visual Polish
- Dropdown shows months in reverse chronological order (newest first)
- YTD option appears at top with separator below
- Toggle group uses `variant="outline"` for subtle borders
- Metadata (timestamp, filename) moves to far right, secondary styling

## Benefits
- **One row instead of two** - cleaner visual hierarchy
- **Scales gracefully** - dropdown handles any number of months
- **Faster navigation** - dropdown is quicker than scanning many tabs
- **Consistent with modern SaaS patterns** - Stripe, Linear, Notion all use this approach

