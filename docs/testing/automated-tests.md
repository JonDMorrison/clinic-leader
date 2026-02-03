# Automated Test Suite

## Overview

This project includes automated tests for security, suppression logic, and recommendation engine determinism.

## Test Categories

### 1. Frontend Unit Tests (Vitest)

Located in `src/test/`:

| File | Coverage |
|------|----------|
| `recommendationEligibility.test.ts` | Deviation calculation, eligibility thresholds, cooldown rules, determinism |
| `dataQualityGating.test.ts` | Completeness/latency/consistency scoring, overall quality calculation |
| `confidenceLabels.test.ts` | Trend stability classification, CV calculations |

**Run locally:**
```bash
npm run test
# or
bunx vitest run
```

### 2. Edge Function Security Tests (Deno)

Located in `supabase/functions/benchmark-security-tests/`:

| Test | Asserts |
|------|---------|
| Anonymous cannot call `bench_compute_snapshot` | RPC blocked |
| Anonymous cannot call `bench_get_audit_log` | RPC returns empty |
| Anonymous cannot read `benchmark_cohorts` | RLS blocks |
| Anonymous cannot read `benchmark_snapshots` | RLS blocks |
| Anonymous cannot read `benchmark_audit_log` | RLS blocks |
| Anonymous cannot read `recommendation_runs` | RLS blocks |
| Anonymous cannot insert into `benchmark_cohorts` | RLS blocks |
| Anonymous cannot update `teams.benchmark_opt_in` | RLS blocks |
| Suppression returns false for unknown org | Default opt-in = false |
| Eligibility requires target | No target = ineligible |

**Run locally:**
```bash
bunx supabase functions test benchmark-security-tests
```

## Test Guarantees

### Security
- Non-master admin users cannot access bench_* RPCs
- RLS prevents unauthorized access to all benchmark tables
- Opt-in changes require org admin role

### Suppression
- Groups with < 5 orgs return nulls/suppressed
- Non-opted-in orgs never contribute to aggregates

### Determinism
- Same inputs always produce identical outputs
- No random elements in eligibility or scoring calculations
- Cooldown logic is time-deterministic

## CI Integration

Tests should run in CI pipeline on every PR. Configure your CI to:

```yaml
# Example GitHub Actions
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Run frontend tests
        run: bun run vitest run
        
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Run edge function tests
        run: supabase functions test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Adding New Tests

### Frontend Tests
1. Create `*.test.ts` file in `src/test/` or alongside component
2. Import from `vitest`: `describe`, `it`, `expect`
3. Run with `bunx vitest run`

### Edge Function Tests
1. Create `*.test.ts` file in `supabase/functions/<name>/`
2. Use Deno test framework
3. Import dotenv for credentials
4. Run with `bunx supabase functions test <name>`

## Test-Driven Security

All security-critical changes should:
1. Have corresponding test(s) that fail before the fix
2. Pass after the fix
3. Be documented in this file

Security cannot regress silently - CI will catch it.
