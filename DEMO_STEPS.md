# Demo Steps

## Prerequisites

- Docker with Compose v2
- At least one LLM provider API key (DeepSeek, OpenAI, Anthropic, or Gemini)

## Setup (one-time)

```bash
# 1. Configure credentials
cp .env.example .env
# Edit .env — set at least one provider key (e.g. DEEPSEEK_API_KEY)

# 2. Create Kind cluster
docker compose build kind-bootstrap
docker compose run --rm kind-bootstrap
```

## Boot the Stack

```bash
docker compose up -d
```

Wait ~15 seconds for bench-cli to sync scenarios and all services to become healthy.

Open **http://localhost:28080/lab** — single URL for everything.

API key for authenticated pages: **`dev-api-key`**

## Demo Walkthrough

### Step 1: Open the Run page

Navigate to [localhost:28080/lab/run](http://localhost:28080/lab/run)

This is where you select scenarios and trigger benchmark runs.

### Step 2: Trigger a scenario

1. Select a model from the dropdown (e.g. `deepseek-chat`)
2. Check the `broken-deployment` scenario
3. Click **Run Benchmark**

### Step 3: Watch progress

Navigate to [localhost:28080/bench](http://localhost:28080/bench)

Enter API key: `dev-api-key`

The progress overlay shows scenario status in real-time:
- ⏳ pending → 🔄 running → ✅ passed / ❌ failed

### Step 4: View evidence chain

Navigate to [localhost:28080/evidence](http://localhost:28080/evidence)

Shows the evidence chain:
- Every `run_command` call with mutation detection
- `prescribe_smart` with risk assessment
- `report` with verdict
- Tool name, resource identity, risk level

### Step 5: View certification results

Navigate to [localhost:28080/lab/bench](http://localhost:28080/lab/bench)

Shows the model leaderboard:
- Pass rate, cost per pass, duration
- "Most Reliable", "Best Value", "Fastest" rankings
- Drill into individual runs at [/lab/bench/runs](http://localhost:28080/lab/bench/runs)

### Step 6: Browse scenario catalog

Navigate to [localhost:28080/lab/bench/scenarios](http://localhost:28080/lab/bench/scenarios)

75 scenarios across two certification exams: CKA/CKS (Kubernetes, Helm, ArgoCD) and Terraform.
Judges can see the full exam scope here.

## What the Audience Sees

| Step | URL | Shows |
|------|-----|-------|
| 1. Landing | [/lab](http://localhost:28080/lab) | Bench overview |
| 2. Run | [/lab/run](http://localhost:28080/lab/run) | Select model + scenarios, trigger run |
| 3. Progress | [/bench](http://localhost:28080/bench) | Real-time scenario execution |
| 4. Evidence | [/evidence](http://localhost:28080/evidence) | Tool calls with risk levels, verdicts |
| 5. Leaderboard | [/lab/bench](http://localhost:28080/lab/bench) | Model rankings, certification results |
| 6. Run detail | [/lab/bench/runs](http://localhost:28080/lab/bench/runs) | Timeline, transcript, tool calls |
| 7. Compare | [/lab/bench/compare](http://localhost:28080/lab/bench/compare) | Side-by-side model comparison |
| 8. Scenarios | [/lab/bench/scenarios](http://localhost:28080/lab/bench/scenarios) | 75 scenario catalog (CKA/CKS + Terraform) |

## Cleanup

```bash
docker compose down -v --remove-orphans
kind delete cluster --name evidra-demo
```
