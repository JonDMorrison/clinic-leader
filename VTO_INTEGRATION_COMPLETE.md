# V/TO Integration Complete

## Overview
The Vision/Traction Organizer (V/TO) is now the **strategic foundation** that drives your EOS app. All components are interconnected and automatically synchronized.

---

## 🔄 Save Flow & Integration

### When V/TO is Saved:

1. **Version Management** (`vto-save` edge function)
   - Creates/updates `vto_version` (draft or published)
   - Archives previous published versions
   - Logs to `vto_audit` table

2. **Progress Calculation** (`vto-compute-progress` edge function)
   - **Vision Score**: % of completed fields
   - **Traction Score**: Weighted average from linked KPIs/Rocks/Issues
     - Rocks: `on_track=1.0`, `at_risk=0.5`, `off_track=0.0`
     - KPIs: Progress % toward target (0-1)
     - Issues: `resolved` contributes positively
   - Stores detailed breakdown per `goal_key` in `vto_progress`

3. **Real-Time Sync** (NEW ✨)
   - When Rock status changes → triggers progress recompute
   - When KPI reading added → updates traction score
   - When Issue status changes → recalculates linked goal progress

---

## 🎯 Cross-App Visibility (NEW ✨)

### 1. **Rocks Page**
- **VTO Goal Badge**: Shows which V/TO goals each rock supports
- Hover to see goal description and context
- Click badge to navigate to V/TO

### 2. **Scorecard Page**
- **VTO Goal Badge**: Appears on KPIs linked to strategic goals
- Shows contribution to traction score
- Real-time updates when values change

### 3. **Issues Page**
- **VTO Goal Badge**: Identifies issues tied to strategic goals
- Helps prioritize based on strategic impact
- Links to relevant V/TO context

### 4. **Dashboard**
- **VTO Card**: Vision/Traction scores, top 3 at-risk goals
- Direct link to V/TO page

---

## 📊 L10 Meeting Integration (ENHANCED ✨)

### VTO Quick View Panel:
1. **Traction Progress**: Live score with progress bar
2. **Off-Track Goals**: Auto-identified from progress data
3. **"Add to IDS" Button**: One-click to convert off-track goal to issue
4. **"Attach Snapshot" Button** (NEW): Saves current V/TO state to meeting minutes
   - Captures vision_score, traction_score, off_track_goals
   - Timestamp for historical tracking
   - Automatically finds today's L10 meeting

---

## 🤖 AI Wizard Context (NEW ✨)

### AI Integration (`src/lib/ai/vtoContext.ts`):

**VTO Summary Includes:**
- 10-year target
- 3-year highlights
- 1-year goals
- Current quarter
- Active rocks with status
- Linked KPIs with progress
- At-risk goals (automatically identified)

**Role-Based AI Chips:**
- **Owner/Director**: 
  - "Progress toward 1-Year Plan?"
  - "What's off-track for this quarter?"
  - "Which Rocks affect our red KPIs?"
- **Manager**:
  - "Team progress on quarterly rocks?"
  - "Which KPIs support our V/TO goals?"

**Formatting**: PHI-free, strategic context only

---

## 🔗 Auto-Linking System

### Link Suggestions (`src/lib/vto/linkSuggest.ts`):
- Text similarity matching (token overlap)
- Matches goals to existing KPIs/Rocks/Issues/Docs
- Threshold: 0.3 similarity score
- Top 3 suggestions per goal
- **Never creates new items** - only links to existing

### Link Types:
- `kpi`: Performance metrics
- `rock`: Quarterly priorities
- `issue`: Problems to solve
- `doc`: SOPs and documentation

### Weight System:
- Default weight: 1.0
- Used in traction score calculation
- Adjustable per link

---

## ⚡ Real-Time Triggers (NEW ✨)

### Automatic Progress Updates (`useVTORealtimeSync` hook):

**Listens for:**
1. **Rock status changes** → triggers `vto-trigger-compute`
2. **KPI reading inserts** → updates traction score
3. **Issue status changes** → recalculates goal progress

**Edge Function** (`vto-trigger-compute`):
- Finds active VTO for team
- Gets latest version
- Invokes `vto-compute-progress`
- Logs trigger type for debugging

**Result**: Traction scores update automatically across the app!

---

## 📦 Components Created/Updated

### New Components:
- ✅ `VTOGoalBadge` - Shows V/TO link with hover details
- ✅ `useVTOLinks` hook - Fetches links for any entity
- ✅ `useVTORealtimeSync` hook - Real-time progress updates
- ✅ `getVTOContext` - AI context generation
- ✅ `formatVTOContextForAI` - AI prompt formatting
- ✅ `getVTOAIChips` - Role-based AI suggestions

### Updated Components:
- ✅ `RockCard` - Added VTO badge
- ✅ `KpiCardCompact` - Added VTO badge
- ✅ `IssueCard` - Added VTO badge
- ✅ `VtoL10Panel` - Added snapshot button
- ✅ `VTO` page - Added real-time sync

### New Edge Functions:
- ✅ `vto-trigger-compute` - Triggers progress calculation

---

## 🎯 User Flow Examples

### Example 1: Rock Status Change
1. Manager marks Rock as "Off Track"
2. Real-time listener detects change
3. `vto-trigger-compute` edge function called
4. `vto-compute-progress` recalculates traction score
5. Dashboard VTO Card updates automatically
6. L10 panel shows rock in "Off-Track Goals"
7. AI Wizard receives updated context

### Example 2: L10 Meeting
1. Team opens L10 page
2. VTO Quick View shows current traction
3. Off-track goals listed with "Add to IDS" buttons
4. Click "Attach Snapshot"
5. Current V/TO state saved to meeting minutes
6. Historical comparison available for next meeting

### Example 3: KPI Update
1. Staff enters new KPI value
2. Real-time trigger fires
3. Linked V/TO goals' progress recalculated
4. KPI card shows VTO badge
5. Hover shows which goal this KPI supports
6. Click badge to see full V/TO context

---

## 🔒 Security & PHI Compliance

✅ All V/TO data is **business planning** - no PHI
✅ RLS policies enforce org scoping
✅ Staff see published versions only (read-only)
✅ Managers can edit Traction fields
✅ Owners/Directors have full control
✅ AI context excludes sensitive data
✅ Audit trail for all actions

---

## 📈 Performance Considerations

- **Real-time triggers**: Debounced to prevent excessive calls
- **Progress computation**: Runs async, doesn't block UI
- **Link suggestions**: Client-side, instant feedback
- **Query caching**: React Query invalidation on updates

---

## 🚀 What Makes This Powerful

1. **Single Source of Truth**: V/TO defines strategy, everything else executes it
2. **Automatic Progress**: No manual score updates - it's always current
3. **Contextual Intelligence**: AI knows your strategic priorities
4. **Cross-Functional Visibility**: Every role sees how their work contributes
5. **Meeting Efficiency**: L10s start with strategic context
6. **Historical Tracking**: Snapshots show progress over time

---

## 🎉 V/TO is Now the Heart of Your EOS App!

Every KPI, Rock, and Issue can now be strategically aligned. The system automatically tracks execution and keeps everyone focused on what matters most.
