import { test, expect } from "@playwright/test";

/**
 * Cross-tenant isolation — the most important security test for ClinicLeader.
 *
 * Setup (TODO before enabling):
 *  - Two seeded clinics (Clinic A, Clinic B) with at least one patient each.
 *  - Two seeded admin users, one per clinic.
 *  - Storage states stored at tests/e2e/.auth/clinic-a.json and /clinic-b.json.
 *
 * Spec covers:
 *  - Logged-in admin A cannot see Clinic B patients in any list view.
 *  - Direct navigation to /patients/<B-patient-id> returns 403/404 (not 200).
 *  - Supabase RLS rejects cross-tenant queries from Admin A's session.
 */

test.describe("Tenant isolation — clinic A cannot see clinic B data", () => {
  test.skip(true, "TODO: seed two clinics + capture storage states first.");

  test.use({ storageState: "tests/e2e/.auth/clinic-a.json" });

  test("patient list shows only clinic A patients", async ({ page }) => {
    await page.goto("/patients");
    // TODO: assert clinic A's known patient is visible
    // TODO: assert clinic B's known patient is NOT visible
  });

  test("direct URL to clinic B patient is denied", async ({ page }) => {
    const response = await page.goto("/patients/CLINIC_B_PATIENT_ID");
    // TODO: assert 403 or 404 status, or in-app "not found" UI
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test("Supabase REST query from clinic A session returns no clinic B rows", async ({
    page,
    request,
  }) => {
    // TODO: extract supabase access token from storage state
    // TODO: hit /rest/v1/patients?clinic_id=eq.<B>
    // TODO: assert empty array (RLS filter applied)
  });
});
