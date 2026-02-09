

## Remove Header Button, Make Line Item Clickable

Move the scorecard review action from the section header down to the individual agenda line item, so clicking "Scorecard -- Review the numbers (2026-02)" opens the scorecard modal directly.

### Changes

**1. `src/pages/MeetingDetail.tsx`**
- Remove `scorecard` from the list of sections that get the clickable header treatment (the `ExternalLink` icon and click handler on the section title).
- Pass a new `onOpenScorecardModal` callback prop to `AgendaItemRow` for scorecard section items. This callback will call `setShowScorecardModal(true)`.

**2. `src/components/meetings/AgendaItemRow.tsx`**
- Accept an optional `onOpenScorecardModal` callback prop.
- When this prop is provided and the meeting is in live or preview mode, make the line item title clickable (with a visual cue like a subtle link style or small icon) to trigger the modal instead of entering edit mode.

### Result
- The "Scorecard Review" section header will look like a normal header (no external link icon).
- The actual line item "Scorecard -- Review the numbers (2026-02)" will be the clickable entry point to review and navigate historical numbers.

