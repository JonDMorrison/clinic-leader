import { test, expect } from "@playwright/test";

/**
 * Role-based UI gating.
 *
 * Roles to cover (confirm against the actual schema before enabling):
 *  - clinic_admin — full access
 *  - clinician — patient + scheduling, no billing or staff management
 *  - reception — scheduling + check-in, no clinical notes
 *
 * Three storage states needed under tests/e2e/.auth/.
 */

test.describe("Role-based access control — UI gates", () => {
  test.skip(true, "TODO: seed role-specific users + storage states.");

  test.describe("clinician role", () => {
    test.use({ storageState: "tests/e2e/.auth/clinician.json" });

    test("does not see Staff management nav", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("link", { name: /staff/i })).toHaveCount(0);
    });

    test("direct visit to /admin/staff is denied", async ({ page }) => {
      const res = await page.goto("/admin/staff");
      expect(res?.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("reception role", () => {
    test.use({ storageState: "tests/e2e/.auth/reception.json" });

    test("can open scheduling but clinical notes editor is hidden", async ({
      page,
    }) => {
      await page.goto("/schedule");
      // TODO: open a patient appointment, assert "Clinical notes" tab is absent
    });
  });
});
