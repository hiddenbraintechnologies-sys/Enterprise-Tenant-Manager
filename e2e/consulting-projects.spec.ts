import { test, expect } from "@playwright/test";

test.describe("Consulting Engagements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/consulting/projects");
  });

  test("should render the engagements page with correct title", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toContainText("Client Engagements");
  });

  test("should show 'New Engagement' button", async ({ page }) => {
    await expect(page.getByTestId("button-new-engagement")).toBeVisible();
  });

  test("should open create engagement dialog when clicking button", async ({ page }) => {
    await page.getByTestId("button-new-engagement").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Create New Engagement")).toBeVisible();
  });

  test("should have status filter dropdown", async ({ page }) => {
    await expect(page.getByTestId("select-status-filter")).toBeVisible();
  });

  test("should display engagements table or empty state", async ({ page }) => {
    const table = page.locator("table");
    const emptyState = page.getByText("No engagements yet");
    
    await expect(table.or(emptyState)).toBeVisible();
  });

  test("API requests should target /api/hr/projects endpoints", async ({ page }) => {
    const requests: string[] = [];
    
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        requests.push(request.url());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    const projectRequests = requests.filter((url) => url.includes("projects"));
    expect(projectRequests.length).toBeGreaterThan(0);
    
    for (const url of projectRequests) {
      expect(url).toContain("/api/hr/projects");
    }
  });
});
