import { test, expect } from "@playwright/test";

test.describe("Software Services Timesheets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/software-services/timesheets");
  });

  test("should render the timesheets page with correct title", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toContainText("Timesheets");
  });

  test("should show 'Log Time' button", async ({ page }) => {
    await expect(page.getByTestId("button-log-time")).toBeVisible();
  });

  test("should open log time dialog when clicking button", async ({ page }) => {
    await page.getByTestId("button-log-time").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Log Time Entry")).toBeVisible();
  });

  test("should have status filter dropdown", async ({ page }) => {
    await expect(page.getByTestId("select-status-filter")).toBeVisible();
  });

  test("should show summary cards for hours", async ({ page }) => {
    await expect(page.getByText("Total Hours")).toBeVisible();
    await expect(page.getByText("Billable Hours")).toBeVisible();
    await expect(page.getByText("Non-Billable Hours")).toBeVisible();
  });

  test("should display time entries table or empty state", async ({ page }) => {
    const table = page.locator("table");
    const emptyState = page.getByText("No time entries yet");
    
    await expect(table.or(emptyState)).toBeVisible();
  });

  test("API requests should target /api/hr/timesheets endpoints", async ({ page }) => {
    const requests: string[] = [];
    
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        requests.push(request.url());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    const timesheetRequests = requests.filter((url) => url.includes("timesheets"));
    expect(timesheetRequests.length).toBeGreaterThan(0);
    
    for (const url of timesheetRequests) {
      expect(url).toContain("/api/hr/timesheets");
    }
  });
});
