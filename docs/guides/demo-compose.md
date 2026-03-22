# Private Demo Compose

Use the private demo stack to bring up the long-lived services and then run the
short-lived jobs in sequence.

The private stack now includes:

- `evidra-mcp` for an in-stack MCP target providing run_command (kubectl
  execution with auto-evidence) + prescribe/report
- `bridge` using the local `evidra-agentgateway-bridge` build
- `kagent`, a local `kagent-adk --local` service built from a checked-in demo
  agent project
- a mode-aware `kagent-runner` that prefers the real `kagent` service when
  Bifrost credentials are configured and otherwise falls back to one
  deterministic MCP `tools/call` smoke step
- local demo manifests for both `broken-deployment` and `repair-loop-escalation`
- paired prompt assets:
  - `demo/prompts/kagent-before.md`
  - `demo/prompts/kagent-after.md`

Default host ports:

- Evidra UI/API: `28080`
- AgentGateway: `23000`

Postgres stays internal to the compose network so the stack can coexist with a
local development database.

Core command surface:

```bash
docker compose -f docker-compose.yml up -d postgres evidra-api bridge otel-collector
docker compose -f docker-compose.yml run --rm kind-bootstrap
docker compose -f docker-compose.yml up -d agentgateway
docker compose -f docker-compose.yml up -d kagent
docker compose -f docker-compose.yml run --rm demo-seed
docker compose -f docker-compose.yml run --rm kagent-runner
docker compose -f docker-compose.yml run --rm demo-verify
docker compose -f docker-compose.yml run --rm demo-compare   # after "both" mode
```

For a single wrapper command, run:

```bash
./demo/run.sh
```

Optional:

- `KAGENT_MODEL`
  defaults to `qwen-plus`
- `BIFROST_BASE_URL`
  OpenAI-compatible base URL for the released `kagent` local runner
- `BIFROST_API_KEY`
  bearer/API key for that Bifrost endpoint

Current flow:

1. `kind-bootstrap` creates or reuses the demo kind cluster and exports a shared kubeconfig.
2. `demo-seed` applies the curated broken-deployment case into the cluster.
3. `kagent` starts as a local `kagent-adk --local` A2A service and reads
   `kagent-before.md` or `kagent-after.md` from `demo/prompts/` through
   `KAGENT_SYSTEM_PROMPT_FILE`. In practice the local service can take roughly
   25-30 seconds before `/health` starts accepting connections, so the stack
   treats readiness separately from simple process start.
4. `kagent-runner` stores the exact prompt used under the per-run artifacts
   directory, waits for `http://kagent:8080/health`, reads
   `/.well-known/agent-card.json`, and sends a JSON-RPC `message/send` request
   to the service root.
5. When `BIFROST_BASE_URL` and `BIFROST_API_KEY` are set, the real `kagent`
   service path is used with `KAGENT_MODEL=qwen-plus`.
6. Without Bifrost credentials, `kagent-runner` falls back to one harmless
   `scale_deployment` call through evidra-mcp's `run_command` tool so the
   rest of the private stack can still be smoke-tested locally.
7. `demo-verify` checks the cluster state, confirms new evidence entries via
   `GET /v1/evidence/entries?session_id=`, fetches the scorecard via
   `GET /v1/evidence/scorecard`, and submits a bench run to
   `POST /v1/bench/runs` with the scenario result and scorecard metadata.
8. `demo-compare` (runs automatically in `both` mode) calls
   `GET /v1/bench/compare/runs?a=&b=` to compare the before and after bench
   runs and prints a delta summary.

Implementation note:

- The checked-in `demo/kagent/Dockerfile` currently builds `kagent-adk` from
  the upstream `v0.8.0-beta9` source tag. The published container reference we
  tried first was not pullable in this environment, so the private demo uses a
  source-build workaround instead of a released base image.

`repair-loop-escalation` is already wired into the seed/verify scripts for the
first real `kagent` before/after scenario.
