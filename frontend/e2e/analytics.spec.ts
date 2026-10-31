import path from "node:path";
import { expect, test } from "@playwright/test";

const ANALYTICS_URL = process.env.ANALYTICS_URL ?? "http://127.0.0.1:5001";
const FRONTEND_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:4000";
const SAMPLE_CSV = path.resolve(process.cwd(), "../analytics-service/sample_sales.csv");

test.beforeAll(async ({ playwright }) => {
  const http = await playwright.request.newContext();
  try {
    for (const [name, url] of [
      ["frontend", FRONTEND_URL],
      ["backend", `${BACKEND_URL}/health`],
      ["analytics-service", `${ANALYTICS_URL}/health`],
    ]) {
      const response = await http.get(url, { timeout: 5000 });
      if (!response.ok()) {
        throw new Error(`${name} returned HTTP ${response.status()} at ${url}`);
      }
    }
  } catch (error) {
    throw new Error(
      `Analytics E2E prerequisites are not reachable. Start the frontend, backend, and Flask services before running npm run e2e.`,
      { cause: error }
    );
  } finally {
    await http.dispose();
  }
});

test("logs in, uploads the sample CSV, and renders analytics", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@example.com");
  await page.locator('input[type="password"]').fill("Admin@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_CSV);
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page.getByText("Rows analyzed", { exact: true })).toBeVisible();
  await expect(page.getByText("Top salesperson", { exact: true })).toBeVisible();
  await expect(page.getByTestId("revenue-by-region-chart")).toBeVisible();
  await expect(page.getByTestId("top-salespeople-chart")).toBeVisible();
});
