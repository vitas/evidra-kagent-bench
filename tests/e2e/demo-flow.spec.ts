/**
 * E2E browser test — simulates a human demo flow through bench-ui and evidra-ui.
 *
 * Prerequisites:
 *   docker compose up -d
 *
 * Run:
 *   cd tests/e2e && npx playwright test demo-flow.spec.ts
 *
 * Flow:
 *   1. Open bench UI landing page
 *   2. Browse scenarios
 *   3. Start certify run (TODO: UI button not yet implemented, uses API)
 *   4. Check exam results page
 *   5. Check bench leaderboard
 *   6. Switch to evidra UI — evidence and dashboard
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.EVIDRA_URL || "http://localhost:28080";
const API_KEY = process.env.EVIDRA_API_KEY || "dev-api-key";

// Bench UI is served under /lab/ via Traefik.
const LAB_URL = `${BASE_URL}/lab`;

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
  return fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe("Demo Flow", () => {
  test.setTimeout(180_000);

  // Step 1: Open bench UI landing page
  test("1. Bench UI landing page loads", async ({ page }) => {
    await page.goto(LAB_URL);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=before shipping")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/01-bench-landing.png" });
  });

  // Step 2: Select scenarios and model on the Run page
  test("2. Run page — select scenarios and model", async ({ page }) => {
    await page.goto(`${LAB_URL}/run`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Run Benchmark")).toBeVisible({
      timeout: 10_000,
    });

    // Select a scenario.
    const firstScenario = page.locator('input[type="checkbox"]').first();
    await firstScenario.check();

    // Generated command should appear.
    await expect(page.locator("text=Generated Command")).toBeVisible();
    await page.screenshot({ path: "test-results/02-run-page.png" });
  });

  // Step 3: Start certify run
  // TODO: Implement "Run" button in bench-ui. For now, trigger via API.
  test("3. Trigger certify run via API", async () => {
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
    expect(job.total).toBe(1);
    expect(job.completed).toBe(1);
  });

  // Step 4: Check exam results page
  test("4. Exam results page shows data", async ({ page }) => {
    await page.goto(`${LAB_URL}/results`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    // Results page should not show "Not Configured" error.
    const body = await page.textContent("body");
    expect(body).not.toContain("Not Configured");
    await page.screenshot({ path: "test-results/04-exam-results.png" });
  });

  // Step 5: Check bench leaderboard
  test("5. Leaderboard shows model results", async ({ page }) => {
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Model Leaderboard")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/05-leaderboard.png" });
  });

  // Step 6: Switch to evidra UI — evidence and dashboard
  test("6a. Evidra UI landing page", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Know what your agent intended")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/06a-evidra-landing.png" });
  });

  test("6b. Evidence page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/evidence`);
    await setApiKey(page);
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await page.screenshot({ path: "test-results/06b-evidence.png" });
  });

  test("6c. Dashboard loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/bench`);
    await setApiKey(page);
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await page.screenshot({ path: "test-results/06c-dashboard.png" });
  });

  // API verification — leaderboard is public, no auth needed.
  test("7. Leaderboard API responds (public)", async () => {
    const res = await fetch(`${BASE_URL}/v1/bench/leaderboard`);
    expect(res.status).toBe(200);
  });
});
