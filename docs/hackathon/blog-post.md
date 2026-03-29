# Getting kagent Certified: Benchmarking AI Agents with Evidra + AgentGateway

*How we gave AgentGateway an evidence and intelligence layer,
built infrastructure certification exams for kagent, and found a
critical ADK bug along the way*

## Can Your AI Agent Pass the CKA Exam?

Kubernetes admins take the CKA/CKS exams to prove they can diagnose
and fix real cluster problems under pressure. Terraform engineers
certify their IaC skills the same way. These exams test judgment:
can you find the root cause, make the smallest fix, and verify it
worked?

AI agents are now doing the same work. kagent diagnoses broken
deployments, repairs configuration drift, evaluates security risks.
But nobody measures whether these agents are actually reliable —
and nobody records what they did.

**We built certification exams for AI agents.** 75 real
infrastructure scenarios — a CKA/CKS exam (68 Kubernetes, Helm,
and ArgoCD scenarios) and a Terraform exam (5 IaC scenarios) —
scored by Evidra's behavioral signal detectors and reliability
scorecards. The agent doesn't just need to fix the problem — it
needs to fix it safely, efficiently, and verifiably.

## Two Problems, One Integration

### AgentGateway needed an intelligence layer

AgentGateway already solves the hard deployment problems: TLS
termination, authentication, rate limiting, access policies, session
management. But it routes MCP traffic as a black box — it doesn't
know what the agent is doing with the tools it calls, whether
operations are safe, or whether the agent is stuck in a loop.

By plugging Evidra in as an MCP backend behind AgentGateway, every
tool call flowing through the gateway now gets automatic evidence
recording, risk assessment, and behavioral signal detection. The
gateway gains an intelligence layer without any code changes.

### kagent needed a way to get certified

kagent is a capable Kubernetes agent built on Google ADK. It can
diagnose and fix real cluster problems. But "it works" isn't enough
for production. Operators need to know: does it work reliably?
Does it take unnecessary risks? Does it escalate when it should
stop?

By running kagent through the Evidra benchmark suite, we can
measure its reliability quantitatively — and improve it. The
certification results show exactly where kagent excels and where
it needs work, scenario by scenario.

## The Benchmark

75 scenarios bundled in bench-cli, run against real K8s clusters:

**CKA/CKS Exam** — 68 Kubernetes scenarios:

| Track | Scenarios | Examples |
|-------|-----------|---------|
| Kubernetes | 60 | broken-deployment, crashloop-backoff, rbac-escalation-backdoor |
| Helm | 4 | failed-upgrade, dependency-conflict, pending-release |
| ArgoCD | 4 | sync-failure, out-of-sync, degraded-after-sync |

**Terraform Exam** — 5 IaC scenarios:

| Track | Scenarios | Examples |
|-------|-----------|---------|
| Terraform | 5 | state-drift, corrupted-state, plan-apply-partial-failure |

