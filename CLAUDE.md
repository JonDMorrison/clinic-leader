# ClinicLeader (clinic-leader)

## Deploy
- Vercel auto-deploys on push to main
- Supabase project: ihxnwavuxqwqeheqsynd

## Critical Rules
- Read only first, report findings, confirm with Jon, then make changes
- Do not restructure live systems without fully understanding the flow first
- Strong positioning product — blocked by distribution, not engineering
- Do not add features without confirming they serve the core clinic operations use case

## Stack
- Lovable + Supabase + Vercel

## Testing

End-to-end tests live in `tests/e2e/` and run with Playwright (chromium-only). Config is `playwright.config.ts`; baseURL honors `TEST_BASE_URL` (default `http://localhost:8080`). The webServer block auto-starts `npm run dev` if nothing is on 8080.

Scripts:
- `npm run test:e2e` — full suite
- `npm run test:e2e:ui` — interactive Playwright UI
- `npm run test:e2e:headed` — visible browser

Skeleton specs (selectors are TODO until wired against seeded clinics):
- `auth.spec.ts` — clinic-admin signup, login, logout
- `tenant-isolation.spec.ts` — clinic A cannot see clinic B data (RLS + UI)
- `patients.spec.ts` — create, search, edit
- `scheduling.spec.ts` — book + conflict detection
- `permissions.spec.ts` — role-based UI gating (clinician, reception)

Before enabling these:
1. Seed two test clinics in the Supabase project's test branch.
2. Capture storage states under `tests/e2e/.auth/` (gitignored).
3. Replace TODO selectors with stable `data-testid` attributes — do not rely on visible text alone for clinical safety tests.

Tenant isolation is the highest-value test in this repo. If only one test runs in CI, run that one.

The Expect MCP (AI-driven exploratory browser testing) is registered globally in Claude Code; invoke `/expect` for ad-hoc test runs on top of the persistent suite.
