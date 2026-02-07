
# Plan: Make "Create Issue" a Secondary Dropdown Action

## Overview
Replace the conditional primary action (red "Create Issue" vs "Update") with a consistent layout where "Update" is always the primary action, and "Create Issue" is tucked into a secondary dropdown menu. This removes the alarming visual treatment while keeping the functionality accessible.

## Changes

### File: `src/components/scorecard/MetricCard.tsx`

**1. Add dropdown imports (line 6)**
- Import `MoreHorizontal` icon from lucide-react
- Import dropdown components from `@/components/ui/dropdown-menu`

**2. Refactor Actions section (lines 332-370)**
Replace the current conditional logic with:
- **Primary action**: Always show "Update" button with `variant="ghost"`
- **Secondary action**: Keep "Link V/TO" button as-is
- **Overflow menu**: Add a small dropdown button with `MoreHorizontal` icon containing:
  - "Create Issue" option (visible when metric is off-track)

## Visual Layout

```text
Current (conditional):
┌─────────────────────────────────────┐
│ [🔴 Create Issue]  [Link V/TO]      │  ← When off-track
│ [Update]           [Link V/TO]      │  ← When on-track
└─────────────────────────────────────┘

New (consistent):
┌─────────────────────────────────────┐
│ [Update]  [Link V/TO]  [⋯]          │  ← Always
│                         └─ Dropdown │
│                            • Create Issue (if off-track)
└─────────────────────────────────────┘
```

## Technical Details

### New imports to add:
```tsx
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

### New Actions section structure:
```tsx
<div className="flex gap-2">
  <Button 
    variant="ghost" 
    size="sm" 
    className="flex-1"
    onClick={handleUpdateClick}
  >
    <ExternalLink className="w-3 h-3 mr-2" />
    Update
  </Button>
  <Button 
    variant="outline" 
    size="sm" 
    className="flex-1"
    onClick={(e) => {
      e.stopPropagation();
      setLinkToVTOOpen(true);
    }}
  >
    <LinkIcon className="w-3 h-3 mr-2" />
    Link V/TO
  </Button>
  {isOffTrack && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setCreateIssueOpen(true);
        }}>
          <AlertTriangle className="w-3 h-3 mr-2" />
          Create Issue
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
```

## Benefits
- Removes the alarming red "Create Issue" button that disrupts the non-judgmental UI
- "Update" is always the consistent primary action users expect
- "Create Issue" remains accessible but in a secondary position
- The dropdown only appears when relevant (metric is off-track), keeping the UI clean for healthy metrics
