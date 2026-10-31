// Run from the repository root: npx playwright test -c frontend/playwright.qa.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/qa",
  testMatch: "*.qa.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: "list",
  outputDir: "./qa-artifacts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
});
