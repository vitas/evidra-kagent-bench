# Dynamic Model Availability — Phased Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the bench UI show only models with configured API keys, and resolve credentials automatically in the trigger flow.

**Architecture:** This is a pre-SaaS implementation. Model availability is determined by platform env vars on evidra-api (not per-tenant credentials). The `GET /v1/bench/models` endpoint checks `os.Getenv(api_key_env)` at runtime and returns an `available` field. The trigger handler resolves provider from the model catalog. bench-cli reads LLM credentials from its own env vars, passed via docker-compose.

**Non-goal:** Per-tenant API key storage. Tenant provider endpoints are disabled pending encryption (see evidra-bench design doc).

**Repos:**
- `evidra` — API backend (queries, handlers, OpenAPI)
- `evidra-bench` — UI (Run.tsx model dropdown)
- `evidra-kagent-bench` — Docker Compose wiring, E2E tests

---

## Phase A: evidra-api — `available` field + credential resolution

All changes in `/Users/vitas/git/evidra`.

### Task A1: Extend EnabledModel with APIKeyEnv and APIBaseURL

**Files:**
- Modify: `internal/benchsvc/queries.go` (EnabledModel struct + ListEnabledModels query)
- Modify: `internal/benchsvc/queries_integration_test.go`

**Step 1: Update EnabledModel struct**

Add fields to the existing struct:

```go
type EnabledModel struct {
	ID                string  `json:"id"`
	DisplayName       string  `json:"display_name"`
	Provider          string  `json:"provider"`
	APIBaseURL        string  `json:"api_base_url"`
	APIKeyEnv         string  `json:"-"` // never exposed to clients
	InputCostPerMtok  float64 `json:"input_cost_per_mtok"`
	OutputCostPerMtok float64 `json:"output_cost_per_mtok"`
}
```

**Step 2: Update ListEnabledModels SQL to SELECT the new columns**

```sql
SELECT m.id, m.display_name, m.provider, m.api_base_url, m.api_key_env,
       m.input_cost_per_mtok, m.output_cost_per_mtok
FROM bench_models m
LEFT JOIN bench_tenant_providers tp
  ON tp.model_id = m.id AND tp.tenant_id = $1 AND tp.enabled = true
WHERE m.api_key_env != '' OR tp.tenant_id IS NOT NULL
ORDER BY m.provider, m.display_name
```

Update the `rows.Scan` call to scan all 7 fields.

**Step 3: Update integration tests**

Verify that the new fields are populated correctly.

**Step 4: `gofmt -w internal/benchsvc/queries.go`**

**Step 5: Run tests**

```bash
go test ./internal/benchsvc/ -count=1
go test -tags integration ./internal/benchsvc/ -count=1  # if DATABASE_URL set
```

**Step 6: Commit**

```bash
git add internal/benchsvc/queries.go internal/benchsvc/queries_integration_test.go
git commit -s -m "feat(benchsvc): add api_base_url and api_key_env to EnabledModel"
```

---

### Task A2: Add `available` field to handleListModels response

**Files:**
- Modify: `internal/benchsvc/handlers.go` (handleListModels)
- Modify: `internal/benchsvc/handlers_test.go`

**Step 1: Write failing test**

