# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

evidra-kagent-bench — benchmark harness for evaluating AI infrastructure agents (kagent) using Evidra's reliability scoring. Runs agents against real Kubernetes failure scenarios and measures signal detection, scoring, and behavioral improvement.

## Quick Start

```bash
# Set LLM provider
export LLM_BASE_URL=https://api.deepseek.com/v1
export LLM_API_KEY=your-key
export KAGENT_MODEL=deepseek-chat

# Boot infrastructure
docker compose up -d postgres evidra-api evidra-mcp bench-cli agentgateway
docker compose run --rm kind-bootstrap

# Option A: Trigger scenarios from UI
open http://localhost:28080/bench   # Select scenarios, click "Run Benchmark"

# Option B: Run kagent before/after comparison
DEMO_RUN_MODE=both ./demo/run.sh
```

## Architecture

Two execution modes share the same Evidra evidence + bench infrastructure:

```
Mode A: Bench Trigger (UI → bench-cli)
  UI → POST /v1/bench/trigger → evidra-api (RemoteExecutor) → bench-cli /v1/certify
    bench-cli → bootstrap → break → agent loop (LLM + evidra-mcp) → verify → submit

Mode B: Kagent Demo (before/after prompt comparison)
  kagent → AgentGateway → evidra-mcp → Kind cluster
                                ↓ forward evidence
                           evidra-api → postgres
```

## Services (docker-compose.yml)

**Core infrastructure:**
- **postgres** — Shared database for Evidra + bench-cli River job queue
- **evidra-api** — Evidra API + embedded UI (bench dashboard, leaderboard, evidence)
- **evidra-mcp** — MCP server providing run_command, collect_diagnostics, prescribe_smart, report
- **bench-cli** — Scenario executor with 75 bundled scenarios (ghcr.io/vitas/bench-cli)
- **agentgateway** — MCP HTTP gateway for kagent → evidra-mcp routing

**Kagent demo:**
- **kagent** — AI remediation agent (Google ADK + LiteLLM)
- **demo-seed** — Injects failure scenarios into Kind cluster
- **kagent-runner** — Orchestrates agent execution
- **demo-verify** — Validates results + submits bench runs
- **demo-compare** — Compares before/after bench runs

**Setup:**
- **kind-bootstrap** — Creates Kind K8s cluster (run once)

## Scenarios

5 demo scenarios in `demo/manifests/`:
- `broken-deployment` — bad image tag → ErrImagePull
- `repair-loop-escalation` — compounding failures (ConfigMap + image + replicas)
- `privileged-pod-review` — agent must evaluate/decline a privileged pod
- `config-mutation-mid-fix` — ConfigMap mutates during repair (artifact drift)
- `shared-configmap-trap` — broken config affects two deployments (blast radius)

75 additional scenarios bundled in bench-cli image (kubernetes, helm, argocd, terraform).

## Environment Variables

- `EVIDRA_API_KEY` — Evidra API auth (default: `dev-api-key`)
- `DEMO_CASE` — Scenario for kagent demo (default: `broken-deployment`)
- `DEMO_RUN_MODE` — `before`, `after`, or `both`
- `KAGENT_MODEL` — LLM model name (default: `deepseek-chat`)
- `LLM_BASE_URL` — OpenAI-compatible API URL
- `LLM_API_KEY` — LLM API key

## Tests

```bash
bash tests/test_demo.sh
```

## Evidra APIs Used

- `POST /v1/bench/trigger` — Trigger scenario execution via bench-cli
- `GET /v1/bench/trigger/{id}` — Poll progress (SSE or JSON)
- `POST /v1/bench/runs` — Submit benchmark result
- `GET /v1/bench/leaderboard` — Model rankings
- `GET /v1/bench/scenarios` — Available scenarios
- `POST /v1/evidence/forward` — Forward evidence entries (via evidra-mcp)
- `GET /v1/evidence/entries` — Query evidence chain
- `GET /v1/evidence/scorecard` — Reliability score
