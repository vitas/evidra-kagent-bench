# Hackathon Submission: Evidra — Governance Layer for AgentGateway

## Project Title

**Evidra: Flight Recorder & Reliability Scoring for AI Infrastructure Agents**

## One-liner

AgentGateway secures the transport. Evidra records what happened and
measures whether you should trust the agent in production.

## Category

Secure & Govern MCP

## Project Description

AI agents are making real infrastructure changes — kubectl apply,
helm upgrade, terraform destroy. In regulated environments (finance,
healthcare, government), you need to answer: "What did the agent do?
Was it safe? Can we prove it?"

**Evidra is a DevOps MCP server with built-in evidence recording.**
It serves as the backend behind AgentGateway, providing:

- **run_command** — executes kubectl/helm/terraform with auto-evidence
  recording. Every mutation is captured as a cryptographically signed
  evidence entry. Token-efficient smart output reduces LLM costs.
- **collect_diagnostics** — one-call Kubernetes workload diagnosis
- **prescribe_smart / report** — explicit pre-flight risk assessment
  protocol for agents that want to check risk before acting
- **Behavioral signal detection** — 8 detectors catch retry loops,
  blast radius, protocol violations, artifact drift, repair loops,
  thrashing, new scope, risk escalation
- **Reliability scorecards** — weighted penalty model produces 0-100
  reliability scores per agent session

## How AgentGateway Is Used

AgentGateway sits between the AI agent (kagent) and Evidra MCP:

```
kagent → AgentGateway → evidra-mcp → Kubernetes cluster
                              ↓ forward evidence
                         evidra-api → PostgreSQL
```

AgentGateway provides:
- **MCP routing** — routes all tool calls through a single gateway
- **CORS and session management** — handles MCP protocol concerns
- **Deployment security** — in production, AgentGateway handles
  TLS, auth, rate limiting, and access policies

For regulated environments, this architecture means:
- All agent actions flow through a governed gateway
- Every mutation is recorded with signed evidence
- Behavioral patterns are detected and scored
- Audit trail is immutable and verifiable

## How kagent Is Used

We run kagent (Google ADK) against real Kubernetes failure scenarios:
- **broken-deployment** — bad image tag, agent must diagnose and fix
- **repair-loop-escalation** — compounding failures requiring
  multi-step remediation
- **privileged-pod-review** — agent evaluates security risk of
  a privileged container deployment
- **config-mutation-mid-fix** — configuration drifts during repair
- **shared-configmap-trap** — one fix breaks another service

Each scenario tests a different reliability dimension. Evidra records
the evidence and produces a scorecard showing how the agent performed.

## Open Source Contributions

### 1. Bug fix: Google ADK tool calling with Groq
Found that `litellm.add_function_to_prompt = True` set globally in
ADK breaks native tool calling for Groq, OpenAI, and Anthropic.
One-line fix, PR filed.

- **Issue:** kagent-dev/kagent#1532
- **PR:** google/adk-python#4985
- **Root cause:** ADK injects tool definitions into system prompt
  as text, making models output XML-style function tags instead of
  proper tool_calls JSON

### 2. LiteLLM supply chain attack mitigation
Documented and mitigated the litellm v1.82.8 supply chain attack
(credential stealer from PyPI compromise). Pinned safe version in
kagent Dockerfile.

- **Reference:** BerriAI/litellm#24512

### 3. ext-audit MCP extension proposal
Designed a protocol-native audit trail extension for MCP that would
standardize evidence events across all MCP servers. Minimal, neutral
format that any audit consumer can ingest.

## Repositories

- **Benchmark harness:** https://github.com/vitas/evidra-kagent-bench
- **Evidra core:** https://github.com/vitas/evidra
- **ADK fix PR:** https://github.com/google/adk-python/pull/4985

## Demo Video

[Link to video — 5-10 minutes showing:]
1. Stack boots: kagent + AgentGateway + evidra-mcp + evidra-api
2. Agent receives broken-deployment task
3. Agent diagnoses and fixes the issue using run_command
4. Evidence viewer shows tool calls with risk levels and verdicts
5. Scorecard shows reliability score and signal detections
6. Before/after prompt comparison (optional)

## What Makes This Different

Logs tell you what happened. **Evidra tells you whether you should
trust this agent in production.**

| Gateway log says | Evidra says |
|-----------------|-------------|
| span: tools/call kubectl apply | prescribe → risk assessment → report → verdict chain |
| 3 spans with the same tool | **retry_loop signal**: agent is stuck |
| 5 spans across namespaces | **blast_radius signal**: agent is out of scope |
| span failed, next span same tool | **repair_loop signal**: agent is escalating |
| 50K tokens across 12 tool calls | **score: 62/100, band: concerning** |

## Team

Solo developer. Built in 2 weeks during the hackathon period.
