

## Remove Redundant Instructional Line Items from Agenda

Currently, each meeting section generates two types of items:
1. An instructional/coaching item (e.g., "Scorecard -- Review the numbers")
2. Data items OR an empty-state fallback (e.g., "No off-track metrics detected")

This creates clutter. The coaching text already exists in the section header descriptions and help hints. The plan is to remove the standalone instructional items and keep only the data-driven or empty-state items, with cleaner titles.

### Changes

**`src/lib/meetings/agendaGenerator.ts`**

Remove the instructional text items that precede each section's data:

- **Scorecard** (lines 76-86): Remove the "Scorecard -- Review the numbers" text item. Keep the off-track metric items or the "No off-track metrics" fallback. Simplify the fallback title to just "No off-track metrics detected" (no "Scorecard --" prefix).

- **Rocks** (lines 151-161): Remove the "Rocks -- Review quarterly priorities" text item. Keep the individual rock items or the empty-state fallback.

- **Issues** (lines 254-264): Remove the "IDS -- Solve the most important issues" text item. Keep the individual issue items or the empty-state fallback.

- **Interventions** (lines 328-338): Remove the "Intervention Check-in" text item. Keep the individual intervention items or the empty-state fallback.

- **To-Do** (lines 385-395): Remove the "To-Dos -- Capture action items" text item. The To-Do section relies on its modal, so no items needed here unless data is fetched.

- **Segue** (lines 398-408): Remove the "Segue" text item entirely -- this section is verbal-only per the earlier change.

- **Conclusion** (lines 410-421): Keep this one as-is since it serves as a checklist for wrapping up.

### Result
Each section will show only its relevant data items (off-track metrics, rocks, issues, interventions) or a single clean empty-state message -- no duplicate instructional lines.

### Technical Details
- Only `src/lib/meetings/agendaGenerator.ts` needs editing
- Existing meetings won't be affected (agenda is generated once per meeting)
- New meetings will get the cleaner agenda
- Section headers and help hints already provide the coaching context that was in the removed items

