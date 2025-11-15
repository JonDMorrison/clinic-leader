# Clarity Builder to VTO Migration Plan

**Status:** Phase 1 - Documentation & Strategy  
**Created:** 2025-01-15  
**Version:** 1.0

---

## 🎯 Executive Summary

This document outlines the strategy for consolidating two parallel VTO implementations:
- **Clarity Builder** (`/clarity/*`) - JSONB-based with rich UX features
- **Original VTO** (`/vto/*`) - Relational database with version control and cross-app integration

**Decision:** Migrate to the **relational VTO model** as the single source of truth, while preserving the best UX features from Clarity Builder.

---

## 📊 Feature Comparison

### Clarity Builder Features (`/clarity/*`)

#### Data Model
- **Table:** `clarity_vto`
- **Storage:** Single JSONB columns for `vision`, `traction`, `metrics`
- **Schema:**
  ```sql
  clarity_vto (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    vision jsonb DEFAULT '{}',
    traction jsonb DEFAULT '{}',
    metrics jsonb DEFAULT '{}',
    version_current integer DEFAULT 1,
    created_at timestamp,
    updated_at timestamp
  )
  ```

#### Vision Fields (stored in `vision` JSONB)
- ✅ Core Values (array of strings)
- ✅ Core Focus (purpose, niche)
- ✅ 10-Year Target (text)
- ✅ Ideal Client Profile (text)
- ✅ Differentiators (array of strings)
- ✅ Proven Process (text)
- ✅ Promise/Guarantee (text)
- ✅ 3-Year Picture (revenue, measurables)
- ✅ Culture (text)

#### Traction Fields (stored in `traction` JSONB)
- ✅ 1-Year Goals (array of goal objects)
- ✅ Quarterly Priorities (90-day rocks)
- ✅ Issues List

#### Metrics (stored in `metrics` JSONB)
- ✅ Vision Clarity Score (0-100%)
- ✅ Traction Health Score (0-100%)
- ✅ Breakdown by section
- ✅ Off-track items tracking
- ✅ Last computed timestamp

#### UX Features
- ✅ **Custom Layout:** `ClarityShell` with mini-map sidebar
- ✅ **Mini-Map Navigation:** Visual progress indicators, click-to-jump
- ✅ **Autosave:** 2-second debounced saves with status indicator
- ✅ **AI Coach:** Context-aware suggestions (via `clarity-ai` edge function)
- ✅ **Activity Feed:** User action logging in `clarity_activity` table
- ✅ **Clickable Badges:** Pre-defined suggestions for Core Values, Differentiators
- ✅ **Real-time Presence:** Shows who's editing (capability exists)
- ✅ **Step-by-step Wizard:** Sequential form navigation
- ✅ **Progress Indicators:** Visual completion checkmarks
- ✅ **Smooth Scrolling:** Between sections

#### Edge Functions
- `clarity-save` - Saves draft data
- `clarity-ai` - AI coach suggestions
- `clarity-compute` - Calculates metrics
- `clarity-export` - Export to PDF/JSON
- `clarity-revise` - Manages revisions

#### Components
- `ClarityShell` - Main layout wrapper
- Vision editors: `CoreValuesEditor`, `CoreFocusEditor`, `TenYearTargetEditor`, `IdealClientEditor`, `DifferentiatorsEditor`, `ProvenProcessEditor`, `PromiseEditor`, `ThreeYearPictureEditor`, `CultureEditor`
- Traction: `DroppableBoard`, `GoalCard`, `ActivityFeed`

---

### Original VTO Features (`/vto/*`)

