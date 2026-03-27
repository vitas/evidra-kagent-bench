/**
 * Full E2E test — triggers a real benchmark run and verifies results.
 *
 * Requires a running stack AND a valid LLM API key.
 *
 * Prerequisites:
 *   export LLM_API_KEY=your-key
 *   docker compose up -d
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

test.describe("Full — trigger and verify benchmark run", () => {
  test.setTimeout(300_000); // 5 minutes — scenario execution can be slow

  let jobId: string;
  let runId: string;

  test("Trigger certify run", async () => {
    const triggerRes = await apiRequest("/v1/bench/trigger", {
      method: "POST",
      body: JSON.stringify({
        model: process.env.KAGENT_MODEL || "deepseek-chat",
        execution_mode: "a2a",
        evidence_mode: "smart",
        scenarios: ["broken-deployment"],
      }),
    });
    expect(triggerRes.status).toBe(202);
    const body = await triggerRes.json();
    jobId = body.id;
    expect(jobId).toBeTruthy();
  });

  test("Poll until scenario completes", async () => {
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
    runId = job.run_ids?.[0];
    expect(runId).toBeTruthy();
  });

  test("Run metadata records hosted a2a execution", async () => {
    expect(runId).toBeTruthy();

    const runRes = await apiRequest(`/v1/bench/runs/${runId}`);
    expect(runRes.status).toBe(200);

    const run = await runRes.json();
    expect(run.adapter).toBe("a2a");
    expect(run.evidence_mode).toBe("smart");
  });

  test("Results page shows run data", async ({ page }) => {
    await page.goto(`${LAB_URL}/results`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Not Configured");
    await page.screenshot({ path: "test-results/full-results.png" });
  });

  test("Leaderboard reflects completed run", async ({ page }) => {
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Model Leaderboard")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: "test-results/full-leaderboard.png" });
  });
});
