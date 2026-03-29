/**
 * Final demo video — slides + demo walkthrough + closing slides.
 * All in one recording with smooth transitions.
 *
 * Run:
 *   cd tests/e2e && npx playwright test demo-final.spec.ts
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

// ── Slide overlay system ──

async function initSlideOverlay(page: Page) {
  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.id = "slide-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "999999",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 80px",
      background: "#08080D",
      opacity: "0",
      transition: "opacity 0.8s ease",
      pointerEvents: "none",
      fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
      textAlign: "center",
    });

    // Grid background
    overlay.style.backgroundImage =
      "linear-gradient(rgba(255,0,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,128,0.03) 1px, transparent 1px)";
    overlay.style.backgroundSize = "60px 60px";

    document.body.appendChild(overlay);
  });
}

async function showSlide(page: Page, html: string, duration: number) {
  await page.evaluate((h) => {
    const overlay = document.getElementById("slide-overlay")!;
    overlay.innerHTML = h;
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
  }, html);
  await wait(duration);
}

async function hideSlide(page: Page) {
  await page.evaluate(() => {
    const overlay = document.getElementById("slide-overlay")!;
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
  });
  await wait(900);
}

async function showSubtitle(page: Page, text: string, duration = 3000) {
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
        zIndex: "99998",
        background: "linear-gradient(180deg, transparent 0%, rgba(8,8,13,0.95) 30%)",
        padding: "24px 40px 20px",
        fontFamily: "'Helvetica Neue', sans-serif",
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

async function hideSubtitle(page: Page) {
  await page.evaluate(() => {
    const bar = document.getElementById("demo-subtitle");
    if (bar) bar.style.opacity = "0";
  });
  await wait(400);
}

// ── Slide HTML templates ──

const SLIDE_BANNER = `
  <div style="font-size:clamp(36px,6vw,64px);font-weight:900;line-height:1.1;background:linear-gradient(135deg,#FF0080 0%,#D946EF 50%,#A855F7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 40px rgba(255,0,128,0.2))">
    kAgent got CKA/CKS Certified
  </div>
  <div style="margin-top:24px;font-size:17px;color:#7A7890;font-family:monospace;letter-spacing:0.05em">
    behind AgentGateway, powered by Evidra MCP
  </div>
  <div style="margin-top:40px;display:flex;gap:30px;font-family:monospace;font-size:13px;color:#FF0080">
    <span>evidra</span><span>·</span><span>agentgateway</span><span>·</span><span>kagent</span><span>·</span><span>MCP</span>
  </div>
`;

const SLIDE_PROBLEM1 = `
  <div style="border:1px solid rgba(255,0,128,0.2);border-radius:16px;padding:50px 60px;background:rgba(255,0,128,0.03);max-width:800px">
    <div style="font-family:monospace;font-size:13px;color:#FF0080;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:20px">The Problem</div>
    <div style="font-size:clamp(28px,4vw,48px);font-weight:900;line-height:1.1;color:#E8E6F0">
      AgentGateway routes MCP traffic.<br>
      <span style="background:linear-gradient(135deg,#FF0080,#D946EF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">But it can't see what the agent is doing.</span>
    </div>
  </div>
`;

const SLIDE_PROBLEM2 = `
  <div style="border:1px solid rgba(255,0,128,0.2);border-radius:16px;padding:50px 60px;background:rgba(255,0,128,0.03);max-width:800px">
    <div style="font-family:monospace;font-size:13px;color:#FF0080;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:20px">The Problem</div>
    <div style="font-size:clamp(28px,4vw,48px);font-weight:900;line-height:1.1;color:#E8E6F0">
      kagent fixes K8s problems.<br>
      <span style="background:linear-gradient(135deg,#FF0080,#D946EF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">But nobody measures if it's reliable.</span>
    </div>
  </div>
`;

const SLIDE_FIXED = `
  <div style="font-size:clamp(48px,8vw,96px);font-weight:900;background:linear-gradient(135deg,#FF0080,#00E5FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 30px rgba(255,0,128,0.3))">
    We fixed both.
  </div>
`;

const SLIDE_CLOSING1 = `
  <div style="font-size:clamp(28px,4vw,48px);font-weight:900;line-height:1.1;color:#E8E6F0;max-width:800px">
    <span style="background:linear-gradient(135deg,#FF0080,#D946EF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">AgentGateway</span> gets intelligence.<br>
    <span style="background:linear-gradient(135deg,#FF0080,#D946EF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">kagent</span> gets certified.
  </div>
`;

const SLIDE_TAGLINE = `
  <div style="max-width:800px">
    <div style="font-size:clamp(24px,3.5vw,42px);font-weight:600;line-height:1.4;color:#7A7890">
      Run it once to test.
    </div>
    <div style="font-size:clamp(24px,3.5vw,42px);font-weight:600;line-height:1.4;color:#E8E6F0">
      Run it many times to measure <span style="background:linear-gradient(135deg,#FF0080,#D946EF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">reliability</span>.
    </div>
  </div>
`;

const SLIDE_REPO = `
  <div style="font-size:clamp(24px,3vw,36px);font-weight:900;color:#E8E6F0;margin-bottom:30px">
    <span style="background:linear-gradient(135deg,#FF0080,#D946EF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Open Source</span> — Apache 2.0
  </div>
  <div style="font-family:monospace;font-size:clamp(14px,2vw,20px);color:#FF0080;border:1px solid rgba(255,0,128,0.3);border-radius:8px;padding:15px 30px;background:rgba(255,0,128,0.05)">
    github.com/vitas/evidra-kagent-bench
  </div>
  <div style="margin-top:20px;font-family:monospace;font-size:13px;color:#7A7890">
    75 scenarios · 3 models · 996 runs · A2A + MCP
  </div>
  <div style="margin-top:30px;font-size:15px;color:#7A7890;font-style:italic">
    All prize money will be reinvested in agent benchmarks and testing.
  </div>
`;

test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 80 },
});

test.describe("Final Demo", () => {
  test.setTimeout(300_000);

  test("Full video — slides + demo + closing", async ({ page }) => {

    // Start with styled dark page for slides
    await page.setContent(`
      <html><body style="margin:0;background:#08080D;
        background-image:linear-gradient(rgba(255,0,128,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,128,0.03) 1px,transparent 1px);
        background-size:60px 60px;width:100vw;height:100vh;overflow:hidden">
      </body></html>
    `);
    await initSlideOverlay(page);

    // ═══════════════════════════════
    // OPENING SLIDES
    // ═══════════════════════════════

    await showSlide(page, SLIDE_BANNER, 6000);
    await showSlide(page, SLIDE_PROBLEM1, 6000);
    await showSlide(page, SLIDE_PROBLEM2, 6000);
    await showSlide(page, SLIDE_FIXED, 4000);

    // Load Evidra landing behind the overlay, then fade out
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await initSlideOverlay(page);
    await showSlide(page, SLIDE_FIXED, 1); // keep overlay visible during load
    await hideSlide(page); // smooth fade to reveal landing page

    // ═══════════════════════════════
    // LIVE DEMO
    // ═══════════════════════════════

    // 1. Evidra landing
    await showSubtitle(page, "Evidra gives AgentGateway an evidence and intelligence layer", 4000);
    await hideSubtitle(page);

    // 2. Scroll to signals → MCP setup
    await page.locator("text=Patterns That Fire").scrollIntoViewIfNeeded();
    await showSubtitle(page, "8 behavioral detectors fire on every tool call through AgentGateway", 3000);
    await hideSubtitle(page);

    await page.locator("text=Give Your Agent the Protocol").scrollIntoViewIfNeeded();
    await showSubtitle(page, "kagent connects via MCP — zero agent code changes", 4000);
    await hideSubtitle(page);

    // 3. Dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");
    await setApiKey(page);
    await showSubtitle(page, "kagent's reliability dashboard — signals, actors, risk breakdown", 5000);
    await hideSubtitle(page);

    // 4. Evidence chain
    const evidenceLink = page.locator('a[href="/evidence"]').first();
    if (await evidenceLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await evidenceLink.click();
    } else {
      await page.goto(`${BASE_URL}/evidence`);
    }
    await page.waitForLoadState("networkidle");
    await setApiKey(page);
    await showSubtitle(page, "Every kagent mutation through AgentGateway — recorded, signed, risk-assessed", 5000);
    await hideSubtitle(page);

    // 5. Bench landing
    await page.goto(LAB_URL);
    await page.waitForLoadState("networkidle");
    await showSubtitle(page, "75 CKA/CKS + Terraform scenarios — certification exams for kagent", 5000);
    await hideSubtitle(page);

    // 6. Scenarios
    await page.goto(`${LAB_URL}/scenarios`);
    await page.waitForLoadState("networkidle");
    await showSubtitle(page, "Real K8s failures — kagent must diagnose, fix, and verify each one");
    await slowScroll(page, 4, 1300);
    await hideSubtitle(page);

    // 7. Leaderboard
    await page.goto(`${LAB_URL}/bench`);
    await page.waitForLoadState("networkidle");
    await showSubtitle(page, "kagent leaderboard — 3 models, 996 runs, pass^k reliability scoring", 7000);
    await hideSubtitle(page);

    // 8. Runs
    await page.goto(`${LAB_URL}/bench/runs`);
    await page.waitForLoadState("networkidle");
    await showSubtitle(page, "Every kagent run — scenario, model, duration, turns, checks", 5000);
    await hideSubtitle(page);

    // 9. Insights
    await page.goto(`${LAB_URL}/bench/insights`);
    await page.waitForLoadState("networkidle");
    await showSubtitle(page, "Which scenarios break kagent? Failure patterns across models", 4000);
    await hideSubtitle(page);

    // 10. Compare
    await page.goto(`${LAB_URL}/bench/compare`);
    await page.waitForLoadState("networkidle");
    await showSubtitle(page, "Side-by-side — which model makes kagent most reliable?", 5000);
    await hideSubtitle(page);

    // ═══════════════════════════════
    // CLOSING SLIDES
    // ═══════════════════════════════

    await initSlideOverlay(page);
    await showSlide(page, SLIDE_CLOSING1, 5000);
    await showSlide(page, SLIDE_TAGLINE, 5000);
    await showSlide(page, SLIDE_REPO, 6000);
  });
});
