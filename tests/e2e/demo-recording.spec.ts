/**
 * Demo recording — walks through DEMO_STEPS.md with human-like pauses.
 * Outputs a video to test-results/demo-recording/.
 *
 * Run:
 *   cd tests/e2e && npx playwright test demo-recording.spec.ts --headed
 *
 * The video is saved automatically. For higher quality:
 *   - Use --headed to see it live
 *   - Browser viewport is set to 1280x720 (720p)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.EVIDRA_URL || "http://localhost:28080";
const API_KEY = process.env.EVIDRA_API_KEY || "dev-api-key";
const LAB_URL = `${BASE_URL}/lab`;

// Human-like delays
const PAUSE = 2_000;       // between actions
const READ = 4_000;        // time to "read" a page
const LONG_READ = 6_000;   // time to absorb complex content
const SCROLL_PAUSE = 1_500; // between scroll steps

async function humanPause(ms = PAUSE) {
  await new Promise((r) => setTimeout(r, ms));
}

async function slowScroll(page: Page, steps = 3) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 300);
    await humanPause(SCROLL_PAUSE);
  }
}

async function setApiKey(page: Page) {
  const keyInput = page.locator(
    'input[type="password"], input[placeholder*="API"], input[placeholder*="api"]'
  );
  if (await keyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await humanPause(1000);
    await keyInput.fill(API_KEY);
    await humanPause(500);
    await page.keyboard.press("Enter");
    await humanPause(PAUSE);
  }
}

// Configure video recording
test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 100 },
});

test.describe("Demo Recording", () => {
  test.setTimeout(600_000); // 10 minutes

  test("Full demo walkthrough", async ({ page }) => {

    // ═══════════════════════════════════════════════════
    // PART 1: Secure & Govern MCP (AgentGateway + Evidra)
    // ═══════════════════════════════════════════════════

    // Step 1: Evidra landing — hero
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await humanPause(PAUSE);

    // Step 2: Quick scroll to Signals section (skip protocol + architecture)
    await page.locator("text=Patterns That Fire").scrollIntoViewIfNeeded();
    await humanPause(READ);

    // Step 3: Dashboard
    await page.goto(`${BASE_URL}/bench`);
    await page.waitForLoadState("networkidle");
    await setApiKey(page);
    await humanPause(READ);

    // Step 4: Click Evidence link from dashboard
    const evidenceLink = page.locator('a[href="/evidence"]').first();
    if (await evidenceLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await evidenceLink.click();
    } else {
      await page.goto(`${BASE_URL}/evidence`);
    }
    await page.waitForLoadState("networkidle");
    await setApiKey(page);
    await humanPause(READ);

    // Trigger baseline run (none)
    const triggerBtn = page.locator("text=Run Benchmark").first();
    if (await triggerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await triggerBtn.click();
      await humanPause(PAUSE);

      // Fill model
      const modelInput = page.locator('input[placeholder*="model"], input[placeholder*="Model"]').first();
      if (await modelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modelInput.fill("gemini-2.5-flash");
        await humanPause(1000);
      }

      // Select scenario
      const scenario = page.locator("text=broken-deployment").first();
      if (await scenario.isVisible({ timeout: 2000 }).catch(() => false)) {
        await scenario.click();
        await humanPause(1000);
      }

      // Select evidence mode if visible
      const baselineBtn = page.locator("text=Baseline").first();
      if (await baselineBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await baselineBtn.click();
        await humanPause(1000);
      }

      // Start
      const startBtn = page.locator('button:has-text("Start"), button:has-text("Run")').last();
      if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await startBtn.click();
      }
    }

    // Watch progress overlay
    await humanPause(READ);

    // Wait for run to complete (poll visually)
    for (let i = 0; i < 30; i++) {
      await humanPause(3000);
      const body = await page.textContent("body");
      if (body?.includes("completed") || body?.includes("passed") || body?.includes("failed")) {
        break;
      }
    }
    await humanPause(READ);

    // ═══════════════════════════════════════════════════
    // PART 2: Building Cool Agents (kagent Certification)
    // ═══════════════════════════════════════════════════

    // Step 9: Bench UI landing
    await page.goto(LAB_URL);
    await page.waitForLoadState("networkidle");
    await humanPause(LONG_READ);

    // Scroll through landing
    await slowScroll(page, 3);
    await humanPause(READ);

    // Step 10: Scenario catalog
    await page.goto(`${LAB_URL}/scenarios`);
    await page.waitForLoadState("networkidle");
    await humanPause(LONG_READ);

    // Scroll scenarios
    await slowScroll(page, 2);
    await humanPause(READ);

    // Step 12: Leaderboard
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");
    await humanPause(LONG_READ);

    // Scroll leaderboard
    await slowScroll(page, 2);
    await humanPause(READ);

    // Step 13: Click into a run
    await page.goto(`${LAB_URL}/bench/runs`);
    await page.waitForLoadState("networkidle");
    await humanPause(READ);

    // Click first run
    const firstRun = page.locator("table tbody tr a, table tbody tr").first();
    if (await firstRun.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRun.click();
      await page.waitForLoadState("networkidle");
      await humanPause(LONG_READ);
      await slowScroll(page, 3);
      await humanPause(READ);
    }

    // Step 14: Insights
    await page.goto(`${LAB_URL}/bench/insights`);
    await page.waitForLoadState("networkidle");
    await humanPause(READ);

    // Compare
    await page.goto(`${LAB_URL}/bench/compare`);
    await page.waitForLoadState("networkidle");
    await humanPause(READ);

    // Final pause
    await humanPause(LONG_READ);
  });
});
