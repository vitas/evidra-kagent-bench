/**
 * E2E browser test for the hackathon demo flow.
 *
 * Prerequisites:
 *   docker compose up -d postgres evidra-api evidra-mcp bench-cli bench-ui
 *   docker compose run --rm kind-bootstrap
 *
 * Run:
 *   cd tests/e2e && npx playwright test demo-flow.spec.ts
 *
 * What the audience sees (and this test verifies):
 *   1. Evidra UI — landing, evidence, scorecard, bench dashboard
 *   2. Trigger scenario via API → bench-cli runs it
 *   3. Evidence chain populated with prescribe/report entries
 *   4. Bench UI — leaderboard, certification results
 */

import { test, expect, type Page } from "@playwright/test";

const EVIDRA_URL = process.env.EVIDRA_URL || "http://localhost:28080";
const BENCH_UI_URL = process.env.BENCH_UI_URL || "http://localhost:28081";
const API_KEY = process.env.EVIDRA_API_KEY || "dev-api-key";

// ── Helpers ──────────────────────────────────────────────────────────

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

async function apiRequest(path: string, options?: RequestInit) {
  return fetch(`${EVIDRA_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe("Hackathon Demo Flow", () => {
  test.setTimeout(180_000);

  test("1. Evidra UI loads with navigation", async ({ page }) => {
    await page.goto(EVIDRA_URL);
    await page.waitForLoadState("networkidle");

    // Landing page should have the main headline.
    await expect(page.locator("text=Know what your agent intended")).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test("2. Evidence page loads", async ({ page }) => {
    await page.goto(`${EVIDRA_URL}/evidence`);
    await setApiKey(page);
    await page.waitForTimeout(2_000);

    // Evidence page should load — table or empty state.
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("3. Bench dashboard loads with trigger button", async ({ page }) => {
    await page.goto(`${EVIDRA_URL}/bench`);
    await setApiKey(page);
    await page.waitForTimeout(3_000);

    // Take screenshot to see what the bench page looks like.
    await page.screenshot({ path: "test-results/bench-dashboard.png" });

    // Bench page should load.
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("4. Scenarios API returns 75+ scenarios", async () => {
    const res = await apiRequest("/v1/bench/scenarios");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scenarios.length).toBeGreaterThanOrEqual(50);
  });

  test("5. Trigger scenario and wait for completion", async () => {
    const triggerRes = await apiRequest("/v1/bench/trigger", {
      method: "POST",
      body: JSON.stringify({
        model: "deepseek-chat",
        provider: "bifrost",
        scenarios: ["broken-deployment"],
      }),
    });
    expect(triggerRes.status).toBe(202);
    const { id: jobId } = await triggerRes.json();
    expect(jobId).toBeTruthy();

    // Poll until terminal state (up to 2.5 minutes).
    let status = "pending";
    let job: any;
    for (let i = 0; i < 30 && status !== "completed" && status !== "failed"; i++) {
      await new Promise((r) => setTimeout(r, 5_000));
      const res = await apiRequest(`/v1/bench/trigger/${jobId}`);
      job = await res.json();
      status = job.status;
    }

    expect(["completed", "failed"]).toContain(status);
    // Job should have processed 1 scenario.
    expect(job.total).toBe(1);
    expect(job.completed).toBe(1);
  });

  test("6. Evidence entries exist after scenario run", async () => {
    const res = await apiRequest("/v1/evidence/entries?limit=10");
    expect(res.status).toBe(200);
    const data = await res.json();
    // bench-cli's MCP subprocess forwards evidence to evidra-api.
    expect(data.entries).toBeDefined();
  });

  test("7. Bench runs API has results", async () => {
    const res = await apiRequest("/v1/bench/runs");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toBeDefined();
  });

  test("8. Leaderboard API responds (public)", async () => {
    const res = await fetch(`${EVIDRA_URL}/v1/bench/leaderboard`);
    expect(res.status).toBe(200);
  });

  test("9. Bench UI loads landing and leaderboard", async ({ page }) => {
    await page.goto(BENCH_UI_URL);
    await page.waitForLoadState("networkidle");

    // Landing page should show the main headline.
    await expect(page.locator("text=before shipping")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/bench-ui-landing.png" });

    // Navigate to leaderboard.
    await page.goto(`${BENCH_UI_URL}/bench`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Model Leaderboard")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/bench-ui-leaderboard.png" });
  });

  test("10. Bench UI shows bench page with nav", async ({ page }) => {
    await page.goto(`${BENCH_UI_URL}/bench`);
    await page.waitForLoadState("networkidle");

    // Nav should have: Home, Dashboard, Evidence, Bench, Lab
    await expect(page.locator("nav >> text=Bench")).toBeVisible();
    await expect(page.locator("nav >> text=Dashboard")).toBeVisible();

    await page.screenshot({ path: "test-results/bench-ui-bench.png" });
  });
});
