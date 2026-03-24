#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

compose=(docker compose -f docker-compose.yml)
run_mode="${DEMO_RUN_MODE:-before}"

# Default paired artifact layout:
# /artifacts/before
# /artifacts/after

run_single_mode() {
  local mode="$1"

  # "after" run gets prescribe_smart + report tools; "before" uses defaults only
  local tool_list=""
  if [ "$mode" = "after" ]; then
    tool_list="run_command,collect_diagnostics,prescribe_smart,report,get_event"
  fi

  DEMO_RUN_LABEL="$mode" "${compose[@]}" run --rm --no-deps demo-seed
  DEMO_RUN_LABEL="$mode" KAGENT_TOOL_ALLOW_LIST="$tool_list" "${compose[@]}" up -d --force-recreate kagent
  DEMO_RUN_LABEL="$mode" "${compose[@]}" run --rm --no-deps kagent-runner
  DEMO_RUN_LABEL="$mode" "${compose[@]}" run --rm --no-deps demo-verify
}

"${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true

docker build -t evidra-demo-runtime:local -f demo/runtime/Dockerfile .
"${compose[@]}" build kind-bootstrap kagent
"${compose[@]}" up -d postgres evidra-api evidra-mcp
"${compose[@]}" run --rm kind-bootstrap
"${compose[@]}" up -d agentgateway

case "$run_mode" in
  before|after)
    run_single_mode "$run_mode"
    ;;
  both)
    run_single_mode before
    run_single_mode after
    "${compose[@]}" run --rm --no-deps demo-compare
    ;;
  *)
    echo "DEMO_RUN_MODE must be one of: before, after, both" >&2
    exit 1
    ;;
esac
