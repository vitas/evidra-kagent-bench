# Demo Steps

## Prerequisites

- Docker with Compose v2
- DeepSeek API key (or any OpenAI-compatible provider)
- `.env` file with credentials

```bash
cat > .env <<EOF
EVIDRA_API_KEY=dev-api-key
DEMO_CLUSTER_NAME=evidra-demo
KAGENT_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your-key
EOF
```

## Setup (one-time)

```bash
# Build local images
docker compose build kind-bootstrap kagent
docker build -t evidra-demo-runtime:local -f demo/runtime/Dockerfile .

# Create Kind cluster
docker compose run --rm kind-bootstrap
```

## Boot the Stack

```bash
docker compose up -d postgres evidra-api evidra-mcp bench-cli bench-ui traefik agentgateway
```

Wait 10 seconds for bench-cli to sync scenarios.

Open **http://localhost:28080** — single URL for everything.

## Demo Mode A: Bench Trigger (UI)

### Step 1: Open bench dashboard

Navigate to `http://localhost:28080/bench`

Enter API key: `dev-api-key`

### Step 2: Trigger a scenario

1. Click **Run Benchmark**
2. Enter model: `deepseek-chat`
3. Check `broken-deployment` scenario
4. Click **Start**

### Step 3: Watch progress

The progress overlay shows scenario status in real-time:
- ⏳ pending → 🔄 running → ✅ passed / ❌ failed

### Step 4: View evidence

Navigate to `http://localhost:28080/evidence`

Shows the evidence chain:
- Every `run_command` call with mutation detection
- `prescribe_smart` with risk assessment
- `report` with verdict
- Tool name, resource identity, risk level

### Step 5: View certification results

Navigate to `http://localhost:28080/lab/bench`

Shows the model leaderboard:
- Pass rate, cost per pass, duration
- "Most Reliable", "Best Value", "Fastest" rankings
- Drill into individual runs at `/lab/bench/runs`

## Demo Mode B: Kagent Before/After

### Full automated run

```bash
DEMO_RUN_MODE=both ./demo/run.sh
```

### Manual step-by-step

```bash
# Seed broken deployment
DEMO_CASE=broken-deployment DEMO_RUN_LABEL=before \
  docker compose run --rm --no-deps demo-seed

# Start kagent (basic prompt)
DEMO_RUN_LABEL=before docker compose up -d --force-recreate kagent

# Run the agent
DEMO_RUN_LABEL=before DEMO_CASE=broken-deployment \
  docker compose run --rm --no-deps kagent-runner

# Verify and submit bench run
DEMO_RUN_LABEL=before DEMO_CASE=broken-deployment \
  docker compose run --rm --no-deps demo-verify
```

Repeat with `DEMO_RUN_LABEL=after` for the tuned prompt, then compare:

```bash
docker compose run --rm --no-deps demo-compare
```

## What the Audience Sees

| Step | URL | Shows |
|------|-----|-------|
| 1. Landing | `/` | Evidra product overview |
| 2. Trigger | `/bench` | Select scenarios, start benchmark |
| 3. Progress | `/bench` | Real-time scenario execution overlay |
| 4. Evidence | `/evidence` | Tool calls with risk levels, verdicts |
| 5. Scorecard | `/evidence` | Reliability score, signal detections |
| 6. Leaderboard | `/lab/bench` | Model rankings, certification results |
| 7. Run detail | `/lab/bench/runs/{id}` | Timeline, transcript, tool calls |
| 8. Scenarios | `/lab/bench/scenarios` | 75 CKA-level scenario catalog |

## Cleanup

```bash
docker compose down -v --remove-orphans
kind delete cluster --name evidra-demo
```