Each scenario injects a real failure into a real cluster. The agent
receives a natural language task ("the web deployment in namespace
demo is unhealthy, fix it") and works autonomously — diagnosing,
repairing, and verifying. Evidra records everything.

**The interesting finding:** even on successful fixes, Evidra detects
behavioral signals like protocol violations and scope creep. The
agent worked, but it wasn't perfectly clean. That's exactly what a
CKA examiner would flag — and exactly what kagent's developers need
to see to improve it.

## How It Works

```
kagent / bench-cli agent loop
    ↓ MCP tool calls
AgentGateway (auth, rate limits, access policies)
    ↓ routes to backend
evidra-mcp (kubectl execution + auto-evidence)
    ↓ every mutation → signed evidence entry
evidra-api (signal detection, scoring, leaderboard)
    ↓
postgres (evidence chain, bench runs, scorecards)
```

The flow:

1. Select scenarios and model from the bench UI
2. bench-cli provisions a namespace, injects the failure, runs the agent
3. Agent calls tools through AgentGateway → evidra-mcp → kubectl
4. Every mutation is automatically recorded as signed evidence
5. Evidra detects behavioral patterns in real-time
6. Results appear in the leaderboard with pass rate, cost, and reliability score

### What Evidra adds to AgentGateway

**Auto-evidence recording.** Every `run_command` call flowing through
the gateway automatically generates a prescribe (intent) + report
(outcome) evidence pair. The evidence includes the actual kubectl
command, the target resource, risk level, and execution result.
No agent changes needed — the gateway just routes, Evidra observes.

**Behavioral signal detection.** Eight detectors run on the evidence
stream:
- `retry_loop` — agent stuck retrying the same operation
- `blast_radius` — mutations affecting too many resources
- `protocol_violation` — prescribe without report, or vice versa
- `artifact_drift` — what was applied differs from what was planned
- `repair_loop` — escalating fix attempts
- `thrashing` — rapid alternation between opposing actions
- `risk_escalation` — operations increasing in risk over time
- `new_scope` — agent operating outside expected boundaries

**Reliability scorecards.** A weighted penalty model converts signal
detections into a 0-100 score. Score 95 = excellent. Score 62 =
concerning. The score answers the trust question quantitatively.

### What the benchmark gives kagent

**Certification results.** Pass/fail on 75 scenarios with detailed
evidence trails. Developers can see exactly which scenarios kagent
handles well and which need work.

**Regression detection.** Run the same suite after prompt changes,
model upgrades, or ADK updates. Compare before/after to prove
improvements and catch regressions.

**Model comparison.** Run the same scenarios across DeepSeek, GPT-4o,
Claude, Gemini. The leaderboard shows which model is most reliable,
cheapest per pass, and fastest — specifically for kagent's use case.

## Five Demo Scenarios

Five representative scenarios ship as demo manifests:

| Scenario | What breaks | What Evidra detects |
|----------|------------|-------------------|
| broken-deployment | Bad image tag | Agent turn count, fix efficiency |
| repair-loop-escalation | Image + config + replicas | repair_loop, retry_loop |
| privileged-pod-review | Privileged pod request | risk level: critical |
| config-mutation-mid-fix | Config changes during repair | artifact_drift |
| shared-configmap-trap | Shared config breaks 2 services | blast_radius |

## What We Found (and Fixed) Along the Way

### ADK Bug: Tool Calling Broken with Groq

Google ADK sets `litellm.add_function_to_prompt = True` globally
at import time. This forces ALL models through text-based tool
calling, even models that support native function calling (Groq,
OpenAI, Anthropic).

The result: models output XML-style function tags instead of proper
`tool_calls` JSON. Groq rejects this with `tool_use_failed`.

We proved LiteLLM works correctly without the flag (direct call
returns proper `tool_calls` JSON). The bug is in ADK, not LiteLLM.

**Fix:** One line removed. PR filed at google/adk-python#4985.

### LiteLLM Supply Chain Attack

During development, we discovered that litellm v1.82.8 on PyPI
contains a credential-stealing payload — SSH keys, cloud creds,
K8s configs, API keys exfiltrated to an attacker domain. The
maintainer account was compromised through the Trivy supply chain
attack.

We documented the issue, pinned a safe version in our Dockerfile,
and published mitigation guidance.

## The Regulated Environment Story

Here's what a compliance officer sees with this stack:

1. **Agent traffic flows through AgentGateway** — governed,
   authenticated, rate-limited
2. **AgentGateway gets an evidence layer** — every tool call
   recorded with risk assessment, without gateway code changes
3. **Every infrastructure mutation is signed** — tamper-evident,
   hash-chained, Ed25519 signatures
4. **Behavioral patterns are detected** — not just "what happened"
   but "was it safe"
5. **Reliability is scored** — quantitative trust metric, not
   subjective judgment
6. **Agents can be certified** — 75-scenario exam with verifiable
   results, not marketing claims

This is what moves AI agents from "experimental" to "production-
approved" in regulated environments.

## Try It

```bash
git clone https://github.com/vitas/evidra-kagent-bench
cd evidra-kagent-bench

# Configure LLM provider
cp .env.example .env
# Edit .env — set DEEPSEEK_API_KEY (or another provider key)

# Create k3d cluster (one-time)
docker compose run --rm k3d-setup

# Boot the stack
docker compose up -d

# Open the UI
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

## Links

- **Benchmark harness:** [evidra-kagent-bench](https://github.com/vitas/evidra-kagent-bench)
- **Evidra core:** [evidra](https://github.com/vitas/evidra)
- **ADK bug fix:** [google/adk-python#4985](https://github.com/google/adk-python/pull/4985)
- **AgentGateway:** [agentgateway.dev](https://agentgateway.dev)
- **kagent:** [kagent-dev/kagent](https://github.com/kagent-dev/kagent)
