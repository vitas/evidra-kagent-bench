#!/bin/sh
set -eu

evidra_base="${EVIDRA_BASE_URL:-http://evidra-api:8080}"
api_key="${EVIDRA_API_KEY:-dev-api-key}"
run_label="${DEMO_RUN_LABEL:-before}"
case_name="${DEMO_CASE:-broken-deployment}"

header() { printf '\n\033[1;36m%s\033[0m\n' "$1"; }
ok()     { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn()   { printf '  \033[33m⚠\033[0m %s\n' "$1"; }
fail()   { printf '  \033[31m✗\033[0m %s\n' "$1"; }
dim()    { printf '  \033[90m%s\033[0m\n' "$1"; }

printf '\033[1;37m'
printf '╔══════════════════════════════════════════════════╗\n'
printf '║          Evidra Evidence Report                  ║\n'
printf '╚══════════════════════════════════════════════════╝\n'
printf '\033[0m'
printf '  Scenario: %s | Run: %s\n' "$case_name" "$run_label"

# --- Evidence entries ---
header "Evidence Chain"
entries_json="$(curl -fsS -H "Authorization: Bearer $api_key" \
  "$evidra_base/v1/evidence/entries?limit=100")"
total="$(printf '%s' "$entries_json" | jq '.total')"
prescribe_count="$(printf '%s' "$entries_json" | jq '[.entries[] | select(.type == "prescribe")] | length')"
report_count="$(printf '%s' "$entries_json" | jq '[.entries[] | select(.type == "report")] | length')"
actors="$(printf '%s' "$entries_json" | jq -r '[.entries[].actor] | unique | join(", ")')"

dim "$total entries recorded"
dim "$prescribe_count prescribe + $report_count report"
dim "actors: $actors"

# --- Tool calls timeline ---
header "Tool Calls"
printf '%s' "$entries_json" | jq -r '
  .entries | sort_by(.created_at) | .[] |
  if .type == "prescribe" then
    "  \u001b[34m→ prescribe\u001b[0m " + .created_at[11:19] + " " + (.tool // "-") + " " + (.operation // "") + " " + (.scope // "")
  elif .type == "report" then
    if (.verdict // "") == "success" then
      "  \u001b[32m← report  \u001b[0m " + .created_at[11:19] + " " + (.verdict // "-")
    else
      "  \u001b[31m← report  \u001b[0m " + .created_at[11:19] + " " + (.verdict // "-")
    end
  else
    "  " + .type + " " + .created_at[11:19]
  end
' 2>/dev/null || dim "(timeline not available — entry format may differ)"

# --- Scorecard ---
header "Reliability Scorecard"
scorecard="$(curl -fsS -H "Authorization: Bearer $api_key" \
  "$evidra_base/v1/evidence/scorecard" || true)"

if [ -n "$scorecard" ] && printf '%s' "$scorecard" | jq -e '.score' >/dev/null 2>&1; then
  score="$(printf '%s' "$scorecard" | jq -r '.score')"
  band="$(printf '%s' "$scorecard" | jq -r '.band')"
  basis="$(printf '%s' "$scorecard" | jq -r '.basis')"
  total_ops="$(printf '%s' "$scorecard" | jq -r '.total_entries')"

  if [ "$score" = "-1" ]; then
    dim "Score: insufficient data ($total_ops operations, need more for confidence)"
  else
    case "$band" in
      excellent|good) ok "Score: $score / 100 ($band)" ;;
      fair)           warn "Score: $score / 100 ($band)" ;;
      *)              fail "Score: $score / 100 ($band)" ;;
    esac
  fi

  # Signals
  header "Behavioral Signals"
  printf '%s' "$scorecard" | jq -r '
    .signal_summary | to_entries[] |
    if .value.detected then
      if .value.count > 2 then
        "  \u001b[31m✗ " + .key + "\u001b[0m  count=" + (.value.count | tostring) + "  weight=" + (.value.weight | tostring)
      else
        "  \u001b[33m⚠ " + .key + "\u001b[0m  count=" + (.value.count | tostring) + "  weight=" + (.value.weight | tostring)
      end
    else
      "  \u001b[32m✓ " + .key + "\u001b[0m  clean"
    end
  '
else
  dim "Scorecard not available"
fi

# --- Summary ---
header "Summary"
detected="$(printf '%s' "$scorecard" | jq '[.signal_summary | to_entries[] | select(.value.detected)] | length' 2>/dev/null || echo 0)"
clean="$(printf '%s' "$scorecard" | jq '[.signal_summary | to_entries[] | select(.value.detected | not)] | length' 2>/dev/null || echo 0)"
dim "$total operations | $detected signals detected | $clean signals clean"

printf '\n'