```go
func TestHandleListModels_IncludesAvailability(t *testing.T) {
	t.Parallel()
	// Set a test env var for one model.
	t.Setenv("TEST_API_KEY", "sk-test")

	repo := &handlerRepo{
		enabledModels: []EnabledModel{
			{ID: "model-a", DisplayName: "Model A", APIKeyEnv: "TEST_API_KEY"},
			{ID: "model-b", DisplayName: "Model B", APIKeyEnv: "MISSING_KEY"},
		},
	}
	svc := NewService(repo, ServiceConfig{})
	mux := http.NewServeMux()
	RegisterRoutes(mux, svc, passthroughAuth("t1"))

	req := httptest.NewRequest("GET", "/v1/bench/models", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	// Parse response and check available field.
	var resp struct {
		Models []struct {
			ID        string `json:"id"`
			Available bool   `json:"available"`
		} `json:"models"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if len(resp.Models) != 2 {
		t.Fatalf("len = %d, want 2", len(resp.Models))
	}
	if !resp.Models[0].Available {
		t.Fatal("model-a should be available (TEST_API_KEY is set)")
	}
	if resp.Models[1].Available {
		t.Fatal("model-b should not be available (MISSING_KEY is unset)")
	}
}
```

**Step 2: Update handleListModels**

```go
func handleListModels(svc *Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := auth.TenantID(r.Context())
		models, err := svc.ListEnabledModels(r.Context(), tenantID)
		if err != nil {
			apiutil.WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		type modelResponse struct {
			ID                string  `json:"id"`
			DisplayName       string  `json:"display_name"`
			Provider          string  `json:"provider"`
			APIBaseURL        string  `json:"api_base_url,omitempty"`
			Available         bool    `json:"available"`
			InputCostPerMtok  float64 `json:"input_cost_per_mtok"`
			OutputCostPerMtok float64 `json:"output_cost_per_mtok"`
		}

		result := make([]modelResponse, 0, len(models))
		for _, m := range models {
			result = append(result, modelResponse{
				ID:                m.ID,
				DisplayName:       m.DisplayName,
				Provider:          m.Provider,
				APIBaseURL:        m.APIBaseURL,
				Available:         os.Getenv(m.APIKeyEnv) != "",
				InputCostPerMtok:  m.InputCostPerMtok,
				OutputCostPerMtok: m.OutputCostPerMtok,
			})
		}
		apiutil.WriteJSON(w, http.StatusOK, map[string]any{"models": result})
	}
}
```

Add `"os"` to imports.

**Step 3: Run tests**

```bash
go test -run TestHandleListModels -count=1 ./internal/benchsvc/
```

**Step 4: Commit**

```bash
git add internal/benchsvc/handlers.go internal/benchsvc/handlers_test.go
git commit -s -m "feat(benchsvc): add available field to /v1/bench/models based on env var presence"
```

---

### Task A3: Extend ResolveModelProvider with APIKeyEnv

**Files:**
- Modify: `internal/benchsvc/queries.go` (ModelProviderInfo struct + ResolveModelProvider query)

**Step 1: Add APIKeyEnv to ModelProviderInfo**

```go
type ModelProviderInfo struct {
	Provider   string `json:"provider"`
	APIBaseURL string `json:"api_base_url"`
	APIKeyEnv  string `json:"-"`
}
```

**Step 2: Update query to SELECT api_key_env**

```go
err := s.db.QueryRow(ctx,
    `SELECT provider, api_base_url, api_key_env FROM bench_models WHERE id = $1`, modelID,
).Scan(&info.Provider, &info.APIBaseURL, &info.APIKeyEnv)
```

**Step 3: Validate API key in trigger handler**

In `trigger_handler.go`, after resolving the model, check that the key exists:

```go
// Resolve LLM credentials from environment.
if provider == "" {
    info, err := svc.ResolveModelProvider(r.Context(), req.Model)
    if err != nil {
        apiutil.WriteError(w, http.StatusBadRequest, "unknown model: "+req.Model)
        return
    }
    provider = info.Provider
    if os.Getenv(info.APIKeyEnv) == "" {
        apiutil.WriteError(w, http.StatusBadRequest, "no API key configured for model: "+req.Model)
        return
    }
}
```

**Step 4: Run tests, format, commit**

```bash
gofmt -w internal/benchsvc/queries.go internal/benchsvc/trigger_handler.go
go test ./internal/benchsvc/ -count=1
git add internal/benchsvc/queries.go internal/benchsvc/trigger_handler.go
git commit -s -m "feat(benchsvc): validate API key availability in trigger handler"
```

---

### Task A4: Update OpenAPI spec and API reference

**Files:**
- Modify: `cmd/evidra-api/static/openapi.yaml`
- Modify: `docs/api-reference.md`

Add `available` (boolean) and `api_base_url` (string) to the EnabledModel schema in OpenAPI.
Update api-reference.md response example for `GET /v1/bench/models`:

```json
{
  "models": [
    {
      "id": "gemini-2.5-flash",
      "display_name": "Gemini 2.5 Flash",
      "provider": "google",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
      "available": true,
      "input_cost_per_mtok": 0.15,
      "output_cost_per_mtok": 0.60
    }
  ]
}
```

**Commit:**

```bash
git add cmd/evidra-api/static/openapi.yaml docs/api-reference.md
git commit -s -m "docs(api): add available field to /v1/bench/models response"
```

---

### Task A5: Build and push evidra-api image

```bash
# Tag and push so kagent-bench picks up changes
git tag v0.5.14 -m "feat: dynamic model availability"
git push origin main --tags
# Wait for CI to build ghcr.io/vitas/evidra-api:latest
```

---

## Phase B: evidra-kagent-bench — Docker Compose wiring

All changes in `/Users/vitas/git/evidra-kagent-bench`.

### Task B1: Pass provider API keys to evidra-api container

**Files:**
- Modify: `docker-compose.yml` (evidra-api environment block)

Add LLM provider keys to the evidra-api service environment:

```yaml
evidra-api:
  environment:
    # ... existing vars ...
    # LLM provider API keys — models with a set key appear as available.
    - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
    - OPENAI_API_KEY=${OPENAI_API_KEY:-}
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    - GEMINI_API_KEY=${GEMINI_API_KEY:-}
    - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY:-}
```

**Commit:**

```bash
git add docker-compose.yml
git commit -s -m "feat: pass LLM provider API keys to evidra-api for model availability"
```

---

### Task B2: Pass provider API keys to bench-cli container

**Files:**
- Modify: `docker-compose.yml` (bench-cli environment block)

bench-cli resolves credentials from its own env vars (`EVIDRA_BIFROST_BASE_URL`, `EVIDRA_BIFROST_AUTH_BEARER`). For each provider's models, bench-cli needs the right env vars.

```yaml
bench-cli:
  environment:
    # ... existing vars ...
    # LLM credentials for scenario execution.
    # bench-cli uses EVIDRA_BIFROST_BASE_URL + EVIDRA_BIFROST_AUTH_BEARER for all providers
    # via the Bifrost (OpenAI-compatible) adapter.
    - EVIDRA_BIFROST_BASE_URL=${LLM_BASE_URL:-}
    - EVIDRA_BIFROST_AUTH_BEARER=${LLM_API_KEY:-}
