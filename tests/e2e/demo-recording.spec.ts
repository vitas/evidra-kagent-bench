/**
 * Demo recording — with subtitle overlays (target ~1:30).
 * Outputs video to test-results/.
 *
 * Run:
 *   cd tests/e2e && npx playwright test demo-recording.spec.ts
 */

import { test, type Page } from "@playwright/test";

const BASE_URL = process.env.EVIDRA_URL || "http://localhost:28080";
const API_KEY = process.env.EVIDRA_API_KEY || "dev-api-key";
const LAB_URL = `${BASE_URL}/lab`;

async function wait(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function slowScroll(page: Page, steps: number, pause = 1200) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 280);
    await wait(pause);
  }
}

async function setApiKey(page: Page) {
  const keyInput = page.locator(
    'input[type="password"], input[placeholder*="API"], input[placeholder*="api"]'
  );
  if (await keyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await wait(500);
    await keyInput.fill(API_KEY);
    await wait(400);
    await page.keyboard.press("Enter");
    await wait(1500);
  }
}

async function showTitle(page: Page, text: string, duration = 3000) {
  await page.evaluate((t) => {
    let bar = document.getElementById("demo-subtitle");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "demo-subtitle";
      Object.assign(bar.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        right: "0",
        zIndex: "99999",
        background: "linear-gradient(180deg, transparent 0%, rgba(8,8,13,0.95) 30%)",
        padding: "24px 40px 20px",
        fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
        fontSize: "18px",
        fontWeight: "500",
        color: "#E8E6F0",
        letterSpacing: "0.01em",
        textAlign: "center",
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
      });
      document.body.appendChild(bar);
    }
    bar.textContent = t;
    bar.style.opacity = "1";
  }, text);
  await wait(duration);
}

async function hideTitle(page: Page) {
  await page.evaluate(() => {
    const bar = document.getElementById("demo-subtitle");
    if (bar) bar.style.opacity = "0";
  });
  await wait(400);
}

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
});

test.describe("Demo Recording", () => {
  test.setTimeout(300_000);

  test("Part 1 — AgentGateway + Evidra", async ({ page }) => {

    // 1. Evidra landing
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "Evidra gives AgentGateway an evidence and intelligence layer", 4000);
    await hideTitle(page);

    // 2. Scroll to signals, pause at MCP setup
    await page.locator("text=Patterns That Fire").scrollIntoViewIfNeeded();
    await showTitle(page, "8 behavioral detectors fire on every tool call flowing through AgentGateway", 3000);
    await hideTitle(page);

    await page.locator("text=Give Your Agent the Protocol").scrollIntoViewIfNeeded();
    await showTitle(page, "kagent connects via MCP — one command, zero agent code changes", 4000);
    await hideTitle(page);

    // 3. Dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");
    await setApiKey(page);
    await showTitle(page, "kagent's reliability dashboard — signals, actors, risk breakdown", 5000);
    await hideTitle(page);

    // 4. Evidence chain
    const evidenceLink = page.locator('a[href="/evidence"]').first();
    if (await evidenceLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await evidenceLink.click();
    } else {
      await page.goto(`${BASE_URL}/evidence`);
    }
    await page.waitForLoadState("networkidle");
    await setApiKey(page);
    await showTitle(page, "Every kagent mutation through AgentGateway — recorded, signed, risk-assessed", 5000);
    await hideTitle(page);

    // 5. Bench landing
    await page.goto(LAB_URL);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "75 CKA/CKS + Terraform scenarios — certification exams for kagent", 5000);
    await hideTitle(page);

    // 6. Scenarios — slow scroll
    await page.goto(`${LAB_URL}/scenarios`);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "Real K8s failures — kagent must diagnose, fix, and verify each one");
    await slowScroll(page, 4, 1300);
    await hideTitle(page);

    // 7. Leaderboard
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "kagent leaderboard — 3 models, 996 runs, pass^k reliability scoring", 7000);
    await hideTitle(page);

    // 8. Runs — skip run detail (empty timeline issue), go straight to list
    await page.goto(`${LAB_URL}/bench/runs`);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "Every kagent run — scenario, model, duration, turns, checks", 5000);
    await hideTitle(page);

    // 9. Insights
    await page.goto(`${LAB_URL}/bench/insights`);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "Which scenarios break kagent? Failure patterns across models", 4000);
    await hideTitle(page);

    // 10. Compare
    await page.goto(`${LAB_URL}/bench/compare`);
    await page.waitForLoadState("networkidle");
    await showTitle(page, "Side-by-side — which model makes kagent most reliable?", 5000);
    await hideTitle(page);

    // Closing title
    await showTitle(page, "Run it once to test. Run it many times to measure reliability.", 3000);
    await hideTitle(page);
  });
});
