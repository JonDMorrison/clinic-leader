
# Data-First Flow: Restructuring the Scorecard Journey

**STATUS: IMPLEMENTED**

## Changes Completed

### Phase 6 (Data-First Onboarding) — ✅ Done
- Scorecard empty state redirects to `/data` with "See Your Data" CTA
- Dashboard CTA updated from "Set Up Scorecard" → "Connect Your Data" pointing to `/data`
- ConnectDataCard messaging updated: "Your Scorecard Starts Here"
- DataMetricsTable: guidance banner + prominent "Track This" buttons on untracked rows

### Reliability & Regression Prevention — ✅ Done

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Versioned localStorage + cache reset | ✅ `src/lib/storage/versionedStorage.ts` + all 8 files migrated |
| 2 | Edge function health check | ✅ `useFunctionHealth` hook + `FunctionHealthBanner` in layout |
| 3 | Dashboard slot system | ⏭️ Skipped (current fallbacks sufficient) |
| 4 | Metric rendering semantic rules | ✅ `src/lib/metrics/metricVisibility.ts` |
| 5 | AI response contract enforcement | ✅ `src/lib/ai/responseSchema.ts` (Zod schema + sanitizer) |
| 6 | Data-first onboarding | ✅ Already implemented |
| 7 | Design token ESLint enforcement | ✅ `eslint.config.js` `no-restricted-syntax` rule |
| 8 | Observability regression table | ✅ `system_regression_events` table + `regressionLogger.ts` |

## Files Created
- `src/lib/storage/versionedStorage.ts` — Versioned localStorage wrapper
- `src/lib/metrics/metricVisibility.ts` — Null/zero/undefined rendering rules
- `src/lib/ai/responseSchema.ts` — AI response Zod validation + sanitization
- `src/lib/observability/regressionLogger.ts` — Regression event logging utility
- `src/hooks/useFunctionHealth.ts` — Edge function health monitoring hook
- `src/components/layout/FunctionHealthBanner.tsx` — Admin health alert banner
- `src/components/settings/ResetCacheButton.tsx` — User cache reset UI

## Files Modified
- 8 files migrated from raw `localStorage` to versioned storage
- `src/App.tsx` — Legacy storage clear on boot + health banner in layout
- `src/pages/Settings.tsx` — Added Advanced section with cache reset
- `eslint.config.js` — Added design token enforcement rule
