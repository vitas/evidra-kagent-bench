#!/bin/sh
set -eu

evidra_base="${EVIDRA_BASE_URL:-http://evidra-api:8080}"
api_key="${EVIDRA_API_KEY:-}"
artifacts_dir="${DEMO_ARTIFACTS_DIR:-/artifacts}"

if [ -z "$api_key" ]; then
  echo "EVIDRA_API_KEY is required" >&2
  exit 1
fi

before_id_file="${artifacts_dir}/before/bench_run_id"
after_id_file="${artifacts_dir}/after/bench_run_id"

if [ ! -f "$before_id_file" ] || [ ! -f "$after_id_file" ]; then
  echo "bench run IDs not found — skipping comparison"
  exit 0
fi

run_a="$(cat "$before_id_file")"
run_b="$(cat "$after_id_file")"

echo "comparing bench runs: before=$run_a after=$run_b"

compare_json="$(curl -fsS \
  -H "Authorization: Bearer $api_key" \
  "$evidra_base/v1/bench/compare/runs?a=${run_a}&b=${run_b}")"

printf '%s\n' "$compare_json" > "${artifacts_dir}/bench_compare.json"

passed_a="$(printf '%s' "$compare_json" | jq -r '.run_a.passed')"
passed_b="$(printf '%s' "$compare_json" | jq -r '.run_b.passed')"
checks_diff="$(printf '%s' "$compare_json" | jq -r '.delta.checks_passed_diff')"
passed_changed="$(printf '%s' "$compare_json" | jq -r '.delta.passed_changed')"

echo "========================================="
echo "  Bench Run Comparison"
echo "========================================="
echo "  before: passed=$passed_a"
echo "  after:  passed=$passed_b"
echo "  delta:  checks_passed_diff=$checks_diff passed_changed=$passed_changed"
echo "========================================="
echo "full comparison: ${artifacts_dir}/bench_compare.json"
