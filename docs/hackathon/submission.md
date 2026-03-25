# Hackathon Submission

## Project Title

**Evidra: DevOps MCP Server + Benchmark Suite — Getting kagent CKA Certified**

## One-liner

A DevOps MCP server behind AgentGateway that auto-records every
infrastructure mutation, benchmarks kagent against CKA-level K8s
scenarios, and measures reliability with behavioral signal detection.

## Categories

- **Secure & Govern MCP** — Evidra provides audit trail + risk
  assessment + compliance evidence for regulated environments
- **Building Cool Agents** — CKA benchmark suite for kagent with
  5 real Kubernetes failure scenarios
- **Open Source Contributions** — Bug fix PR for Google ADK tool
  calling (google/adk-python#4985)

## The Big Picture: CKA Certification for AI Agents

Kubernetes admins pass the CKA exam to prove they can diagnose and
fix real cluster problems. We're building the same for AI agents.

**Can kagent pass CKA-level scenarios?** We created 5 real failure
scenarios and measured what happened:

| Scenario | Difficulty | What breaks | What we measure |
|----------|-----------|------------|----------------|
| broken-deployment | L2 | Bad image tag | Fix speed, turn count, verification |
| repair-loop-escalation | L3 | Image + config + replicas | Multi-step repair, escalation patterns |
| privileged-pod-review | L3 | Privileged pod request | Security judgment — decline or deploy? |
| config-mutation-mid-fix | L3 | Config changes during repair | Drift detection, resilience |
| shared-configmap-trap | L3 | Shared config breaks 2 services | Blast radius awareness |

Each scenario is seeded in a Kind cluster, the agent runs
autonomously, and Evidra records everything — tool calls, risk
levels, verdicts, behavioral signals, reliability score.

**Result:** DeepSeek (deepseek-chat) successfully diagnosed and
fixed the broken-deployment scenario end-to-end in ~8 tool calls.
Evidra recorded 40 evidence entries with full audit trail.

## Architecture

```
kagent (Google ADK + DeepSeek)
    ↓
AgentGateway (secure MCP routing)
    ↓
evidra-mcp (DevOps MCP server)
    ├─ run_command          → kubectl/helm with auto-evidence
    ├─ collect_diagnostics  → one-call K8s workload diagnosis
    ├─ prescribe_smart      → pre-flight risk assessment
    ├─ report               → post-execution outcome recording
    └─ get_event            → evidence lookup
    ↓
evidra-api (evidence store + analytics)
    ├─ Behavioral signals   → 8 detectors (retry_loop, blast_radius, ...)
    ├─ Reliability score    → 0-100 weighted penalty model
    ├─ Bench comparison     → before/after prompt comparison
    └─ Evidence viewer      → web UI for audit trail
    ↓
PostgreSQL
```

**One MCP server. One AgentGateway. Full audit trail.**

The agent connects to one endpoint and gets DevOps tools + safety
recording + reliability scoring. No separate kubectl-mcp-server,
no bridge, no OTel collector. Evidra handles everything.

## How AgentGateway Is Used

AgentGateway sits between kagent and evidra-mcp, providing:

- **MCP routing** — routes all tool calls through governed gateway
- **Session management** — tracks MCP sessions
- **Deployment readiness** — TLS, auth, rate limiting, access
  policies for production/regulated environments

For regulated environments (finance, healthcare, government):
all agent traffic flows through AgentGateway → every mutation is
recorded by Evidra → evidence is signed and hash-chained →
behavioral patterns detected → reliability scored.

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

Weighted penalty model: `score = 100 × (1 - Σ(weight × rate))`

Score 95 = excellent agent. Score 62 = concerning behavior.

### Bench Comparison

Before/after prompt comparison:
- **Before:** basic prompt → agent fixes but makes sloppy mistakes
- **After:** Evidra skills prompt → agent prescribes before mutations,
  verifies after, produces fewer signals

The comparison shows measurable improvement: fewer signals, higher
score, same scenario.

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

## Repositories

- **Benchmark harness:** https://github.com/vitas/evidra-kagent-bench
- **Evidra core:** https://github.com/vitas/evidra
- **ADK fix PR:** https://github.com/google/adk-python/pull/4985
- **kagent issue:** https://github.com/kagent-dev/kagent/issues/1532

## Demo Video

[Link to video]

1. Stack boots: kagent + AgentGateway + evidra-mcp + evidra-api
2. Scenario seeded: broken-deployment in Kind cluster
3. Agent receives task, diagnoses ErrImagePull
4. Agent fixes with `kubectl set image`, verifies repair
5. Evidence viewer: 40 entries with tool calls, risk, verdicts
6. Dashboard: scorecard with signal detections
7. Bench run submitted with results

## Why This Matters

AI agents executing infrastructure commands will be the norm.
The question is: can you deploy them in regulated environments?

**Without governance:**
- No audit trail of what the agent did
- No behavioral analysis — retry loops go undetected
- No reliability measurement — trust is subjective
- Compliance = impossible

**With AgentGateway + Evidra:**
- Every mutation recorded, signed, hash-chained
- 8 behavioral signal detectors catch bad patterns
- Reliability scored 0-100 with confidence level
- Before/after comparison proves prompt improvements work
- CKA-level scenarios benchmark agent capabilities

This is how AI agents graduate from "demo" to "production-approved."
