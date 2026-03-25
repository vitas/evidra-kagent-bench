# evidra-kagent-bench

Benchmark harness for evaluating AI infrastructure agents using
[Evidra](https://github.com/vitas/evidra) reliability scoring.

Two demo modes: **bench trigger** (select scenarios from UI, run 75 CKA-level tests)
and **kagent comparison** (before/after prompt tuning with Google ADK agent).

## Quick Start

```bash
# Configure LLM provider
cat > .env <<EOF
EVIDRA_API_KEY=dev-api-key
DEMO_CLUSTER_NAME=evidra-demo
KAGENT_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your-key
EOF

# Boot infrastructure
docker compose up -d postgres evidra-api evidra-mcp bench-cli bench-ui traefik
docker compose run --rm kind-bootstrap

# Open the UI
open http://localhost:28080
```

## UI Routes

Everything served on a single port via Traefik:

| Route | What |
|-------|------|
| `localhost:28080/` | Evidra landing page |
| `localhost:28080/evidence` | Evidence chain — tool calls, risk levels, verdicts |
| `localhost:28080/bench` | Bench dashboard — trigger scenarios, view progress |
| `localhost:28080/lab/` | Bench lab landing |
| `localhost:28080/lab/bench` | Model leaderboard — certification results |
| `localhost:28080/lab/bench/runs` | All benchmark runs |
| `localhost:28080/lab/bench/scenarios` | 75 scenario catalog |
| `localhost:28080/lab/bench/compare` | Model comparison matrix |

API key for authenticated pages: `dev-api-key`

## Demo Flow

### Mode A: Bench Trigger (UI-driven)

1. Open `http://localhost:28080/bench`
2. Click **Run Benchmark**
3. Select model + scenarios (e.g. `broken-deployment`)
4. Watch progress overlay — agent diagnoses and fixes K8s issues
5. View evidence at `/evidence` — prescribe/report chain with risk levels
6. View certification results at `/lab/bench` — leaderboard with pass rates

### Mode B: Kagent Comparison (script-driven)

```bash
# Run before/after comparison
DEMO_RUN_MODE=both ./demo/run.sh
```

1. **Before** — basic prompt, agent uses `run_command` + `collect_diagnostics` only
2. **After** — Evidra skills prompt, agent also uses `prescribe_smart` + `report`
3. **Compare** — measurable reliability improvement

## Architecture

```
Mode A: Bench Trigger
  Browser → Traefik(:28080) → evidra-api → bench-cli(/v1/certify)
    bench-cli → bootstrap → break → LLM agent loop (via evidra-mcp) → verify
                                              ↓
                                    evidence → evidra-api → postgres
                                    bench run → leaderboard

Mode B: Kagent Demo
  kagent → AgentGateway → evidra-mcp → Kind cluster
                                ↓ forward evidence
                           evidra-api → postgres
```

## Services

| Service | Image | Purpose |
|---------|-------|---------|
| **traefik** | traefik:v3.4 | Reverse proxy — single port for both UIs |
| **postgres** | postgres:17-alpine | Shared database |
| **evidra-api** | ghcr.io/vitas/evidra-api | API + embedded UI |
| **evidra-mcp** | ghcr.io/vitas/evidra-mcp | MCP server (kubectl, prescribe, report) |
| **bench-cli** | ghcr.io/vitas/bench-cli | Scenario executor (75 bundled scenarios) |
| **bench-ui** | ghcr.io/samebits/evidra-bench-ui | Certification/leaderboard UI |
| **agentgateway** | agentgateway:0.11.1 | MCP HTTP gateway for kagent |
| **kagent** | (built locally) | Google ADK remediation agent |

## Scenarios

5 demo scenarios (in `demo/manifests/`):

| Scenario | What breaks | Signal |
|----------|------------|--------|
| `broken-deployment` | Bad image tag → ErrImagePull | Basic diagnostic |
| `repair-loop-escalation` | Image + config + replicas | Repair loop |
| `privileged-pod-review` | Privileged pod request | Risk: critical |
| `config-mutation-mid-fix` | Config changes during repair | Artifact drift |
| `shared-configmap-trap` | Shared config breaks 2 services | Blast radius |

75 additional scenarios bundled in bench-cli (kubernetes, helm, argocd, terraform).

## Prerequisites

- Docker with Compose v2
- An OpenAI-compatible LLM API key (DeepSeek, Groq, OpenRouter)

## E2E Tests

```bash
cd tests/e2e && npm ci && npx playwright install chromium
npx playwright test demo-flow.spec.ts
```

## Cleanup

```bash
docker compose down -v --remove-orphans
kind delete cluster --name evidra-demo
```

## License

Apache 2.0
