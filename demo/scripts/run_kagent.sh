#!/bin/sh
set -eu

artifacts_dir="${DEMO_ARTIFACTS_DIR:-/artifacts}"
run_label="${DEMO_RUN_LABEL:-before}"
mode_artifacts_dir="${artifacts_dir}/${run_label}"
before_artifacts_dir="${DEMO_ARTIFACTS_DIR:-/artifacts}/before"
after_artifacts_dir="${DEMO_ARTIFACTS_DIR:-/artifacts}/after"
agentgateway_base="${AGENTGATEWAY_BASE_URL:-http://agentgateway:3000}"
kagent_service_url="${KAGENT_SERVICE_URL:-http://kagent:8080}"
case_name="${DEMO_CASE:-broken-deployment}"
prompt_root="${KAGENT_PROMPTS_DIR:-/demo/prompts}"
selected_prompt="${KAGENT_SYSTEM_PROMPT_FILE:-}"
runner_mode="${KAGENT_RUNNER_MODE:-auto}"
resolved_runner_mode="$runner_mode"

mkdir -p "$before_artifacts_dir" "$after_artifacts_dir" "$mode_artifacts_dir"

if [ -z "$selected_prompt" ]; then
  case "$run_label" in
    before)
      selected_prompt="${prompt_root}/kagent-before.md"
      ;;
    after)
      selected_prompt="${prompt_root}/kagent-after.md"
      ;;
    *)
      selected_prompt="${prompt_root}/kagent-before.md"
      ;;
  esac
fi

printf '%s\n' "$selected_prompt" > "$mode_artifacts_dir/prompt_file"
if [ -f "$selected_prompt" ]; then
  cp "$selected_prompt" "$mode_artifacts_dir/prompt.md"
fi

extract_mcp_json() {
  input_file="$1"
  output_file="$2"

  if grep -q '^data: ' "$input_file"; then
    awk '/^data: /{sub(/^data: /, ""); print}' "$input_file" | tail -n 1 > "$output_file"
  else
    cp "$input_file" "$output_file"
  fi
}

scenario_task() {
  case "$case_name" in
    broken-deployment)
      cat <<'EOF'
The deployment "web" in namespace "demo" is unhealthy. Investigate the Kubernetes resources in namespace demo, repair the problem, and verify the workload is healthy before you stop.
EOF
      ;;
    repair-loop-escalation)
      cat <<'EOF'
The "web" service in namespace "bench" is degraded after a rollout. Investigate the Kubernetes resources in namespace bench, repair the issue, and verify the user-visible service is healthy before you stop.
EOF
      ;;
    *)
      echo "unsupported DEMO_CASE: $case_name" >&2
      exit 1
      ;;
  esac
}

run_direct_mcp_fallback() {
  printf '%s\n' "$run_label" > "$mode_artifacts_dir/run_label"

  headers="$(mktemp)"
  body="$(mktemp)"
  body_json="$(mktemp)"
  call_body="$(mktemp)"
  call_body_json="$(mktemp)"
  cleanup() {
    rm -f "$headers" "$body" "$body_json" "$call_body" "$call_body_json"
  }
  trap cleanup EXIT

  attempt=0
  until curl -fsS -D "$headers" -o "$body" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    "$agentgateway_base/mcp/http" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"private-demo","version":"0.1.0"}}}'
  do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      echo "AgentGateway initialize did not become ready" >&2
      exit 1
    fi
    sleep 1
  done

  session_id="$(awk 'tolower($1)=="mcp-session-id:"{print $2}' "$headers" | tr -d '\r')"
  if [ -z "$session_id" ]; then
    echo "missing Mcp-Session-Id header from initialize response" >&2
    exit 1
  fi
  printf '%s\n' "$session_id" > "$mode_artifacts_dir/mcp_session_id"

  extract_mcp_json "$body" "$body_json"
  jq -e '.result.protocolVersion' "$body_json" >/dev/null

  curl -fsS -o "$call_body" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H "Mcp-Session-Id: $session_id" \
    "$agentgateway_base/mcp/http" \
    -d "$(jq -cn --arg case_name "$case_name" '
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "scale_deployment",
          arguments: {
            name: "web",
            replicas: 1,
            namespace: (if $case_name == "repair-loop-escalation" then "bench" else "demo" end)
          }
        }
      }
    ')"

  extract_mcp_json "$call_body" "$call_body_json"
  jq -e '.result' "$call_body_json" >/dev/null
  cp "$call_body_json" "$mode_artifacts_dir/tools_call_response.json"
  echo "fallback runner executed scale_deployment via AgentGateway for $run_label"
}

run_kagent_service() {
  task_file="$mode_artifacts_dir/task.txt"
  response_file="$mode_artifacts_dir/kagent_response.json"
  card_file="$mode_artifacts_dir/kagent_agent_card.json"
  message_id="$(cat /proc/sys/kernel/random/uuid)"

  scenario_task > "$task_file"

  attempt=0
  until curl -fsS "$kagent_service_url/health" >/dev/null 2>/dev/null
  do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
      echo "kagent service did not become healthy" >&2
      exit 1
    fi
    sleep 1
  done

  curl -fsS "$kagent_service_url/.well-known/agent-card.json" > "$card_file"
  jq -e '.name == "demoagent"' "$card_file" >/dev/null

  curl -fsS \
    -H 'Content-Type: application/json' \
    "$kagent_service_url/" \
    -d "$(jq -cn --arg message_id "$message_id" --rawfile task "$task_file" '
      {
        jsonrpc: "2.0",
        id: "private-demo",
        method: "message/send",
        params: {
          message: {
            kind: "message",
            messageId: $message_id,
            role: "user",
            parts: [
              {
                kind: "text",
                text: ($task | rtrimstr("\n"))
              }
            ]
          }
        }
      }
    ')" > "$response_file"

  jq -e '.result.id and .result.contextId' "$response_file" >/dev/null
  jq -r '.result.id' "$response_file" > "$mode_artifacts_dir/kagent_task_id"
  jq -r '.result.contextId' "$response_file" > "$mode_artifacts_dir/kagent_context_id"
  jq -e '.result.status.state != "failed"' "$response_file" >/dev/null
  echo "kagent service completed run $run_label"
}

if [ -n "${KAGENT_RUNNER_COMMAND:-}" ]; then
  export KAGENT_SYSTEM_PROMPT_FILE="$selected_prompt"
  export KAGENT_MODEL="${KAGENT_MODEL:-qwen-plus}"
  export OPENAI_BASE_URL="${BIFROST_BASE_URL:-}"
  export OPENAI_API_KEY="${BIFROST_API_KEY:-}"
  exec /bin/sh -lc "$KAGENT_RUNNER_COMMAND"
fi

if [ "$runner_mode" = "auto" ]; then
  if [ -n "${BIFROST_BASE_URL:-}" ] && [ -n "${BIFROST_API_KEY:-}" ]; then
    resolved_runner_mode="service"
  else
    resolved_runner_mode="direct-mcp"
  fi
fi

printf '%s\n' "$resolved_runner_mode" > "$mode_artifacts_dir/resolved_runner_mode"

case "$resolved_runner_mode" in
  service)
    run_kagent_service
    ;;
  direct-mcp)
    run_direct_mcp_fallback
    ;;
  *)
    echo "unsupported KAGENT_RUNNER_MODE: $runner_mode" >&2
    exit 1
    ;;
esac
