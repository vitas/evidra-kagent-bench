# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

evidra-kagent-bench — benchmark harness for evaluating AI infrastructure agents (kagent) using Evidra's reliability scoring. Runs agents against real Kubernetes failure scenarios and measures signal detection, scoring, and behavioral improvement.

## Quick Start

```bash
# Set LLM provider keys (models with a configured key appear as available in the bench UI)
export DEEPSEEK_API_KEY=your-key

# Create Kind cluster (one-time — creates 'kind' network + kubeconfig)
docker compose build kind-bootstrap
docker compose run --rm kind-bootstrap

# Boot infrastructure
docker compose up -d

# Open the UI
open http://localhost:28080/lab   # Select scenarios, click "Run Benchmark"
```

## Architecture

```
UI → POST /v1/bench/trigger → evidra-api (RemoteExecutor) → bench-cli /v1/certify
  bench-cli → bootstrap → break → agent loop (LLM + evidra-mcp) → verify → submit
```

## Services (docker-compose.yml)

- **traefik** — Reverse proxy: `/lab/*` → bench-ui, everything else → evidra-api
- **postgres** — Shared database for Evidra + bench-cli River job queue
- **evidra-api** — Evidra API + embedded UI (bench dashboard, leaderboard, evidence)
- **evidra-mcp** — MCP server providing run_command, collect_diagnostics, prescribe_smart, report
- **bench-cli** — Scenario executor with 75 bundled scenarios (ghcr.io/vitas/bench-cli)
- **bench-ui** — Certification/leaderboard viewer, served under /lab/ via Traefik
- **agentgateway** — MCP HTTP gateway for kagent → evidra-mcp routing
- **kagent** — AI remediation agent (Google ADK + LiteLLM)

## Scenarios

5 demo scenarios in `demo/manifests/` (used as reference/documentation):
- `broken-deployment` — bad image tag → ErrImagePull
- `repair-loop-escalation` — compounding failures (ConfigMap + image + replicas)
- `privileged-pod-review` — agent must evaluate/decline a privileged pod
- `config-mutation-mid-fix` — ConfigMap mutates during repair (artifact drift)
- `shared-configmap-trap` — broken config affects two deployments (blast radius)

75 scenarios bundled in bench-cli across two exams: CKA/CKS (kubernetes, helm, argocd) and Terraform.

## Environment Variables

- `EVIDRA_API_KEY` — Evidra API auth (default: `dev-api-key`)
- `KAGENT_MODEL` — LLM model name (default: `deepseek-chat`)
- `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DASHSCOPE_API_KEY` — LLM provider keys

## Tests

```bash
cd tests/e2e && npm install && npx playwright install --with-deps chromium

# Smoke — verifies all UI pages load (no LLM key needed)
npm run test:smoke

# Full — triggers a real benchmark run (requires LLM_API_KEY)
npm run test:full

# Both
npm test
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
