/**
 * Smoke tests — verify all UI pages load without requiring an LLM key.
 *
 * Prerequisites:
 *   docker compose up -d
 *
 * Run:
 *   cd tests/e2e && npx playwright test smoke.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.EVIDRA_URL || "http://localhost:28080";
const API_KEY = process.env.EVIDRA_API_KEY || "dev-api-key";
const LAB_URL = `${BASE_URL}/lab`;

async function setApiKey(page: Page) {
  const keyInput = page.locator(
    'input[type="password"], input[placeholder*="API"], input[placeholder*="api"]'
  );
  if (await keyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await keyInput.fill(API_KEY);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
  }
}

test.describe("Smoke — UI pages load", () => {
  test("Bench UI landing page", async ({ page }) => {
    await page.goto(LAB_URL);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=before shipping")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/smoke-bench-landing.png" });
  });

  test("Run page — scenarios and model selector", async ({ page }) => {
    await page.goto(`${LAB_URL}/run`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Run Benchmark")).toBeVisible({
      timeout: 10_000,
    });

    const firstScenario = page.locator('input[type="checkbox"]').first();
    await firstScenario.check();

    await expect(page.getByText("CLI command", { exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/smoke-run-page.png" });
  });

  test("Leaderboard page", async ({ page }) => {
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Model Leaderboard")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/smoke-leaderboard.png" });
  });

  test("Evidra UI landing page", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("text=Know what your agent intended")
    ).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "test-results/smoke-evidra-landing.png" });
  });

  test("Evidence page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/evidence`);
    await setApiKey(page);
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await page.screenshot({ path: "test-results/smoke-evidence.png" });
  });

  test("Dashboard loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/bench`);
    await setApiKey(page);
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await page.screenshot({ path: "test-results/smoke-dashboard.png" });
  });

  test("Leaderboard API responds (public, no auth)", async () => {
    const res = await fetch(`${BASE_URL}/v1/bench/leaderboard`);
    expect(res.status).toBe(200);
  });
});