#### Data Model
- **Tables:** `vto`, `vto_versions`, `vto_progress`, `vto_links`, `vto_audit`
- **Storage:** Relational with proper normalization
- **Schema:**
  ```sql
  vto (
    id uuid PRIMARY KEY,
    team_id uuid NOT NULL,
    title text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp,
    updated_at timestamp
  )
  
  vto_versions (
    id uuid PRIMARY KEY,
    vto_id uuid REFERENCES vto(id),
    version integer,
    status text ('draft' | 'published' | 'archived'),
    
    -- Vision fields (structured columns)
    core_values text[],
    core_focus jsonb, -- {purpose, niche}
    ten_year_target text,
    marketing_strategy jsonb, -- {ideal_client, differentiators[], proven_process, guarantee}
    three_year_picture jsonb, -- {revenue, profit, measurables[], headcount, notes}
    
    -- Traction fields
    one_year_plan jsonb, -- {revenue, profit, measurables[], goals[]}
    quarter_key text,
    quarterly_rocks jsonb[],
    issues_company jsonb[],
    issues_department jsonb[],
    issues_personal jsonb[],
    
    published_at timestamp,
    created_by uuid,
    created_at timestamp
  )
  
  vto_progress (
    id uuid PRIMARY KEY,
    vto_version_id uuid REFERENCES vto_versions(id),
    computed_at timestamp,
    vision_score integer,
    traction_score integer,
    details jsonb
  )
  
  vto_links (
    id uuid PRIMARY KEY,
    vto_version_id uuid REFERENCES vto_versions(id),
    link_type text ('kpi' | 'rock' | 'issue' | 'doc'),
    link_id uuid,
    goal_key text,
    weight numeric,
    created_at timestamp
  )
  
  vto_audit (
    id uuid PRIMARY KEY,
    vto_version_id uuid REFERENCES vto_versions(id),
    user_id uuid,
    action text ('create' | 'publish' | 'archive' | 'edit' | 'link' | 'unlink' | 'export'),
    meta jsonb,
    created_at timestamp
  )
  ```

#### Vision Fields
- ✅ Core Values (text array)
- ✅ Core Focus (JSONB object)
- ✅ 10-Year Target (text)
- ✅ Marketing Strategy (JSONB with ideal_client, differentiators, proven_process, guarantee)
- ✅ 3-Year Picture (JSONB with revenue, profit, measurables, headcount, notes)
- ❌ **Missing:** Culture field
- ❌ **Missing:** Separate Ideal Client field (embedded in marketing_strategy)

#### Traction Fields
- ✅ 1-Year Plan (JSONB with goals array)
- ✅ Quarterly Rocks (JSONB array)
- ✅ Issues by category (company/department/personal)

#### Progress Tracking
- ✅ **Separate Progress Table:** Historical snapshots
- ✅ **Vision & Traction Scores:** Calculated values
- ✅ **Details by Goal:** Granular progress tracking
- ✅ **Linked Items:** Integration with KPIs, Rocks, Issues, Docs

#### Version Control
- ✅ **Multiple Versions:** Full history
- ✅ **Status Workflow:** draft → published → archived
- ✅ **Audit Trail:** Full action logging with metadata
- ✅ **Published Snapshots:** Point-in-time records

#### Cross-App Integration
- ✅ **VTO Links:** Connect goals to KPIs, Rocks, Issues, Docs
- ✅ **Weight System:** Prioritize linked items
- ✅ **Auto Computation:** Progress updates on linked item changes
- ✅ **Real-time Sync:** Via `useVTORealtimeSync` hook
- ✅ **L10 Integration:** VTO panel in meetings
- ✅ **Dashboard Widgets:** `VtoCard`, `PerformanceScore`

#### UX Features
- ✅ **Standard Layout:** Uses `AppLayout` with main sidebar
- ❌ **No Mini-Map:** Standard page navigation
- ❌ **No Autosave:** Manual save only
- ❌ **No AI Coach:** Not implemented
- ❌ **No Activity Feed:** Audit table exists but no UI
- ✅ **Preset Templates:** Load default VTOs
- ✅ **Export:** PDF/JSON export via `vto-export`

#### Edge Functions
- `vto-save` - Save/publish versions
- `vto-compute-progress` - Calculate scores
- `vto-trigger-compute` - Auto-trigger on linked item changes
- `vto-export` - Export functionality
- `vto-apply-preset` - Load templates
- `vto-undo-preset` - Revert templates

#### Components
- Standard form pages: `/vto`, `/vto/vision`, `/vto/traction`
- `VtoCard`, `VTOGoalBadge`, `VtoLinker`, `VtoL10Panel`
- Presets: `VtoLoadPresetsButton`, `VtoPresetWizard`

