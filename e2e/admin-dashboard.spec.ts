import { test, expect, type Page } from "@playwright/test";

// Helper to login as admin and wait for dashboard
async function loginAsAdmin(page: Page) {
  await page.goto("/admin/");
  // Clear any stored state first
  await page.evaluate(() => localStorage.clear());
  await page.waitForTimeout(500);

  // Fill credentials and submit
  await page.fill('input[placeholder="Enter username"]', "admin");
  await page.fill('input[placeholder="Enter password"]', "admin");
  await page.click('button:has-text("Sign In")');

  // Wait for navigation to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await expect(page.locator("h1:has-text('WhatsApp Sessions')")).toBeVisible({ timeout: 15000 });
  // Wait for async data to load
  await page.waitForTimeout(2000);
}

// Helper to add a session via UI
async function addSession(page: Page, name: string, phone: string, sessionId: string) {
  await page.click('button:has-text("Add Session")');
  await expect(page.locator("h2:has-text('Add New Session')")).toBeVisible();
  await page.fill('input[placeholder="e.g. John Doe"]', name);
  await page.fill('input[placeholder="e.g. +1234567890"]', phone);
  await page.fill('input[placeholder="e.g. session-abc123"]', sessionId);
  await page.click('button[type="submit"]:has-text("Add Session")');
  // Wait for form to close and session to appear
  await page.waitForTimeout(2000);
}

