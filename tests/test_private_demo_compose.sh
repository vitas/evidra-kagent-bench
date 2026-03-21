#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

compose_file="docker-compose.yml"

[ -f "$compose_file" ] \
  || fail "missing $compose_file"

for service in \
  postgres \
  evidra-api \
  mcp-backend \
  bridge \
  otel-collector \
  agentgateway \
  kagent \
  kind-bootstrap \
  demo-seed \
  kagent-runner \
  demo-verify \
  demo-compare
do
  grep -Eq "^[[:space:]]{2}${service}:" "$compose_file" \
    || fail "missing service $service in $compose_file"
done

for path in \
  demo/agentgateway/config.yaml \
  demo/otel-collector/config.yaml \
  demo/kind/kind-config.yaml \
  demo/bridge/Dockerfile \
  demo/kagent/Dockerfile \
  demo/kagent/pyproject.toml \
  demo/kagent/demoagent/__init__.py \
  demo/kagent/demoagent/agent.py \
  demo/kagent/demoagent/agent-card.json \
  demo/kagent/demoagent/mcp_tools.py \
  demo/runtime/Dockerfile \
  demo/run_private_demo.sh \
  demo/scripts/kind_bootstrap.sh \
  demo/scripts/kind_teardown.sh \
  demo/scripts/seed_case.sh \
  demo/scripts/run_kagent.sh \
  demo/scripts/verify_run.sh \
  demo/scripts/compare_runs.sh \
  docs/guides/private-demo-compose.md \
  demo/manifests/broken-deployment/baseline.yaml \
  demo/manifests/broken-deployment/break.yaml \
  demo/manifests/repair-loop-escalation/baseline.yaml \
  demo/manifests/repair-loop-escalation/break.yaml
do
  [ -f "$path" ] || fail "missing $path"
done

grep -Fq 'repair-loop-escalation' demo/scripts/seed_case.sh \
  || fail "seed script should support repair-loop-escalation"

grep -Fq 'repair-loop-escalation' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention repair-loop-escalation"

for path in \
  demo/prompts/kagent-before.md \
  demo/prompts/kagent-after.md
do
  [ -f "$path" ] || fail "missing $path"
done

grep -Fq 'qwen-plus' demo/.env.demo.example \
  || fail "demo env example should mention qwen-plus"

grep -Fq 'BIFROST_BASE_URL' demo/.env.demo.example \
  || fail "demo env example should mention BIFROST_BASE_URL"

grep -Fq 'kagent-before.md' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention kagent-before.md"

grep -Fq 'kagent-after.md' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention kagent-after.md"

grep -Fq '25-30 seconds' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention kagent startup latency"

grep -Fq 'source-build workaround' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention the kagent source-build workaround"

[ -x demo/run_private_demo.sh ] \
  || fail "demo/run_private_demo.sh should be executable"

[ -f demo/.env.demo.example ] \
  || fail "missing demo/.env.demo.example"

grep -Eq '^[[:space:]]+pgdata:' "$compose_file" \
  || fail "postgres should use a named pgdata volume"

grep -Eq '^[[:space:]]+- pgdata:/var/lib/postgresql/data' "$compose_file" \
  || fail "postgres should mount pgdata"

grep -Eq '^[[:space:]]+evidra-api:' "$compose_file" \
  || fail "missing evidra-api block"

grep -Eq '^[[:space:]]+depends_on:' "$compose_file" \
  || fail "evidra-api should declare depends_on"

grep -Eq '^[[:space:]]+postgres:' "$compose_file" \
  || fail "compose should include postgres references"

grep -Fq 'DATABASE_URL=postgres://evidra:evidra@postgres:5432/evidra?sslmode=disable' "$compose_file" \
  || fail "evidra-api should target postgres service"

grep -Fq 'EVIDRA_BASE_URL=http://evidra-api:8080' "$compose_file" \
  || fail "bridge should target evidra-api"

grep -Fq 'EVIDRA_API_KEY=${EVIDRA_API_KEY:-dev-api-key}' "$compose_file" \
  || fail "bridge should use demo api key env"

