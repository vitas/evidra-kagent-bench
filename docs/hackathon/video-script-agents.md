# Demo Video Script — Building Cool Agents

Target length: ~1:45. Focused on kagent as an AI agent, AgentGateway as routing, Evidra as observability.

## Recording Setup

- Screen recorder: OBS, QuickTime, or Loom
- Browser full-screen, zoom 125%
- Stack running with pre-seeded data (`docker compose up -d`)
- Voiceover narration (record separately or live)
- Use `slides-agents.html` for intro/outro slides

---

## Script

### 0:00-0:20 — Auto-advancing slides (no voiceover, music optional)

**Slide 1** (3s) — Banner

**Slide 2** (5s) — "Kubernetes fails in production. Your team scrambles. Every. Time."

**Slide 3** (5s) — "AI agents can fix it. But can you trust them in production?"

**Slide 4** (4s) — "We made it certifiable." → fade to live demo

---

### 0:20-1:30 — Live Demo

*Guided scroll through [localhost:28080/lab](http://localhost:28080/lab)*

**0:20-0:30 — Bench landing** ([/lab](http://localhost:28080/lab))

> "This is kagent-bench — 75 real Kubernetes failure scenarios. Real failures, injected into a real cluster, fixed by a real AI agent."

**0:30-0:42 — Scenario catalog** ([/lab/scenarios](http://localhost:28080/lab/scenarios))

> "CKA and CKS domains — broken deployments, pod security, networking, ArgoCD, Terraform. Each scenario is a certification-grade challenge."

**0:42-0:57 — Trigger a run** ([/lab/run](http://localhost:28080/lab/run))

Select `broken-deployment`, trigger it.

> "kagent receives the task over A2A. It calls tools through AgentGateway — Evidra records every mutation, assesses risk, builds an evidence chain. Zero code changes to kagent."

**0:57-1:10 — Watch progress** ([/bench](http://localhost:28080/bench))

> "Real-time: pending → running → passed. kagent is diagnosing the broken deployment right now. Watch the tool calls flow in."

**1:10-1:20 — Leaderboard** ([/lab/bench](http://localhost:28080/lab/bench))

> "The leaderboard ranks models by pass rate, cost, and latency. DeepSeek, GPT-4o, Claude — apples-to-apples comparison on identical scenarios."

**1:20-1:30 — Run detail** ([/lab/bench/runs](http://localhost:28080/lab/bench/runs))

Click into a completed run.

> "Full audit trail — what the agent diagnosed, decided, executed. Every tool call visible. This is how you certify an AI agent."

---

### 1:30-1:50 — Close (auto-advancing slides)

Switch back to `slides-agents.html`, advance to Slide 5.

**Slide 5** (5s) — Architecture: kagent → AgentGateway → Evidra MCP → kubectl

> "kagent through AgentGateway through Evidra — intelligence layer added with zero agent code changes."

**Slide 6** (hold) — Tagline + repo URL

> "Run it once to test. Run it many times to measure reliability. github.com/vitas/evidra-kagent-bench — open source, 75 scenarios, go try it."

---

## Checklist Before Recording

- [ ] Stack running: `docker compose ps` shows all services healthy
- [ ] Demo data visible: leaderboard at `/lab/bench` shows runs
- [ ] Scenario catalog loaded: `/lab/scenarios` shows scenarios
- [ ] kagent healthy: `docker compose ps kagent` shows healthy
- [ ] Browser zoom 125%, dark theme if available
- [ ] `slides-agents.html` open in a separate browser tab, ready at Slide 1
