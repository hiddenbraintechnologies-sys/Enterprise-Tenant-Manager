import { test, expect } from "@playwright/test";

test.describe("Software Services Projects", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/software-services/projects");
  });

  test("should render the projects page with correct title", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toContainText("Projects");
  });

  test("should show 'New Project' button", async ({ page }) => {
    await expect(page.getByTestId("button-new-project")).toBeVisible();
  });

  test("should open create project dialog when clicking button", async ({ page }) => {
    await page.getByTestId("button-new-project").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Create New Project")).toBeVisible();
  });

  test("should have status filter dropdown", async ({ page }) => {
    await expect(page.getByTestId("select-status-filter")).toBeVisible();
  });

  test("should display projects table or empty state", async ({ page }) => {
    const table = page.locator("table");
    const emptyState = page.getByText("No projects yet");
    
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
