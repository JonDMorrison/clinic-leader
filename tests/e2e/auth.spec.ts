import { test, expect } from "@playwright/test";

/**
 * Multi-clinic signup + login + logout.
 *
 * Skeleton — selectors are TODO. ClinicLeader is multi-tenant; the signup
 * flow must produce both an org and an admin user, and the login flow must
 * land the user inside their clinic's scoped dashboard.
 */

test.describe("Auth — signup, login, logout", () => {
  test.skip(true, "TODO: wire selectors against the live signup form.");

  test("a new clinic admin can sign up and reach an empty dashboard", async ({
    page,
  }) => {
    await page.goto("/signup");
    // TODO: fill clinic name, admin email, password
    // TODO: submit and expect a redirect to /dashboard or onboarding
    await expect(page).toHaveURL(/dashboard|onboarding/);
  });

  test("an existing user can log in and reach their dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    // TODO: fill email + password from .env.test
    // TODO: assert post-login redirect lands inside the user's clinic scope
    await expect(page).toHaveURL(/dashboard/);
  });

  test("logout clears session and routes back to login", async ({ page }) => {
    // TODO: pre-authenticated context (storage state) or full login first
    // TODO: open user menu, click Sign Out
    // TODO: assert /login and that revisiting /dashboard redirects to /login
  });
});