---

## 🔄 Data Migration Strategy

### Migration Approach

**Strategy:** One-time bulk migration with fallback support

1. **Create Migration Edge Function:** `migrate-clarity-to-vto`
2. **Run Migration:** Admin-triggered or automatic on app load
3. **Validation:** Verify data integrity post-migration
4. **Deprecation:** Archive `clarity_vto` table after success period

### Field Mapping

#### Vision Fields Migration

| Clarity Builder (`vision` JSONB) | VTO (`vto_versions` columns) | Transformation |
|----------------------------------|------------------------------|----------------|
| `vision.core_values[]` | `core_values text[]` | Direct copy |
| `vision.core_focus.purpose` | `core_focus.purpose` | Wrap in JSONB object |
| `vision.core_focus.niche` | `core_focus.niche` | Wrap in JSONB object |
| `vision.ten_year_target` | `ten_year_target text` | Direct copy |
| `vision.ideal_client` | `marketing_strategy.ideal_client` | Embed in JSONB |
| `vision.differentiators[]` | `marketing_strategy.differentiators[]` | Embed in JSONB |
| `vision.proven_process` | `marketing_strategy.proven_process` | Embed in JSONB |
| `vision.promise` | `marketing_strategy.guarantee` | Embed in JSONB (rename field) |
| `vision.three_year_picture.*` | `three_year_picture jsonb` | Direct copy with structure |
| `vision.culture` | ❌ **NEW FIELD NEEDED** | Store in `meta` or extend schema |

#### Traction Fields Migration

| Clarity Builder (`traction` JSONB) | VTO (`vto_versions` columns) | Transformation |
|------------------------------------|------------------------------|----------------|
| `traction.one_year_goals[]` | `one_year_plan.goals[]` | Embed in JSONB |
| `traction.quarterly_priorities[]` | `quarterly_rocks jsonb[]` | Map to rock structure |
| `traction.issues[]` | `issues_company jsonb[]` | Split by category if tagged |

#### Metrics Migration

| Clarity Builder (`metrics` JSONB) | VTO (`vto_progress` table) | Transformation |
|-----------------------------------|----------------------------|----------------|
| `metrics.vision_clarity` | `vision_score integer` | Direct copy |
| `metrics.traction_health` | `traction_score integer` | Direct copy |
| `metrics.breakdown` | `details jsonb` | Direct copy |
| `metrics.last_computed` | `computed_at timestamp` | Direct copy |

### Migration SQL Logic

```typescript
// Pseudocode for migration
for each org with clarity_vto data:
  1. Check if vto exists for org
     - If not, create vto record
  
  2. Check if vto_versions exist
     - If not, create initial version from clarity_vto
  
  3. Map fields:
     - core_values: direct copy
     - core_focus: wrap in {purpose, niche}
     - marketing_strategy: combine ideal_client, differentiators, proven_process, guarantee
     - three_year_picture: direct copy
     - one_year_plan: map from traction.one_year_goals
     - quarterly_rocks: map from traction.quarterly_priorities
     - issues: split traction.issues by category
  
  4. Create vto_progress record
     - vision_score = metrics.vision_clarity
     - traction_score = metrics.traction_health
     - details = metrics.breakdown
  
  5. Mark clarity_vto as migrated (add flag column)
  
  6. Audit log the migration
```

### Handling Edge Cases

1. **Missing Data:** Use sensible defaults
   - Empty arrays for lists
   - Null for optional fields
   - Default strings for required fields

2. **Culture Field:** Since VTO doesn't have this field
   - Option A: Add `culture text` to `vto_versions` schema
   - Option B: Store in `marketing_strategy.culture` 
   - Option C: Store in a separate `meta jsonb` field
   - **Recommendation:** Option A (add column)

3. **Multiple Clarity Versions:** Clarity has `version_current` but no history
   - Create single VTO version with current data
   - Set status to 'draft' or 'published' based on completeness

