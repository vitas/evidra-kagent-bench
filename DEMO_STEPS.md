# Demo Steps

## Prerequisites

- Docker with Compose v2
- Gemini API key (for kagent live runs)

## Setup (one-time)

```bash
cp .env.example .env          # set GEMINI_API_KEY + DASHSCOPE_API_KEY
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

### Live comparison: none vs smart

Show the same agent, same scenario — with and without evidence.

| Run | Trigger | What judges see |
|-----|---------|----------------|
| **Baseline** | `execution_mode: "a2a", evidence_mode: "none"` | kagent fixes it. Pass/fail only. No audit trail. |
| **With Evidra** | `execution_mode: "a2a", evidence_mode: "smart"` | Same kagent, same fix. Evidence page shows full audit trail with risk classification. |

Talking point: *"Flip a switch. Same agent, same scenario. Now you see every mutation, every risk level, every verdict."*

| Step | Page | Talking point |
|------|------|---------------|
| 6 | [/bench](http://localhost:28080/bench) | Trigger baseline run (none), watch it pass |
| 7 | [/bench](http://localhost:28080/bench) | Trigger smart run, watch it pass |
| 8 | [/evidence](http://localhost:28080/evidence) | "Evidence appeared — prescribe/report pairs, risk levels, signals. Zero agent changes." |

### Key message

Evidra plugs in behind AgentGateway — no gateway code changes, no agent code changes — and adds auto-evidence recording, risk assessment, and behavioral signal detection on every tool call.

---

## Part 2: Building Cool Agents (kagent Certification)

| Step | Page | Talking point |
|------|------|---------------|
| 9 | [/lab](http://localhost:28080/lab) | "75 scenarios. CKA/CKS + Terraform. Real clusters." |
| 10 | [/lab/scenarios](http://localhost:28080/lab/scenarios) | Browse tracks, levels — "not synthetic benchmarks" |
| 11 | [/lab/bench](http://localhost:28080/lab/bench) | Leaderboard — 3 models, 996 runs. "Claude at 96%, DeepSeek at 85%, Gemini at 75%." |
| 12 | [/lab/bench/runs](http://localhost:28080/lab/bench/runs) | Drill into a run — timeline, transcript, tool calls |
| 13 | Quick tour: insights, compare | "The data to improve kagent" |
| 14 | Close | "Run it once to test. Run it many times to measure reliability." |

### Key message

kagent gets certified against 75 real infrastructure scenarios through AgentGateway. The leaderboard shows where it excels and where it needs work — across 3 models, with real pass^k reliability data.

---

## Model Configuration

| Component | Model | Endpoint |
|-----------|-------|----------|
| **kagent** (live A2A runs) | gemini-2.5-flash | Gemini API |
| **bench-cli** (direct runs) | deepseek-chat / qwen-plus | DashScope |
| **Leaderboard** (pre-seeded) | claude-sonnet-4, deepseek-chat, gemini-2.5-flash | From hosted batch runs |

---

## Cleanup

```bash
docker compose down -v --remove-orphans
k3d cluster delete evidra-demo
```
