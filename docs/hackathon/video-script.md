# Demo Video Script

Target length: 2-3 minutes. Two parts matching hackathon categories.

## Recording Setup

- Screen recorder: OBS, QuickTime, or Loom
- Browser full-screen, zoom 125%
- Stack running with pre-seeded data (`docker compose up -d`)
- Voiceover narration (record separately or live)

## Script

### 0:00-0:17 — Auto-advancing slides (no voiceover, music optional)

**Slide 1** (3s) — Banner image (`docs/hackathon/banner.svg`)

**Slide 2** (5s) — "AgentGateway routes MCP traffic. But it can't see what the agent is doing."

**Slide 3** (5s) — "kagent fixes K8s problems. But nobody measures if it's reliable."

**Slide 4** (4s) — "We fixed both." → fade to live demo

---

### Part 1: Secure & Govern MCP (0:17-1:10)

*Guided scroll through [localhost:28080](http://localhost:28080)*

**0:17-0:25 — Hero section**

> "Evidra — know what your agent intended, know what actually happened."

**0:25-0:35 — Why evidra-mcp section**

> "Smart output — 60x fewer tokens than raw kubectl JSON. Auto-evidence — every mutation recorded with zero agent code changes."

**0:35-0:45 — Protocol section**

> "Prescribe before. Report after. Every mutation flowing through AgentGateway gets recorded, signed, and assessed for risk."

**0:45-0:55 — Signals section**

> "Eight behavioral detectors fire on day one. Retry loops, blast radius, risk escalation — patterns that are invisible without evidence."

**0:55-1:05 — Benchmark table**

> "Sonnet discovers the protocol without any skill prompt — it self-corrects. The skill removes the exploration overhead: correct behavior on first attempt."

**1:05-1:10 — Click "Open Bench →"**

> "Now let's see what this means for kagent."

---

### Part 2: Building Cool Agents (1:10-2:40)

**1:10-1:20 — Bench landing** ([/lab](http://localhost:28080/lab))

> "75 scenarios across CKA/CKS and Terraform. Real failures injected into real clusters."

**1:20-1:30 — Scenario catalog** ([/lab/scenarios](http://localhost:28080/lab/scenarios))

> "Browse by track and level. Workloads, pod security, networking, troubleshooting — mapped to certification domains."

**1:30-1:45 — Trigger a run** ([/lab/run](http://localhost:28080/lab/run))

Select `broken-deployment`, trigger it.

> "kagent receives the task through A2A. It calls tools via AgentGateway, Evidra records everything."

**1:45-2:00 — Watch progress** ([/bench](http://localhost:28080/bench))

> "Real-time — pending, running, passed. kagent is diagnosing the broken deployment right now."

**2:00-2:15 — Leaderboard** ([/lab/bench](http://localhost:28080/lab/bench))

> "The leaderboard ranks models by pass rate, cost, and speed. This is how you compare agents."

**2:15-2:25 — Run detail** ([/lab/bench/runs](http://localhost:28080/lab/bench/runs))

Click into a run.

> "Full timeline — what the agent diagnosed, decided, and executed. Every tool call visible."

**2:25-2:35 — Quick tour: insights, compare**

> "Insights show failure patterns. Compare puts models side by side. The data to improve kagent."

---

### 2:35-2:50 — Close (auto-advancing slides)

**Slide 5** (4s) — "AgentGateway gets an intelligence layer. kagent gets certified."

**Slide 6** (4s) — "Run it once to test. Run it many times to measure reliability."

**Slide 7** (hold) — `github.com/vitas/evidra-kagent-bench` + banner image

---

## Checklist Before Recording

- [ ] Stack running: `docker compose ps` shows all services healthy
- [ ] Demo data visible: leaderboard at `/lab/bench` shows runs
- [ ] Scenario catalog loaded: `/lab/scenarios` shows scenarios
- [ ] kagent healthy: `docker compose ps kagent` shows healthy
- [ ] Browser zoom 125%, dark theme if available
- [ ] Terminal font large enough to read on recording
