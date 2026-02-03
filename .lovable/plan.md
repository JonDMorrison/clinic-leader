
# Dashboard Header Redesign Plan

## Problem Identified

The current dashboard header has significant wasted horizontal and vertical space on desktop:

1. **Greeting section** spans full width but only uses left portion
2. **User avatar** is fixed-positioned separately (top-right corner)
3. **Inspirational message** is on its own line, adding vertical height
4. **CoreValuesStrip** runs full-width below, creating visual disconnect

## Proposed Solution: Compact Hero Header

Reorganize the top section into a cohesive "hero header" that uses horizontal space efficiently on desktop while remaining responsive on mobile.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DESKTOP LAYOUT (lg+)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────┐  ┌────────────────────────┐ │
│  │  Hey Aaron 👋                               │  │   Quick Actions Grid   │ │
│  │  "Focus is saying no to good ideas."        │  │   ┌────┐ ┌────┐        │ │
│  │  Here's your overview for today.            │  │   │ +  │ │ 📊 │        │ │
│  │                                             │  │   └────┘ └────┘        │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │  │   ┌────┐ ┌────┐        │ │
│  │  │Core │ │Value│ │ ... │ │Badge│ │ ⚙  │   │  │   │ 🎯 │ │ 📅 │        │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └────-┘   │  │   └────┘ └────┘        │ │
│  └─────────────────────────────────────────────┘  └────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Changes

### 1. Create a New DashboardHeroHeader Component

**File**: `src/components/dashboard/DashboardHeroHeader.tsx`

A unified component that consolidates:
- Greeting + inspirational message
- CoreValuesStrip (embedded inline)
- On desktop (lg+), use a 2-column grid:
  - Left column: greeting, message, core values strip
  - Right column: QuickActions component (moved from bottom grid)

### 2. Update Home.tsx Layout

**File**: `src/pages/Home.tsx`

- Replace standalone greeting + CoreValuesStrip with `<DashboardHeroHeader />`
- Move `QuickActions` from the bottom 2x2 grid into the header on desktop
- Adjust the bottom grid from `lg:grid-cols-2` (4 items) to show only 3 remaining items:
  - Recent Activity
  - CopilotWidget  
  - CoreValueOfWeekCard

### 3. Responsive Behavior

- **Mobile/Tablet** (`< lg`): Stack everything vertically as before, QuickActions stays in its current grid position
- **Desktop** (`lg+`): Side-by-side hero layout with QuickActions integrated

### 4. Visual Refinements

- Add subtle glass card styling to the hero section
- Reduce top padding by using the combined header instead of separate stacked elements
- Keep the user avatar in its current fixed position (it works well in the top-right)

---

## Technical Details

### New Component Structure

```typescript
// DashboardHeroHeader.tsx
export const DashboardHeroHeader = ({ 
  userName, 
  inspirationalMessage 
}: DashboardHeroHeaderProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: 2/3 width on desktop */}
      <div className="lg:col-span-2 space-y-4">
        <motion.div>
          <p className="text-xl md:text-2xl font-semibold">
            Hey {userName} 👋
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            <span className="italic">{inspirationalMessage}</span>{' '}
            Here's your overview for today.
          </p>
        </motion.div>
        <CoreValuesStrip />
      </div>
      
      {/* Right column: QuickActions - hidden on mobile */}
      <div className="hidden lg:block">
        <QuickActions />
      </div>
    </div>
  );
};
```

### Home.tsx Changes

```typescript
// Before: Separate components stacked vertically
<motion.div>{/* greeting */}</motion.div>
<CoreValuesStrip />
{/* ... stat cards ... */}
<motion.div className="grid lg:grid-cols-2">
  <Card>{/* Recent Activity */}</Card>
  <QuickActions />
  <CopilotWidget />
  <CoreValueOfWeekCard />
</motion.div>

// After: Unified hero header
<DashboardHeroHeader 
  userName={currentUser?.full_name?.split(' ')[0] || 'there'}
  inspirationalMessage={inspirationalMessage}
/>
{/* ... stat cards ... */}
<motion.div className="grid lg:grid-cols-3 gap-6">
  <Card>{/* Recent Activity */}</Card>
  <CopilotWidget />
  <CoreValueOfWeekCard />
</motion.div>
{/* QuickActions shown here only on mobile via lg:hidden */}
<div className="lg:hidden">
  <QuickActions />
</div>
```

---

## Alternative Approach (Simpler)

If you prefer minimal code changes, we could instead:

1. **Inline the CoreValuesStrip** directly below the greeting on the same glass card
2. **Keep QuickActions** in the lower grid but make the grid smarter:
   - Desktop: 3-column grid for better balance
   - Recent Activity takes 1 column
   - QuickActions + CopilotWidget share middle
   - CoreValueOfWeekCard on right

---

## Estimated Impact

- **Space savings**: ~60-80px vertical space reclaimed on desktop
- **Information density**: Same content, better organized
- **Visual hierarchy**: Clear hero section establishes context immediately
- **Mobile unchanged**: Stacks naturally on smaller screens

## Files to Modify

1. `src/components/dashboard/DashboardHeroHeader.tsx` (new)
2. `src/pages/Home.tsx` (refactor layout)
3. `src/components/layout/QuickActions.tsx` (minor: ensure it works in both contexts)
