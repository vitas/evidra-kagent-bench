# Demo Compose Stack

The demo stack runs the complete Evidra bench infrastructure on a single machine
via Docker Compose. All UIs and APIs are exposed through Traefik on port `28080`.

## Services

| Service | Purpose |
|---------|---------|
| **traefik** | Reverse proxy — `/lab/*` → bench-ui, everything else → evidra-api |
| **postgres** | Shared database for Evidra + bench-cli job queue |
| **evidra-api** | Evidra API + embedded UI (evidence, bench trigger, dashboard) |
| **evidra-mcp** | MCP server — run_command, collect_diagnostics, prescribe_smart, report |
| **bench-cli** | Scenario executor with 75 bundled scenarios (CKA/CKS + Terraform) |
| **bench-ui** | Certification/leaderboard viewer, served under `/lab/` |
| **agentgateway** | MCP HTTP gateway for kagent → evidra-mcp routing |
| **kagent** | Google ADK remediation agent (built locally) |
| **k3d-setup** | Creates k3d K8s cluster (run once before stack) |

## Setup

```bash
# 1. Configure credentials
cp .env.example .env
# Edit .env — set at least one provider key (e.g. DEEPSEEK_API_KEY)

# 2. Create k3d cluster (one-time)
docker compose run --rm k3d-setup

# 3. Boot the stack
docker compose up -d
```

## Host Ports

- Evidra UI/API + Bench UI: `28080` (configurable via `DEMO_PORT`)
- AgentGateway: `23000` (configurable via `DEMO_AGENTGATEWAY_PORT`)

## How It Works

1. `k3d-setup` creates a k3d cluster on the compose network and exports
   kubeconfig to the shared volume. No external network needed.

2. `bench-cli` starts as a service on port `8090`, syncs its 75 bundled
   scenarios to evidra-api on startup, and waits for certify requests.

3. When you trigger a run from the UI (or via `POST /v1/bench/trigger`),
   evidra-api delegates to bench-cli via `POST /v1/certify`.

4. bench-cli provisions a namespace in the k3d cluster, injects the failure
   scenario, runs the LLM agent loop (via evidra-mcp for tool calls), and
   verifies the outcome. For A2A runs (`execution_mode: "a2a"`), bench-cli
   delegates to kagent via A2A protocol instead of its own loop.

5. During execution, bench-cli reports progress back to evidra-api via webhook
   (`POST /v1/bench/trigger/{id}/progress`), enabling real-time status in the UI.

6. On completion, bench-cli submits the run record to `POST /v1/bench/runs`
   with duration, checks passed/failed, and evidence mode.

7. Results appear in the leaderboard at `/lab/bench` and evidence chain at
   `/evidence`.

## Environment Variables

Set in `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEEPSEEK_API_KEY` | — | DeepSeek provider key |
| `OPENAI_API_KEY` | — | OpenAI provider key |
| `ANTHROPIC_API_KEY` | — | Anthropic provider key |
| `GEMINI_API_KEY` | — | Google Gemini provider key |
| `EVIDRA_API_KEY` | `dev-api-key` | Evidra API auth token |
| `KAGENT_MODEL` | `deepseek-chat` | Default model for kagent |
| `DEMO_PORT` | `28080` | Host port for Traefik |
| `DEMO_CLUSTER_NAME` | `evidra-demo` | k3d cluster name |

Models with a configured provider key appear as available in the bench UI.

## Kagent Agent

The `kagent` service builds from `demo/kagent/Dockerfile` using Google ADK
(`kagent-adk v0.8.0-beta9`). It reads system prompts from `demo/prompts/`:

- `kagent-before.md` — basic prompt (run_command + collect_diagnostics only)
- `kagent-after.md` — Evidra-aware prompt (adds prescribe_smart + report)

The Dockerfile pins `litellm<1.82.7` due to a supply chain attack in later
versions (see `docs/known-issues.md`). It also uses a patched ADK fork for
Groq tool calling compatibility (source-build workaround).

The kagent service takes roughly 25-30 seconds before `/health` starts
accepting connections due to ADK initialization.

## Cleanup

```bash
docker compose down -v --remove-orphans
k3d cluster delete evidra-demo
```