4. **Activity Logs:** `clarity_activity` table
   - Option A: Migrate to `vto_audit` table
   - Option B: Keep separate for historical reference
   - **Recommendation:** Option B (preserve history)

---

## 🛠️ Migration Implementation Plan

### Step 1: Schema Updates

**Required Changes to `vto_versions` table:**

```sql
-- Add culture field
ALTER TABLE vto_versions 
ADD COLUMN culture text;

-- Add migration tracking
ALTER TABLE clarity_vto
ADD COLUMN migrated_to_vto_id uuid REFERENCES vto(id),
ADD COLUMN migrated_at timestamp;
```

### Step 2: Create Migration Edge Function

**Function:** `supabase/functions/migrate-clarity-to-vto/index.ts`

**Features:**
- Read all `clarity_vto` records
- For each record:
  - Create or find `vto` record
  - Create `vto_versions` entry
  - Create `vto_progress` entry
  - Update `clarity_vto` with migration flag
  - Log to audit table

**Error Handling:**
- Transaction-based (rollback on error)
- Detailed error logging
- Skip already-migrated records

### Step 3: Migration Trigger

**Options:**
1. **Admin Panel:** Manual trigger button in `/admin` 
2. **Auto-detect:** On app load, check for unmigrated `clarity_vto` records
3. **Scheduled:** Run as background job

**Recommendation:** Combination of #1 and #2
- Admin can manually trigger
- App shows banner if unmigrated data detected

### Step 4: Validation & Testing

**Pre-Migration:**
- Backup `clarity_vto` table
- Count total records to migrate
- Verify schema compatibility

**Post-Migration:**
- Compare record counts
- Spot-check data integrity
- Verify all orgs have VTO records
- Test VTO pages with migrated data

**Rollback Plan:**
- Keep `clarity_vto` table intact for 30 days
- Add "Revert Migration" admin function if needed

---

## 📅 Migration Timeline

### Week 1: Preparation
- [ ] Add `culture` field to `vto_versions`
- [ ] Add migration tracking to `clarity_vto`
- [ ] Create migration edge function
- [ ] Write unit tests for migration logic

### Week 2: Testing
- [ ] Test migration on staging environment
- [ ] Validate data integrity
- [ ] Performance testing (large datasets)
- [ ] Create admin UI for migration trigger

### Week 3: Execution
- [ ] Announce migration to users (if applicable)
- [ ] Run migration on production
- [ ] Monitor for errors
- [ ] User acceptance testing

### Week 4: Cleanup
- [ ] Verify all data migrated successfully
- [ ] Update documentation
- [ ] Add deprecation warnings to Clarity Builder routes
- [ ] Plan `clarity_vto` table archival

---

## 🎓 Success Metrics

- [ ] 100% of `clarity_vto` records migrated
- [ ] Zero data loss
- [ ] All VTO features functional with migrated data
- [ ] Vision/Traction scores match pre-migration values
- [ ] Users can edit VTO without issues
- [ ] No increase in error rates
- [ ] Clarity Builder routes show migration notice

---

## 🚨 Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss during migration | High | Low | Full backup, transaction-based migration, thorough testing |
| Schema incompatibility | Medium | Medium | Pre-migration validation, flexible field mapping |
| User confusion | Medium | Medium | Clear communication, banner notifications, gradual rollout |
| Performance issues | Low | Low | Batch processing, background jobs, monitoring |
| Rollback complexity | High | Low | Keep original data intact, create revert function |

---

## 📝 Notes

- **Preserve History:** Do not delete `clarity_vto` or `clarity_activity` tables immediately
- **Gradual Transition:** Users can still access Clarity Builder during transition period
- **Documentation:** Update all user guides and help docs after migration
- **Training:** Consider user training sessions if org has many users

---

## 🔗 Related Documents

- [VTO Integration Complete](./VTO_INTEGRATION_COMPLETE.md)
- [Clarity Types](./src/lib/clarity/types.ts)
- [VTO Models](./src/lib/vto/models.ts)
- [Migration Edge Function](./supabase/functions/migrate-clarity-to-vto/index.ts)

---

**Next Steps:** Review this plan, approve schema changes, then proceed with implementation.