grep -Fq './demo/agentgateway/config.yaml:/etc/agentgateway/config.yaml:ro' "$compose_file" \
  || fail "agentgateway should mount its config"

grep -Eq 'image:.*evidra-agentgateway-bridge' "$compose_file" \
  || fail "bridge should reference the bridge image"

grep -Fq 'image: evidra-demo-runtime:local' "$compose_file" \
  || fail "demo jobs should use the shared demo runtime image"

grep -Fq 'context: ./demo/kagent' "$compose_file" \
  || fail "kagent should build from the checked-in demo agent context"

grep -Fq 'dockerfile: Dockerfile' "$compose_file" \
  || fail "kagent should use the checked-in demo agent Dockerfile"

grep -Fq 'KAGENT_SYSTEM_PROMPT_FILE=/demo/prompts/kagent-${DEMO_RUN_LABEL:-before}.md' "$compose_file" \
  || fail "kagent should read the mode-specific system prompt"

grep -Fq 'KAGENT_URL=http://unused.local' "$compose_file" \
  || fail "local kagent service should set a placeholder KAGENT_URL"

grep -Fq 'curl -fsS http://127.0.0.1:8080/health >/dev/null' "$compose_file" \
  || fail "kagent should declare a local healthcheck"

grep -Fq 'image: ghcr.io/rohitg00/kubectl-mcp-server:latest' "$compose_file" \
  || fail "mcp-backend should use kubectl-mcp-server"

grep -Fq 'KUBECONFIG=/kube/config' "$compose_file" \
  || fail "mcp-backend should receive the shared kubeconfig path"

grep -Fq -- '--transport' "$compose_file" \
  || fail "mcp-backend should enable explicit transport selection"

grep -Fq 'streamable-http' "$compose_file" \
  || fail "mcp-backend should use streamable-http transport"

grep -Fq './demo/manifests:/demo/manifests:ro' "$compose_file" \
  || fail "demo jobs should mount demo manifests"

grep -Fq 'artifacts:/artifacts' "$compose_file" \
  || fail "demo jobs should share an artifacts volume"

grep -Fq 'kubeconfig:/kube' "$compose_file" \
  || fail "mcp-backend should mount the shared kubeconfig volume"

grep -Fq 'DEMO_RUN_LABEL=${DEMO_RUN_LABEL:-before}' "$compose_file" \
  || fail "demo jobs should receive the run label env"

grep -Fq '/var/run/docker.sock:/var/run/docker.sock' "$compose_file" \
  || fail "kind-bootstrap should mount the docker socket"

grep -Fq './demo/kind/kind-config.yaml:/demo/kind-config.yaml:ro' "$compose_file" \
  || fail "kind-bootstrap should mount the kind config"

grep -Fq 'kubeconfig:/kube' "$compose_file" \
  || fail "demo jobs should share a kubeconfig volume"

grep -Eq '^[[:space:]]+kubeconfig:' "$compose_file" \
  || fail "compose should define a kubeconfig volume"

grep -Eq '^[[:space:]]+artifacts:' "$compose_file" \
  || fail "compose should define an artifacts volume"

grep -Fq './demo/scripts/seed_case.sh:/demo/scripts/seed_case.sh:ro' "$compose_file" \
  || fail "demo-seed should mount its seed script"

grep -Fq './demo/scripts/run_kagent.sh:/demo/scripts/run_kagent.sh:ro' "$compose_file" \
  || fail "kagent-runner should mount its runner script"

grep -Fq './demo/scripts/verify_run.sh:/demo/scripts/verify_run.sh:ro' "$compose_file" \
  || fail "demo-verify should mount its verify script"

grep -Fq './demo/manifests:/demo/manifests:ro' "$compose_file" \
  || fail "demo jobs should mount demo manifests"

grep -Fq 'http://mcp-backend:3005/mcp' demo/agentgateway/config.yaml \
  || fail "AgentGateway should target the in-stack MCP backend"

grep -Fq 'kubectl-mcp-server' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention kubectl-mcp-server"

