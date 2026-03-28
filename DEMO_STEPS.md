# Demo Steps

## Prerequisites

- Docker with Compose v2
- At least one LLM provider API key (DeepSeek, OpenAI, Anthropic, or Gemini)

## Setup (one-time)

```bash
cp .env.example .env          # set at least one provider key
docker compose run --rm k3d-setup
docker compose up -d
```

API key for authenticated pages: **`dev-api-key`**

---

## Part 1: Secure & Govern MCP (AgentGateway + Evidra)

*Guided scroll through [localhost:28080](http://localhost:28080)*

| Step | Section | Talking point |
|------|---------|---------------|
| 1 | Hero | "Know what your agent intended. Know what happened." |
| 2 | Why evidra-mcp | "Smart output — 60x fewer tokens. Auto-evidence — zero agent code." |
| 3 | Protocol | "Prescribe before. Report after. Every mutation through AgentGateway recorded." |
| 4 | Signals | "8 detectors — retry loops, blast radius, risk escalation. Fires on day one." |
| 5 | Benchmark table | "Sonnet discovers the protocol without any skill. The skill sharpens it." |
| 6 | [/evidence](http://localhost:28080/evidence) | Brief: "21 entries, 11 protocol violations, 4 thrashing — real signals from real runs." |
| 7 | "Open Bench →" | Transition to Part 2 |

### Key message

Evidra plugs in behind AgentGateway — no gateway code changes — and adds auto-evidence recording, risk assessment, and behavioral signal detection on every tool call flowing through the gateway.

---

## Part 2: Building Cool Agents (kagent Certification)

| Step | Page | Talking point |
|------|------|---------------|
| 8 | [/lab](http://localhost:28080/lab) | "75 scenarios. CKA/CKS + Terraform. Real clusters." |
| 9 | [/lab/scenarios](http://localhost:28080/lab/scenarios) | Browse tracks, levels — "not synthetic benchmarks" |
| 10 | [/lab/run](http://localhost:28080/lab/run) | Trigger `broken-deployment` via kagent A2A |
| 11 | [/bench](http://localhost:28080/bench) | Watch progress — "kagent working through AgentGateway right now" |
| 12 | [/lab/bench](http://localhost:28080/lab/bench) | Leaderboard — pass rate, cost, speed |
| 13 | [/lab/bench/runs](http://localhost:28080/lab/bench/runs) | Drill into run — timeline, transcript |
| 14 | Quick tour: insights, compare | "The data to improve kagent" |
| 15 | Close | "Run it once to test. Run it many times to measure reliability." |

### Key message

kagent gets certified against 75 real infrastructure scenarios through AgentGateway. The leaderboard shows where it excels and where it needs work.

---

## Cleanup

```bash
docker compose down -v --remove-orphans
k3d cluster delete evidra-demo
```
