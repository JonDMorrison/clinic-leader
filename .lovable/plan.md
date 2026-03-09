

## Plan: Add Tab Navigation Between Data Views

Since Northwest Injury Clinics uses **both** Jane metrics and Lori's monthly workbook, the router currently forces an either/or view. The fix is to replace the binary routing with **tabs** on the Data page when both data sources exist.

### Approach

**Modify `DataHomeRouter.tsx`** to render both views as switchable tabs instead of routing to one or the other:

- When the org has a Jane connector AND legacy monthly reports, show a **Tabs** bar at the top with two options:
  - **Metrics** (Jane view — `DataJaneHome` content)
  - **Monthly Reports** (Lori workbook view — `DataDefaultHome` content)
- Default to whichever has more recent activity
- When only one source exists, show that view directly (no tabs) — preserving current behavior for single-source orgs

### UI

The tabs sit right below the header, using the existing Radix Tabs component. Clean, minimal — just two text tabs like `Metrics | Monthly Reports`.

### Files to modify
- `src/pages/DataHomeRouter.tsx` — add tab logic, check for both data sources, render tabs when both exist
- Minor: both `DataJaneHome` and `DataDefaultHome` may need their individual headers simplified to avoid duplication with the shared header in the router