grep -Fq 'docker build -t evidra-demo-runtime:local' demo/run_private_demo.sh \
  || fail "wrapper should build the shared demo runtime image"

grep -Fq 'kagent' demo/run_private_demo.sh \
  || fail "wrapper should mention the kagent service"

for pattern in \
  'DEMO_RUN_MODE' \
  'before' \
  'after' \
  '/artifacts/before' \
  '/artifacts/after'
do
  grep -Fq "$pattern" demo/run_private_demo.sh demo/scripts/run_kagent.sh demo/scripts/verify_run.sh \
    || fail "paired mode support should include $pattern"
done

for pattern in \
  'message/send' \
  'messageId' \
  '.well-known/agent-card.json' \
  'kagent:8080'
do
  grep -Fq "$pattern" demo/scripts/run_kagent.sh \
    || fail "runner should include $pattern"
done

for pattern in \
  'resolved_runner_mode' \
  'runner_mode="${KAGENT_RUNNER_MODE:-auto}"' \
  'mode_artifacts_dir/resolved_runner_mode'
do
  grep -Fq "$pattern" demo/scripts/run_kagent.sh \
    || fail "runner should persist resolved mode information with $pattern"
done

for pattern in \
  'resolved_runner_mode' \
  'rollout status deployment/web -n demo' \
  'ImagePullBackOff'
do
  grep -Fq "$pattern" demo/scripts/verify_run.sh \
    || fail "verify script should distinguish real service remediation from fallback smoke using $pattern"
done

grep -Fq 'KAGENT_SYSTEM_PROMPT_FILE' demo/kagent/demoagent/agent.py \
  || fail "demo kagent agent should read KAGENT_SYSTEM_PROMPT_FILE"

grep -Fq 'StreamableHTTPConnectionParams' demo/kagent/demoagent/mcp_tools.py \
  || fail "demo kagent agent should use streamable HTTP MCP tools"

grep -Fq 'http://agentgateway:3000/mcp/http' demo/kagent/demoagent/mcp_tools.py \
  || fail "demo kagent MCP tools should target AgentGateway"

for pattern in \
  'docker compose -f docker-compose.yml' \
  'kind-bootstrap' \
  'demo-seed' \
  'kagent' \
  'kagent-runner' \
  'demo-verify' \
  'mcp-backend' \
  'bridge'
do
  grep -Fq "$pattern" docs/guides/private-demo-compose.md \
    || fail "private demo guide should mention $pattern"
done

for pattern in \
  'run --rm --no-deps demo-seed' \
  'run --rm --no-deps kagent-runner' \
  'run --rm --no-deps demo-verify'
do
  grep -Fq "$pattern" demo/run_private_demo.sh \
    || fail "wrapper should use $pattern"
done

# Verify demo uses real Evidra APIs (not invented endpoints).
grep -Fq 'demo-compare' demo/run_private_demo.sh \
  || fail "wrapper should run demo-compare in both mode"

grep -Fq '/v1/evidence/scorecard' demo/scripts/verify_run.sh \
  || fail "verify script should fetch scorecard"

grep -Fq '/v1/bench/runs' demo/scripts/verify_run.sh \
  || fail "verify script should submit bench runs via real API"

grep -Fq 'bench_run_id' demo/scripts/verify_run.sh \
  || fail "verify script should persist bench run ID"

grep -Fq 'session_id' demo/scripts/verify_run.sh \
  || fail "verify script should use session_id filter for entries"

grep -Fq '/v1/bench/compare/runs' demo/scripts/compare_runs.sh \
  || fail "compare script should use real bench compare API"

grep -Fq 'bench_run_id' demo/scripts/compare_runs.sh \
  || fail "compare script should read bench run IDs"

grep -Fq './demo/scripts/compare_runs.sh:/demo/scripts/compare_runs.sh:ro' "$compose_file" \
  || fail "demo-compare should mount its compare script"

grep -Fq 'demo-compare' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention demo-compare"

grep -Fq '/v1/bench/compare/runs' docs/guides/private-demo-compose.md \
  || fail "private demo guide should mention bench compare endpoint"

echo "PASS: test_private_demo_compose"
