import { expect, test, type Page } from "@playwright/test";

const FRONTEND_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:4000";
const LOGIN = { email: "admin@example.com", password: "Admin@123" };

test.beforeAll(async ({ playwright }) => {
  const http = await playwright.request.newContext();
  try {
    for (const [name, url] of [
      ["frontend", FRONTEND_URL],
      ["backend", `${BACKEND_URL}/health`],
    ]) {
      const response = await http.get(url, { timeout: 5000 });
      if (!response.ok()) {
        throw new Error(`${name} returned HTTP ${response.status()} at ${url}`);
      }
    }
  } catch (error) {
    throw new Error(
      `E2E prerequisites are not reachable. Start the frontend and backend dev servers. ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  } finally {
    await http.dispose();
  }
});

test.describe.serial("shipment platform", () => {
  async function login(page: Page) {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(LOGIN.email);
    await page.locator('input[type="password"]').fill(LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  }

  async function openShipmentForm(page: Page) {
    await page.getByRole("button", { name: "New shipment" }).click();
    return page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Create shipment" }) });
  }

  async function fillShipmentForm(
    form: ReturnType<Page["locator"]>,
    trackingNumber: string
  ) {
    await form.getByPlaceholder("TRK-2001").fill(trackingNumber);
    const customer = form.getByRole("combobox");
    await expect(customer.locator("option").nth(1)).toBeAttached();
    await customer.selectOption({ index: 1 });
    await form.locator("input").nth(1).fill("E2E Origin");
    await form.locator("input").nth(2).fill("E2E Destination");
  }

  async function waitForShipmentSocket(page: Page) {
    await page.waitForEvent("websocket", {
      predicate: (socket) => socket.url().includes("/ws?token="),
      timeout: 5000,
    });
  }

  test("logs in and shows dashboard numbers", async ({ page }) => {
    await login(page);

    for (const label of ["Total customers", "Total shipments"]) {
      const card = page.getByText(label, { exact: true }).locator("..");
      await expect(card.locator("p").nth(1)).toHaveText(/\d+/);
    }
  });

  test("adds, edits, and cleans up a customer", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Customers" }).click();
    await expect(page).toHaveURL(/\/customers$/);

    const unique = Date.now();
    const email = `e2e-${unique}@example.com`;
    const name = `E2E Customer ${unique}`;
    const updatedName = `${name} Updated`;

    await page.getByRole("button", { name: "Add customer" }).click();
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save" }) });
    await form.locator("input").nth(0).fill(name);
    await form.locator("input").nth(1).fill(email);
    await form.locator("input").nth(2).fill("E2E Company");
    await form.getByRole("button", { name: "Save" }).click();

    const row = page.getByRole("row").filter({ hasText: email });
    try {
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Edit" }).click();
      const editForm = page
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Save" }) });
      await editForm.locator("input").nth(0).fill(updatedName);
      await editForm.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("row").filter({ hasText: updatedName })).toBeVisible();
    } finally {
      const createdRow = page.getByRole("row").filter({ hasText: email });
      if (await createdRow.count()) {
        page.once("dialog", (dialog) => dialog.accept());
        await createdRow.getByRole("button", { name: "Delete" }).click();
        await expect(createdRow).toHaveCount(0);
      }
    }
  });

  test("opens shipments and lists seeded shipments", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Shipments" }).click();
    await expect(page).toHaveURL(/\/shipments$/);
    await expect(page.getByRole("heading", { name: "Shipments" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "TRK-1001" })).toBeVisible();
  });

  test("shows a visible error for duplicate shipment tracking", async ({ page }) => {
    await login(page);
    await page.goto("/shipments");
    const form = await openShipmentForm(page);
    await fillShipmentForm(form, "TRK-1001");
    await form.getByRole("button", { name: "Create shipment" }).click();
    await expect(page.getByText("Tracking number already exists", { exact: true })).toBeVisible();
  });

  test("broadcasts status changes to a second browser context", async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      const socket1 = waitForShipmentSocket(page1);
      await login(page1);
      await socket1;

      const socket2 = waitForShipmentSocket(page2);
      await login(page2);
      await socket2;

      await Promise.all([page1.goto("/shipments"), page2.goto("/shipments")]);
      const uniqueTracking = `E2E-${Date.now()}`;
      const form = await openShipmentForm(page1);
      await fillShipmentForm(form, uniqueTracking);
      await form.getByRole("button", { name: "Create shipment" }).click();

      const row1 = page1.getByRole("row").filter({ hasText: uniqueTracking });
      await expect(row1).toBeVisible();
      await expect(row1.getByRole("combobox")).toHaveValue("Created");

      await row1.getByRole("combobox").selectOption("InTransit");
      await expect(row1.getByRole("combobox")).toHaveValue("InTransit");
      await expect(page2.getByText(/Shipment .* is now InTransit/)).toBeVisible();

      const row2 = page2.getByRole("row").filter({ hasText: uniqueTracking });
      await expect(row2).toBeVisible();
      await expect(row2.getByRole("combobox")).toHaveValue("InTransit");
    } finally {
      await Promise.all([context1.close(), context2.close()]);
    }
  });

  test("disables status changes for delivered shipments", async ({ page }) => {
    await login(page);
    await page.goto("/shipments");
    const row = page.getByRole("row").filter({ hasText: "TRK-1003" });
    await expect(row).toBeVisible();
    await expect(row.getByRole("combobox")).toHaveValue("Delivered");
    await expect(row.getByRole("combobox")).toBeDisabled();
  });
});
