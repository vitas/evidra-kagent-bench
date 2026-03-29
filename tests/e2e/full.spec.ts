/**
 * Full E2E test — exercises the demo flow: none vs proxy A2A runs.
 *
 * Matches DEMO_STEPS.md Part 1 (none vs proxy comparison) and Part 2 (leaderboard).
 *
 * Prerequisites:
 *   docker compose up -d   (with LLM API key configured)
 *
 * Run:
 *   cd tests/e2e && npx playwright test full.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.EVIDRA_URL || "http://localhost:28080";
const API_KEY = process.env.EVIDRA_API_KEY || "dev-api-key";
const LAB_URL = `${BASE_URL}/lab`;

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

async function triggerAndWait(body: object): Promise<{ jobId: string; runId: string; status: string }> {
  const triggerRes = await apiRequest("/v1/bench/trigger", {
    method: "POST",
    body: JSON.stringify(body),
  });
  expect(triggerRes.status).toBe(202);
  const { id: jobId } = await triggerRes.json();
  expect(jobId).toBeTruthy();

  let status = "pending";
  let job: any;
  for (let i = 0; i < 55 && status !== "completed" && status !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const res = await apiRequest(`/v1/bench/trigger/${jobId}`);
    job = await res.json();
    status = job.status;
  }
  expect(["completed", "failed"]).toContain(status);
  expect(job.completed).toBe(1);
  const runId = job.run_ids?.[0] ?? "";
  return { jobId, runId, status };
}

test.describe("Full — demo flow: none vs proxy A2A comparison", () => {
  test.setTimeout(600_000); // 10 minutes — two sequential runs

  let noneRunId: string;
  let proxyRunId: string;

  // Part 1, Step 6: Baseline run (no evidence)
  test("1. Trigger A2A baseline run (evidence_mode: none)", async () => {
    const result = await triggerAndWait({
      model: process.env.KAGENT_MODEL || "gemini-2.5-flash",
      execution_mode: "a2a",
      evidence_mode: "none",
      scenarios: ["broken-deployment"],
    });
    noneRunId = result.runId;
    expect(noneRunId).toBeTruthy();
  });

  // Part 1, Step 7: Smart run (auto-evidence via evidra-mcp)
  test("2. Trigger A2A smart run (evidence_mode: smart)", async () => {
    const result = await triggerAndWait({
      model: process.env.KAGENT_MODEL || "gemini-2.5-flash",
      execution_mode: "a2a",
      evidence_mode: "smart",
      scenarios: ["broken-deployment"],
    });
    proxyRunId = result.runId;
    expect(proxyRunId).toBeTruthy();
  });

  // Verify run metadata distinguishes the two modes
  test("3. Baseline run has evidence_mode=none", async () => {
    expect(noneRunId).toBeTruthy();
    const res = await apiRequest(`/v1/bench/runs/${encodeURIComponent(noneRunId)}`);
    expect(res.status).toBe(200);
    const run = await res.json();
    expect(run.adapter).toBe("a2a");
    expect(run.evidence_mode).toBe("none");
  });

  test("4. Smart run has evidence_mode=smart", async () => {
    expect(proxyRunId).toBeTruthy();
    const res = await apiRequest(`/v1/bench/runs/${encodeURIComponent(proxyRunId)}`);
    expect(res.status).toBe(200);
    const run = await res.json();
    expect(run.adapter).toBe("a2a");
    expect(run.evidence_mode).toBe("smart");
  });

  // Part 1, Step 8: Evidence page shows entries from proxy run
  test("5. Evidence page has entries after proxy run", async ({ page }) => {
    await page.goto(`${BASE_URL}/evidence`);

    // Enter API key if prompted
    const keyInput = page.locator(
      'input[type="password"], input[placeholder*="API"], input[placeholder*="api"]'
    );
    if (await keyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await keyInput.fill(API_KEY);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2_000);
    }

    // Should see evidence entries (prescribe/report from proxy mode)
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "test-results/full-evidence.png" });
  });

  // Part 2: Leaderboard shows pre-seeded data + new runs
  test("6. Leaderboard shows model results", async ({ page }) => {
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Model Leaderboard")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/full-leaderboard.png" });
  });
});
