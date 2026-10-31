import { expect, test } from "@playwright/test";

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:4000";
const ANALYTICS_URL = process.env.ANALYTICS_URL ?? "http://127.0.0.1:5001";

test.beforeAll(async ({ playwright }) => {
  const http = await playwright.request.newContext();
  try {
    for (const [name, url] of [
      ["backend", `${BACKEND_URL}/health`],
      ["analytics-service", `${ANALYTICS_URL}/health`],
    ]) {
      const response = await http.get(url, { timeout: 5000 });
      if (!response.ok()) throw new Error(`${name} returned HTTP ${response.status()}`);
    }
  } catch (error) {
    throw new Error(
      "Assistant E2E prerequisites are not reachable. Start the backend and Flask services before running npm run e2e.",
      { cause: error }
    );
  } finally {
    await http.dispose();
  }
});

test("sends two assistant messages", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@example.com");
  await page.locator('input[type="password"]').fill("Admin@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "Assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);

  const input = page.locator("textarea");
  await input.fill("How many shipments do I have?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("chat-message-assistant")).toHaveCount(1);
  await expect(page.getByTestId("chat-message-assistant").first()).not.toHaveText("");

  await input.fill("What can I ask about?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("chat-message-user")).toHaveCount(2);
  await expect(page.getByTestId("chat-message-assistant")).toHaveCount(2);
});
