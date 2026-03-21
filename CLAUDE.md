# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

evidra-kagent-bench — benchmark harness for evaluating AI infrastructure agents (kagent) using Evidra's reliability scoring. Runs agents against real Kubernetes failure scenarios and measures signal detection, scoring, and behavioral improvement.

## Quick Start

```bash
# Set LLM provider
export BIFROST_BASE_URL=https://api.groq.com/openai/v1
export BIFROST_API_KEY=your-key
export KAGENT_MODEL=llama-3.3-70b-versatile

# Run both modes (before/after prompt comparison)
DEMO_RUN_MODE=both ./demo/run_private_demo.sh
```

## Architecture

```
kagent → AgentGateway → mcp-backend (kubectl) → Kind cluster
              ↓ OTLP
         OTel Collector → bridge → evidra-api (evidence + scoring)
```

## Services (docker-compose.yml)

- **postgres** — Evidra database
- **evidra-api** — Evidra API (pre-built image from ghcr.io)
- **bridge** — OTLP→Evidra ingest translator (pre-built image)
- **otel-collector** — gRPC→HTTP OTLP conversion
- **agentgateway** — MCP HTTP gateway + trace emitter
- **mcp-backend** — kubectl MCP tools (kubectl-mcp-server)
- **kagent** — AI remediation agent (Google ADK + LiteLLM)
- **kind-bootstrap** — Creates Kind K8s cluster
- **demo-seed** — Injects failure scenarios
- **kagent-runner** — Orchestrates agent execution
- **demo-verify** — Validates results + submits bench runs
- **demo-compare** — Compares before/after bench runs

## Scenarios

- `broken-deployment` — bad image tag → ErrImagePull
- `repair-loop-escalation` — compounding failures (ConfigMap + image + replicas)

## Environment Variables

- `EVIDRA_API_KEY` — Evidra API auth (default: `dev-api-key`)
- `EVIDRA_API_IMAGE` — Evidra API image (default: `ghcr.io/vitas/evidra-api:latest`)
- `EVIDRA_BRIDGE_IMAGE` — Bridge image (default: `ghcr.io/vitas/evidra-agentgateway-bridge:latest`)
- `DEMO_CASE` — Scenario (default: `broken-deployment`)
- `DEMO_RUN_MODE` — `before`, `after`, or `both`
- `KAGENT_MODEL` — LLM model name
- `BIFROST_BASE_URL` — OpenAI-compatible API URL
- `BIFROST_API_KEY` — LLM API key

## Tests

```bash
bash tests/test_private_demo_compose.sh
```

## Evidra APIs Used

- `POST /v1/evidence/ingest/prescribe` — Record intended mutation
- `POST /v1/evidence/ingest/report` — Record outcome
- `GET /v1/evidence/entries?session_id=` — Query evidence
- `GET /v1/evidence/scorecard` — Reliability score
- `POST /v1/bench/runs` — Submit benchmark result
- `GET /v1/bench/compare/runs?a=&b=` — Compare runs
