# Hackathon Submission

## Project Title

**Evidra + AgentGateway: Evidence Intelligence Layer & Infrastructure Certification for kagent**

## One-liner

Evidra gives AgentGateway an evidence and intelligence layer —
auto-recording every infrastructure mutation with risk assessment
and behavioral signal detection — then uses it to certify kagent
against 75 real infrastructure scenarios spanning CKA/CKS and
Terraform exams.

## Categories

- **Secure & Govern MCP** — Evidra adds evidence recording, risk
  assessment, and behavioral intelligence to AgentGateway without
  gateway code changes
- **Building Cool Agents** — 75-scenario benchmark suite across two
  certification exams that measures kagent reliability and shows
  where it needs improvement
- **Open Source Contributions** — Bug fix PR for Google ADK tool
  calling (google/adk-python#4985)

## Two Problems, One Integration

### AgentGateway needed an intelligence layer

AgentGateway already solves the hard deployment problems: TLS
termination, authentication, rate limiting, access policies, session
management. But it routes MCP traffic as a black box — it doesn't
know what the agent is doing, whether operations are safe, or
whether the agent is stuck in a loop.

By plugging Evidra in as an MCP backend behind AgentGateway, every
tool call flowing through the gateway gets automatic evidence
recording, risk assessment, and behavioral signal detection. The
gateway gains an intelligence layer without any code changes to
AgentGateway itself.

### kagent needed a way to get certified

kagent is a capable Kubernetes agent built on Google ADK. It can
diagnose and fix real cluster problems. But "it works" isn't enough
for production. Operators need to know: does it work reliably?
Does it take unnecessary risks? Does it escalate when it should
stop?

By running kagent through the Evidra benchmark suite, we measure
its reliability quantitatively — and show exactly where it needs
improvement. The certification results are scenario-by-scenario,
signal-by-signal.

## Architecture

```
kagent (Google ADK + LLM)
    ↓ MCP tool calls
AgentGateway (auth, TLS, rate limits, access policies, sessions)
    ↓ routes to backend — gains evidence layer via Evidra
evidra-mcp (DevOps MCP server)
    ├─ run_command          → kubectl/helm/terraform with auto-evidence
    ├─ collect_diagnostics  → one-call K8s workload diagnosis
    ├─ prescribe_smart      → pre-flight risk assessment
    ├─ report               → post-execution outcome recording
    └─ get_event            → evidence lookup
    ↓
evidra-api (evidence store + analytics + bench)
    ├─ Evidence chain       → signed, hash-chained audit trail
    ├─ Behavioral signals   → 8 detectors (retry_loop, blast_radius, ...)
    ├─ Reliability score    → 0-100 weighted penalty model
    ├─ Bench leaderboard    → model rankings across 75 scenarios
    └─ Web UI               → evidence viewer, dashboard, scenario catalog
    ↓
PostgreSQL
```

**AgentGateway provides the secure transport. Evidra provides the
intelligence.** Together they answer: what did the agent do, was it
safe, and can we trust it in production?

## What AgentGateway Gets

AgentGateway is used as the governed entry point for all agent
traffic. Evidra extends what flows through it:

| AgentGateway provides | Evidra adds |
|----------------------|-------------|
| MCP routing | Auto-evidence on every tool call |
| Authentication | Risk assessment per mutation |
| Rate limiting | Behavioral signal detection |
| Access policies | Reliability scoring (0-100) |
| Session management | Signed, hash-chained audit trail |
| TLS termination | Infrastructure certification benchmark |

For regulated environments (finance, healthcare, government): agent
traffic flows through AgentGateway → every mutation is recorded by
Evidra → evidence is signed → behavioral patterns detected →
reliability scored. No code changes to the gateway.

## What kagent Gets

The benchmark suite gives kagent developers actionable data:

- **Pass/fail on 75 scenarios** — which failures can kagent handle?
- **Behavioral signals per run** — retry loops, scope creep, risk escalation
- **Reliability score** — quantitative trust metric, not guesswork
- **Model comparison** — DeepSeek vs GPT-4o vs Claude on the same scenarios
- **Regression detection** — run after prompt changes, prove improvement

## The Benchmark: 75 Infrastructure Scenarios

Two certification exams for AI agents:

**CKA/CKS Exam** — 68 Kubernetes scenarios

| Track | Scenarios | Examples |
|-------|-----------|---------|
| Kubernetes | 60 | broken-deployment, crashloop-backoff, rbac-escalation-backdoor |
| Helm | 4 | failed-upgrade, dependency-conflict, pending-release |
| ArgoCD | 4 | sync-failure, out-of-sync, degraded-after-sync |

**Terraform Exam** — 5 IaC scenarios

| Track | Scenarios | Examples |
|-------|-----------|---------|
| Terraform | 5 | state-drift, corrupted-state, plan-apply-partial-failure |

Plus 2 cloud scenarios (s3-bucket-public-access, security-group-too-open).

Five representative scenarios also ship as demo manifests:

| Scenario | Difficulty | What breaks | What Evidra detects |
|----------|-----------|------------|-------------------|
| broken-deployment | L2 | Bad image tag | Fix speed, turn count |
| repair-loop-escalation | L3 | Image + config + replicas | repair_loop, retry_loop |
| privileged-pod-review | L3 | Privileged pod request | risk level: critical |
| config-mutation-mid-fix | L3 | Config changes during repair | artifact_drift |
| shared-configmap-trap | L3 | Shared config breaks 2 services | blast_radius |

## What Evidra Measures

### Evidence Chain

Every `run_command` call that mutates infrastructure automatically
generates a prescribe (intent) + report (outcome) evidence pair:

```json
{
  "type": "prescribe",
  "tool": "kubectl",
  "operation": "set",
  "resource": "deployment/web (demo)",
  "risk_level": "medium",
  "actor": "demoagent_agent"
}
```

### Behavioral Signals (8 detectors)

| Signal | What it catches |
|--------|----------------|
| protocol_violation | Mutations without proper lifecycle |
| retry_loop | Agent stuck retrying the same operation |
| blast_radius | Mutations affecting too many resources |
| repair_loop | Escalating fix attempts |
| artifact_drift | Applied config differs from planned |
| thrashing | Rapid alternation between opposing actions |
| new_scope | Agent operating outside expected boundaries |
| risk_escalation | Operations increasing in risk over time |

### Reliability Scorecard

Weighted penalty model: `score = 100 * (1 - sum(weight * rate))`

Score 95 = excellent agent. Score 62 = concerning behavior.

## Open Source Contributions

### 1. Google ADK: Tool Calling Fix
**PR:** https://github.com/google/adk-python/pull/4985

Found that `litellm.add_function_to_prompt = True` set globally in
ADK breaks native tool calling for Groq, OpenAI, and Anthropic.
Models output XML function tags instead of proper `tool_calls` JSON.

Proved the root cause: direct LiteLLM call works, ADK-wrapped call
fails. One-line fix removes the global flag.

**Issue:** https://github.com/kagent-dev/kagent/issues/1532

### 2. LiteLLM Supply Chain Attack Mitigation
Documented and mitigated litellm v1.82.8 supply chain compromise
(credential stealer). Pinned safe version in kagent Dockerfile.

**Reference:** https://github.com/BerriAI/litellm/issues/24512

### 3. ext-audit MCP Extension Proposal
Designed a protocol-native audit trail extension for MCP. Minimal
format: tool name, status, timing, session, actor, argument digest.
Any audit consumer can ingest it. Evidra adds the intelligence.

## Demo

```bash
git clone https://github.com/vitas/evidra-kagent-bench
cd evidra-kagent-bench
cp .env.example .env   # set DEEPSEEK_API_KEY or another provider key
docker compose run --rm k3d-setup
docker compose up -d
open http://localhost:28080/lab
```

### What to explore

| Page | URL | What you see |
|------|-----|--------------|
| Run Benchmark | [/lab/run](http://localhost:28080/lab/run) | Select model + scenarios, trigger a run |
| Progress | [/bench](http://localhost:28080/bench) | Real-time scenario execution |
| Evidence | [/evidence](http://localhost:28080/evidence) | Tool calls with risk levels, verdicts |
| Leaderboard | [/lab/bench](http://localhost:28080/lab/bench) | Model rankings, certification results |
| All Runs | [/lab/bench/runs](http://localhost:28080/lab/bench/runs) | Drill into individual run details |
| Scenarios | [/lab/bench/scenarios](http://localhost:28080/lab/bench/scenarios) | 75 scenario catalog |

## Repositories

- **Benchmark harness:** https://github.com/vitas/evidra-kagent-bench
- **Evidra core:** https://github.com/vitas/evidra
- **ADK fix PR:** https://github.com/google/adk-python/pull/4985
- **kagent issue:** https://github.com/kagent-dev/kagent/issues/1532
