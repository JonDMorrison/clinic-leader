import { test, expect } from "@playwright/test";

/**
 * Appointment scheduling + conflict detection.
 *
 * Conflict detection is the core differentiator — make sure the test asserts
 * a specific user-facing warning, not just absence of a successful save.
 */

test.describe("Scheduling — book + detect conflicts", () => {
  test.skip(true, "TODO: wire selectors against the calendar UI.");

  test("admin can book an appointment for a patient", async ({ page }) => {
    await page.goto("/schedule");
    // TODO: click an empty slot, choose patient + provider, save
    // TODO: assert the appointment renders in the calendar
  });

  test("booking over an existing appointment shows a conflict warning", async ({
    page,
  }) => {
    await page.goto("/schedule");
    // TODO: create an initial appointment at slot X
    // TODO: try to create a second appointment for the same provider at slot X
    // TODO: assert a visible "conflict" / "already booked" warning appears
    // TODO: assert the second appointment did NOT get persisted unless force-confirmed
  });

  test("admin can move an appointment and the original slot becomes free", async ({
    page,
  }) => {
    // TODO: drag-and-drop or open-and-edit an appointment to a new time
    // TODO: assert the new slot shows it and the old slot is empty
  });
});