test.describe("Admin Dashboard", () => {
  test("login page loads with correct elements", async ({ page }) => {
    await page.goto("/admin/");
    await expect(page.locator("h1")).toContainText("Admin Dashboard");
    await expect(page.locator("text=Sign in to manage WhatsApp sessions")).toBeVisible();
    await expect(page.locator('input[placeholder="Enter username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/admin/");
    await page.fill('input[placeholder="Enter username"]', "wrong");
    await page.fill('input[placeholder="Enter password"]', "wrong");
    await page.click('button:has-text("Sign In")');
    await expect(page.locator(".error-message")).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("dashboard shows stats after successful login", async ({ page }) => {
    await loginAsAdmin(page);
    // Dashboard should be visible with stats
    await expect(page.locator("h1:has-text('WhatsApp Sessions')")).toBeVisible();
    await expect(page.locator("text=Total Sessions")).toBeVisible();
  });

  test("logout returns to login page", async ({ page }) => {
    await loginAsAdmin(page);

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page.locator("h1:has-text('Admin Dashboard')")).toBeVisible({ timeout: 5000 });
  });

  test("unauthenticated user sees login page", async ({ page }) => {
    await page.goto("/admin/");
    // Should see login page
    await expect(page.locator("h1:has-text('Admin Dashboard')")).toBeVisible();
    await expect(page.locator('input[placeholder="Enter username"]')).toBeVisible();
  });
});

test.describe("Admin Dashboard - Add Session Button", () => {
  test("clicking Add Session shows the form", async ({ page }) => {
    await loginAsAdmin(page);

    // Click Add Session button
    await page.click('button:has-text("Add Session")');

// Form should appear with all fields
    await expect(page.locator("h2:has-text('Add New Session')")).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. John Doe"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. +1234567890"]')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. session-abc123"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Add Session")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test("cancelling Add Session form hides it", async ({ page }) => {
    await loginAsAdmin(page);

    // Open form
    await page.click('button:has-text("Add Session")');
    await expect(page.locator("h2:has-text('Add New Session')")).toBeVisible();

    // Cancel
    await page.click('button:has-text("Cancel")');
    await expect(page.locator("h2:has-text('Add New Session')")).toBeHidden();
  });

  test("Add Session form validates required fields", async ({ page }) => {
    await loginAsAdmin(page);

    // Open form
    await page.click('button:has-text("Add Session")');

    // All fields should have required attribute
    await expect(page.locator('input[placeholder="e.g. John Doe"]')).toHaveAttribute("required", "");
    await expect(page.locator('input[placeholder="e.g. +1234567890"]')).toHaveAttribute("required", "");
    await expect(page.locator('input[placeholder="e.g. session-abc123"]')).toHaveAttribute("required", "");
  });

  test("adding a new session shows it in the list", async ({ page }) => {
    await loginAsAdmin(page);

    const testName = `Test User ${Date.now()}`;
    const testPhone = `+1555${Date.now().toString().slice(-7)}`;
    const testSessionId = `session-${Date.now()}`;

    await addSession(page, testName, testPhone, testSessionId);

    // New session should appear in list
    await expect(page.locator(`td:has-text("${testName}")`)).toBeVisible();
    await expect(page.locator(`td:has-text("${testPhone}")`)).toBeVisible();
  });

  test("adding session with duplicate session ID shows error", async ({ page }) => {
    await loginAsAdmin(page);

    const testName = `Dup User ${Date.now()}`;
    const testPhone = `+1555${Date.now().toString().slice(-7)}`;
    const testSessionId = `session-dup-${Date.now()}`;

    // Add first
    await addSession(page, testName, testPhone, testSessionId);

    // Try to add second with same session ID - should get error
    const testName2 = `Dup User 2 ${Date.now()}`;
    const testPhone2 = `+1555${(Date.now() + 1).toString().slice(-7)}`;
    await addSession(page, testName2, testPhone2, testSessionId);

    // Should show error message since backend rejects duplicates
    await expect(page.locator(".error-message")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Admin Dashboard - Refresh Button", () => {
  test("refresh button reloads data", async ({ page }) => {
    await loginAsAdmin(page);

    // Get initial contact count
    const initialRows = await page.locator("tbody tr").count();

    // Add a session
    await addSession(page, `Refresh Test ${Date.now()}`, `+1555${Date.now().toString().slice(-7)}`, `refresh-${Date.now()}`);

    // Should have one more row
    await expect(page.locator("tbody tr")).toHaveCount(initialRows + 1, { timeout: 5000 });

    // Click refresh
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(1000);

    // Data should still be there
    await expect(page.locator("tbody tr")).toHaveCount(initialRows + 1, { timeout: 5000 });
  });
});

test.describe("Admin Dashboard - Remove Button", () => {
  test("remove button deletes session after confirmation", async ({ page }) => {
    await loginAsAdmin(page);

    const testName = `Remove Test ${Date.now()}`;
    const testPhone = `+1555${Date.now().toString().slice(-7)}`;
    const testSessionId = `remove-${Date.now()}`;

    // Add a session to remove
    await addSession(page, testName, testPhone, testSessionId);

    // Verify it's there
    await expect(page.locator(`td:has-text("${testName}")`)).toBeVisible({ timeout: 5000 });

    // Auto-accept all native dialogs (window.confirm) via evaluate
    await page.evaluate(() => {
      const originalConfirm = window.confirm.bind(window);
      (window as any).confirm = () => true;
    });

    // Set up dialog handler as backup
    page.on("dialog", dialog => dialog.accept());

    // Find the specific row and click its Remove button
    const row = page.locator(`tr:has(td:has-text("${testName}"))`);
    await row.locator('button:has-text("Remove")').click();

    // Wait for the API call and UI update
    await page.waitForTimeout(3000);

    // Should be gone
    await expect(page.locator(`td:has-text("${testName}")`)).toBeHidden({ timeout: 10000 });
  });

  test("remove button cancels if user dismisses dialog", async ({ page }) => {
    await loginAsAdmin(page);

    const testName = `Cancel Remove ${Date.now()}`;
    const testPhone = `+1555${Date.now().toString().slice(-7)}`;
    const testSessionId = `cancel-remove-${Date.now()}`;

    // Add a session to try to remove
    await addSession(page, testName, testPhone, testSessionId);

    // Verify it's there
    await expect(page.locator(`td:has-text("${testName}")`)).toBeVisible();

    // Set up dialog handler to cancel
    page.on("dialog", dialog => dialog.dismiss());

    // Click remove
    await page.click(`button:has-text("Remove")`);

    // Wait a bit
    await page.waitForTimeout(500);

    // Should still be there
    await expect(page.locator(`td:has-text("${testName}")`)).toBeVisible();
  });
});

test.describe("Admin Dashboard - Empty State", () => {
  test("empty state shows Add First Session button", async ({ page }) => {
    await loginAsAdmin(page);

    // If there are no sessions, should see empty state
    const emptyState = page.locator(".empty-state");
    const addFirstBtn = page.locator('button:has-text("Add First Session")');

    // Check if empty state exists (only shows when no contacts)
    const isEmpty = await emptyState.isVisible().catch(() => false);
    if (isEmpty) {
      await expect(addFirstBtn).toBeVisible();
      await addFirstBtn.click();
      await expect(page.locator("h2:has-text('Add New Session')")).toBeVisible();
    }
  });
});

test.describe("Admin Dashboard - Search", () => {
  test("search filters contacts list", async ({ page }) => {
    await loginAsAdmin(page);

    // Add a searchable session
    const uniqueName = `SearchTest ${Date.now()}`;
    await addSession(page, uniqueName, `+1555${Date.now().toString().slice(-7)}`, `search-${Date.now()}`);

    // Type in search box
    await page.fill('input[placeholder="Search contacts..."]', uniqueName);

    // Should filter to show only matching row
    await expect(page.locator("tbody tr")).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator(`td:has-text("${uniqueName}")`)).toBeVisible();
  });

  test("search by phone number works", async ({ page }) => {
    await loginAsAdmin(page);

    const uniquePhone = `+1555${Date.now().toString().slice(-7)}`;
    await addSession(page, `PhoneTest ${Date.now()}`, uniquePhone, `phone-search-${Date.now()}`);

    await page.fill('input[placeholder="Search contacts..."]', uniquePhone);

    await expect(page.locator(`td:has-text("${uniquePhone}")`)).toBeVisible();
  });

  test("search by session ID works", async ({ page }) => {
    await loginAsAdmin(page);

    const uniqueSessionId = `sid-${Date.now()}`;
    await addSession(page, `SidTest ${Date.now()}`, `+1555${Date.now().toString().slice(-7)}`, uniqueSessionId);

    await page.fill('input[placeholder="Search contacts..."]', uniqueSessionId);

    await expect(page.locator(`code:has-text("${uniqueSessionId}")`)).toBeVisible();
  });
});