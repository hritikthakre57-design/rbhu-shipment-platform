// Run from the repository root: npx playwright test -c frontend/playwright.qa.config.ts
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const email = `qa-${Date.now()}@example.com`;
const customerName = `QA UI ${Date.now()}`;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@example.com");
  await page.locator('input[type="password"]').fill("Admin@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

function monitor(page: Page) {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) issues.push(`HTTP ${response.status()} ${response.url()}`);
  });
  return issues;
}

test.beforeAll(async ({ request }) => {
  const checks = [
    ["frontend", `${baseURL}/`],
    ["backend", "http://localhost:4000/health"],
    ["analytics", "http://127.0.0.1:5001/health"],
  ] as const;
  for (const [name, url] of checks) {
    let response;
    try {
      response = await request.get(url);
    } catch (error) {
      throw new Error(`${name} is not reachable at ${url}: ${String(error)}`, { cause: error });
    }
    if (!response.ok()) throw new Error(`${name} is not reachable at ${url}: HTTP ${response.status()}`);
  }
});

test("login, dashboard numbers, protected navigation and logout", async ({ page }) => {
  const issues = monitor(page);
  await login(page);
  await expect(page.getByText("Total customers")).toBeVisible();
  await expect(page.getByText("Total shipments")).toBeVisible();
  await page.getByRole("link", { name: "Customers" }).click();
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(issues).toEqual([]);
});

test("create, edit and clean up a customer through the UI", async ({ page }) => {
  const issues = monitor(page);
  await login(page);
  await page.getByRole("link", { name: "Customers" }).click();
  await page.getByRole("button", { name: "Add customer" }).click();

  const modal = page.locator("div.fixed");
  const form = modal.locator("form");
  const inputs = form.locator("input");
  await inputs.nth(0).fill(customerName);
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill("QA UI Company");
  await form.getByRole("button", { name: "Save" }).click();
  const row = page.locator("tbody tr").filter({ hasText: email });
  await expect(row).toContainText(customerName);

  await row.getByRole("button", { name: "Edit" }).click();
  const editModal = page.locator("div.fixed");
  await editModal.locator("input").nth(0).fill(`${customerName} Edited`);
  await editModal.getByRole("button", { name: "Save" }).click();
  const editedRow = page.locator("tbody tr").filter({ hasText: email });
  await expect(editedRow).toContainText(`${customerName} Edited`);

  page.once("dialog", (dialog) => dialog.accept());
  await editedRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("tbody tr").filter({ hasText: email })).toHaveCount(0);
  expect(issues).toEqual([]);
});

test("assistant keeps a conversation after refresh", async ({ page }) => {
  const issues = monitor(page);
  await login(page);
  await page.getByRole("link", { name: "Assistant" }).click();
  const composer = page.getByPlaceholder("Ask about shipments...");
  await composer.fill("What is the status of TRK-1001?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("chat-message-user")).toContainText("TRK-1001");
  await expect(page.getByTestId("chat-message-assistant")).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByTestId("chat-message-user")).toContainText("TRK-1001");
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByText("Start a conversation about your logistics platform.")).toBeVisible();
  expect(issues).toEqual([]);
});

test("analytics shows results and a server error is visible", async ({ page }) => {
  const issues = monitor(page);
  await login(page);
  await page.getByRole("link", { name: "Analytics" }).click();
  const sample = path.resolve(process.cwd(), "..", "analytics-service", "sample_sales.csv");
  await page.locator('input[type="file"]').setInputFiles(sample);
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("Rows analyzed")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("revenue-by-region-chart")).toBeVisible();
  await expect(page.getByTestId("top-salespeople-chart")).toBeVisible();

  await page.route("**/api/analytics/analyze", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Synthetic QA failure" } }) })
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "qa.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("salesperson,revenue,region\nQA,1,East\n"),
  });
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("Synthetic QA failure")).toBeVisible();
  expect(issues.filter((issue) => !issue.includes("500"))).toEqual([]);
});

test("common pages have no horizontal overflow at target viewports", async ({ page }) => {
  const issues = monitor(page);
  await login(page);
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/customers", "/shipments", "/assistant"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} overflows at ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  }
  expect(issues).toEqual([]);
});
