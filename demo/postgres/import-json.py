#!/usr/bin/env python3
"""Convert bench JSON exports to seed SQL."""
import json
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_JSON = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/git/evidra-bench/runs/export/bench-scenarios.json")
RUNS_JSON = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/git/evidra-bench/runs/export/demo-runs.json")
OUTPUT = os.path.join(SCRIPT_DIR, "seed-data.sql")


def q(v):
    """SQL-quote a value."""
    if v is None:
        return "NULL"
    s = str(v).replace("'", "''")
    return f"'{s}'"


def n(v, default=0):
    """Numeric value."""
    return str(v) if v is not None else str(default)


def b(v):
    """Boolean value."""
    return "true" if v else "false"


with open(SCENARIOS_JSON) as f:
    scenarios = json.load(f)

with open(RUNS_JSON) as f:
    runs = json.load(f)

with open(OUTPUT, "w") as out:
    out.write("-- Auto-generated seed data from bench JSON exports.\n")
    out.write("-- Idempotent: ON CONFLICT DO NOTHING / DO UPDATE.\n")
    out.write("SET client_min_messages = warning;\n\n")

    # Scenarios
    out.write(f"-- Scenarios ({len(scenarios)})\n")
    for s in scenarios:
        out.write(
            f"INSERT INTO bench_scenarios (id, category, title, track, level, tags, chaos, evidra_enabled) "
            f"VALUES ({q(s.get('id'))}, {q(s.get('category',''))}, {q(s.get('title',''))}, "
            f"{q(s.get('track',''))}, {q(s.get('level',''))}, {q(s.get('tags',''))}, "
            f"{b(s.get('chaos'))}, {b(s.get('evidra'))}) "
            f"ON CONFLICT (id) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, "
            f"track=EXCLUDED.track, level=EXCLUDED.level, tags=EXCLUDED.tags, "
            f"chaos=EXCLUDED.chaos, evidra_enabled=EXCLUDED.evidra_enabled;\n"
        )

    # Runs
    out.write(f"\n-- Runs ({len(runs)})\n")
    for r in runs:
        out.write(
            f"INSERT INTO bench_runs (id, tenant_id, scenario_id, model, provider, adapter, "
            f"evidence_mode, passed, duration_seconds, exit_code, turns, memory_window, "
            f"prompt_tokens, completion_tokens, estimated_cost_usd, checks_passed, checks_total, "
            f"checks_json, metadata_json, created_at, tool_server, tool_server_version, scenario_version) "
            f"VALUES ({q(r.get('id'))}, 'default', {q(r.get('scenario_id'))}, "
            f"{q(r.get('model'))}, {q(r.get('provider',''))}, {q(r.get('adapter','bench-cli'))}, "
            f"{q(r.get('evidence_mode','none'))}, {b(r.get('passed'))}, "
            f"{n(r.get('duration_seconds',0))}, {n(r.get('exit_code',0))}, "
            f"{n(r.get('turns',0))}, {n(r.get('memory_window',-1))}, "
            f"{n(r.get('prompt_tokens',0))}, {n(r.get('completion_tokens',0))}, "
            f"{n(r.get('estimated_cost_usd',0))}, {n(r.get('checks_passed',0))}, "
            f"{n(r.get('checks_total',0))}, {q(r.get('checks_json',''))}, "
            f"{q(r.get('metadata_json',''))}, {q(r.get('created_at','2026-03-29T00:00:00Z'))}, "
            f"{q(r.get('tool_server',''))}, {q(r.get('tool_server_version',''))}, "
            f"{q(r.get('scenario_version',''))}) ON CONFLICT (id) DO NOTHING;\n"
        )

lines = sum(1 for _ in open(OUTPUT))
print(f"Written {OUTPUT} ({lines} lines)")
print(f"  Scenarios: {len(scenarios)}")
print(f"  Runs: {len(runs)}")

# Summary by model
from collections import Counter
model_counts = Counter(r['model'] for r in runs)
model_passed = Counter(r['model'] for r in runs if r.get('passed'))
for model in sorted(model_counts, key=model_counts.get, reverse=True):
    total = model_counts[model]
    passed = model_passed.get(model, 0)
    print(f"  {model}: {total} runs, {passed} passed ({100*passed//total}%)")