```

Note: bench-cli uses Bifrost provider which is OpenAI-compatible. The base URL and bearer token must match the model's provider API. For multi-provider support, this will need the contract extension (Phase C).

**Commit:**

```bash
git add docker-compose.yml
git commit -s -m "feat: pass LLM credentials to bench-cli for scenario execution"
```

---

### Task B3: Update .env.example with named provider keys

**Files:**
- Modify: `.env.example`

```env
EVIDRA_API_KEY=dev-api-key
DEMO_CLUSTER_NAME=evidra-demo
DEMO_EVIDRA_API_PORT=28080
DEMO_AGENTGATEWAY_PORT=23000
KAGENT_MODEL=deepseek-chat

# LLM provider keys — uncomment and set for providers you want to benchmark.
# Models with a configured key appear as "available" in the bench UI.
# DEEPSEEK_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# GEMINI_API_KEY=
# DASHSCOPE_API_KEY=

# Legacy — for direct kagent/bench-cli usage.
LLM_BASE_URL=
LLM_API_KEY=
```

**Important:** Do NOT include real API keys in example files or plan docs.

**Commit:**

```bash
git add .env.example
git commit -s -m "docs: add named provider keys to .env.example"
```

---

### Task B4: Update bench-ui to filter by `available`

**Files:**
- Modify: `../evidra-bench/ui/src/hooks/useModels.ts`
- Modify: `../evidra-bench/ui/src/types/models.ts`

The UI already fetches from `GET /v1/bench/models`. Update the type to include `available` and filter to show only available models:

In `types/models.ts`, add:
```typescript
export interface EnabledModel {
  id: string;
  display_name: string;
  provider: string;
  api_base_url?: string;
  available: boolean;  // <-- new
  input_cost_per_mtok: number;
  output_cost_per_mtok: number;
}
```

In `useModels.ts`, filter by available:
```typescript
.then((res) => {
  const available = res.models.filter((m) => m.available);
  setModels(available.length > 0 ? available : FALLBACK_MODELS);
})
```

**Commit (in evidra-bench repo):**

```bash
git add ui/src/types/models.ts ui/src/hooks/useModels.ts
git commit -s -m "feat(ui): filter models by availability from API"
```

---

## Phase C: Credential pass-through via executor contract (future)

**Not implemented now.** This phase extends the executor contract to v1.1.0 so evidra-api can pass resolved API credentials to bench-cli per-job.

Required when:
- Multiple providers need different base URLs (e.g. DeepSeek + OpenAI in same deployment)
- Per-tenant credentials are enabled (SaaS)

Changes needed:
1. Add `api_base_url` and `llm_api_key` to `certifyRequest` (evidra-api remote_executor.go)
2. Add same fields to `CertifyRequest` (bench-cli serve.go)
3. bench-cli: override `EVIDRA_BIFROST_BASE_URL` and `EVIDRA_BIFROST_AUTH_BEARER` from request
4. Bump `ExecutorContractVersion` to `v1.1.0`
5. Both images must be rebuilt and deployed together

---

## Verification

### Smoke test (after Phase A + B)

```bash
# 1. Pull latest evidra-api image (after Phase A CI completes)
docker compose pull evidra-api

# 2. Set one provider key in .env
echo "DEEPSEEK_API_KEY=sk-your-key" >> .env

# 3. Start the stack
docker compose up -d

# 4. Check model availability via traefik (port 28080, not direct to evidra-api)
curl -H "Authorization: Bearer dev-api-key" \
  http://localhost:28080/v1/bench/models | jq '.models[] | {id, available}'

# Expected: deepseek-chat has available=true, others available=false

# 5. Open http://localhost:28080/lab/run — verify dropdown shows only DeepSeek

# 6. Add another key, restart
echo "GEMINI_API_KEY=your-key" >> .env
docker compose up -d evidra-api
# Verify Gemini model now appears as available
```

### Limitation

With Phase A+B only, bench-cli uses a single set of LLM credentials (`LLM_BASE_URL` + `LLM_API_KEY`). If DeepSeek is shown as available in the UI but bench-cli is configured for a different provider, the run will fail. Multi-provider credential routing requires Phase C.

---

## Dependency graph

```
Phase A (evidra repo)
  A1 → A2 (needs updated struct)
  A1 → A3 (needs APIKeyEnv field)
  A2 + A3 → A4 (docs)
  A4 → A5 (tag + publish image)

Phase B (kagent-bench + evidra-bench repos)
  A5 → B1 (needs new image)
  B1 → B2 (same compose file)
  B2 → B3 (env docs)
  B1 → B4 (UI needs available field)

Phase C (future — both repos)
  Requires Phase A+B complete
  Contract v1.1.0 coordination
```
