import { test, expect } from "@playwright/test";

/**
 * Patient record CRUD + search.
 *
 * Skeleton only. Run inside an authenticated clinic-admin session via storage
 * state once that's set up.
 */

test.describe("Patients — create, search, edit", () => {
  test.skip(true, "TODO: wire selectors and storage state.");

  test("admin can create a patient and see it in the list", async ({
    page,
  }) => {
    await page.goto("/patients");
    // TODO: click "New patient"
    // TODO: fill name, dob, contact info
    // TODO: save, assert the new patient appears in the list
  });

  test("search filters the patient list by name", async ({ page }) => {
    await page.goto("/patients");
    // TODO: type a known patient's surname in the search box
    // TODO: assert only matching rows render
  });

  test("admin can edit a patient and the change persists on reload", async ({
    page,
  }) => {
    await page.goto("/patients");
    // TODO: open a known patient
    // TODO: change a field, save, reload, assert change persisted
  });
});
