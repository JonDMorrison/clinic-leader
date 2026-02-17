# 🚀 Enterprise Release Checklist

This checklist must be completed for every production release to ensure the stability and security of the ClinicLeader platform.

## 1. 🛡️ Security & Privacy
- [ ] No `console.log` statements containing sensitive data (check `/src/pages/Imports.tsx`, `/src/hooks/`).
- [ ] RLS policies verified for multi-tenancy (no cross-org data leaks).
- [ ] Environment variables (Supabase Keys) are restricted and not exposed in public repositories.
- [ ] Audit logs are functional for data-modifying actions.

## 2. ⚡ Performance (Target: 90+ Lighthouse Score)
- [ ] Bundle splitting: Check that new heavy routes/components are using `React.lazy`.
- [ ] Query limits: Ensure large list queries (Scorecard, Issues) have pagination or limits (default: 100).
- [ ] Image optimization: All visual assets in `/public` are compressed.

## 3. 🧪 Quality Assurance
- [ ] Critical User Journeys (CUJ) pass local Vitest suite: `npm test`.
- [ ] TypeScript build passes without `any` regressions: `npm run build` (check for lint errors).
- [ ] Jane Integration: Verify Jane API connector health status.

## 4. 🔄 Reliability & Rollback
- [ ] Database migrations: Verify that SQL scripts are idempotently applied to the production instance.
- [ ] Rollback plan: Documented procedure for reversing a failed migration.
- [ ] Version tracking: `useFunctionHealth` reports the correct deployment version.

---
**Lead Engineer Signature:** ____________________
**Date:** ____________________
