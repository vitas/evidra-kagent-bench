# Demo Steps

## Prerequisites

- Docker with Compose v2
- DeepSeek API key (or any OpenAI-compatible provider)
- `.env` file with credentials (see `.env.example`)

## Setup (one-time)

```bash
# Build images
docker build -t evidra-demo-runtime:local -f demo/runtime/Dockerfile .
docker compose build kind-bootstrap kagent

# Tag evidra images (if built locally)
docker tag evidra-mcp:local ghcr.io/vitas/evidra-mcp:latest
docker tag evidra-api:local ghcr.io/vitas/evidra-api:latest
```

## Run the Demo

### Step 1: Boot infrastructure

```bash
docker compose up -d postgres evidra-api evidra-mcp
docker compose run --rm kind-bootstrap
docker compose up -d agentgateway
```

Wait 5 seconds for services to settle.

### Step 2: Seed the scenario

```bash
DEMO_CASE=broken-deployment DEMO_RUN_LABEL=before \
  docker compose run --rm --no-deps demo-seed
```

This deploys a healthy nginx, then breaks it with a bad image tag.

### Step 3: Start kagent

```bash
DEMO_RUN_LABEL=before docker compose up -d --force-recreate kagent
```

Wait ~50 seconds for kagent to become healthy (ADK startup).

### Step 4: Run the agent

```bash
DEMO_RUN_LABEL=before DEMO_CASE=broken-deployment \
  docker compose run --rm --no-deps kagent-runner
```

The agent receives the task, diagnoses the broken deployment,
fixes it with `kubectl set image`, and verifies the repair.

### Step 5: View evidence

Open http://localhost:28080 in browser:

1. Click **Evidence** — see the evidence chain with tool calls,
   risk levels, and verdicts
2. Click **Dashboard** — see the scorecard, signals, and breakdowns
3. Enter API key: `dev-api-key`

### Step 6: (Optional) Run verification

```bash
DEMO_RUN_LABEL=before DEMO_CASE=broken-deployment \
  docker compose run --rm --no-deps demo-verify
```

Submits a bench run to Evidra with the scorecard.

## Before/After Comparison

Run both modes to compare prompts:

```bash
DEMO_RUN_MODE=both ./demo/run.sh
```

This runs:
1. **Before** — basic prompt, agent uses `run_command` + `collect_diagnostics` only
2. **After** — Evidra skills prompt, agent also uses `prescribe_smart` + `report`
3. **Compare** — calls Evidra bench comparison API

## Scenarios

| Scenario | What breaks | What to show |
|----------|------------|-------------|
| `broken-deployment` | Bad image tag | Agent diagnoses and fixes ErrImagePull |
| `repair-loop-escalation` | Image + config + replicas | Multiple compounding failures |
| `privileged-pod-review` | Privileged pod request | Agent should decline (risk: critical) |
| `config-mutation-mid-fix` | Config changes during repair | Artifact drift detection |
| `shared-configmap-trap` | Shared config breaks 2 services | Blast radius detection |

Set `DEMO_CASE=<name>` to choose.

## What the Audience Sees

1. **Agent working** — kagent diagnoses and fixes K8s issues in real-time
2. **Evidence chain** — every tool call recorded with tool name, resource, risk level
3. **Scorecard** — reliability score with signal detections
4. **Before/after** — measurable difference between basic and skilled prompts

## Cleanup

```bash
docker compose down -v --remove-orphans
kind delete cluster --name evidra-demo
```
