# evidra-kagent-bench

Benchmark harness for evaluating AI infrastructure agents using
[Evidra](https://github.com/vitas/evidra) reliability scoring.

Run kagent against real Kubernetes failure scenarios. Measure signal
detection, reliability scores, and behavioral improvement with different
agent prompts.

## Quick Start

```bash
# Set your LLM provider
export BIFROST_BASE_URL=https://api.groq.com/openai/v1
export BIFROST_API_KEY=your-key
export KAGENT_MODEL=llama-3.3-70b-versatile

# Run before/after comparison
DEMO_RUN_MODE=both ./demo/run.sh
```

## What It Does

1. Creates a Kind Kubernetes cluster with a broken deployment
2. Runs kagent (AI agent) to diagnose and fix it
3. Evidra records every tool call as evidence
4. Runs again with a tuned prompt
5. Compares reliability scores between runs

## Scenarios

- **broken-deployment** — bad image tag → ErrImagePull
- **repair-loop-escalation** — compounding failures (ConfigMap + image + replicas)

## Architecture

```
kagent → AgentGateway → evidra-mcp → Kind cluster
                              ↓ forward evidence
                         evidra-api → postgres
```

## Prerequisites

- Docker with Compose v2
- An OpenAI-compatible LLM API key (Groq, OpenRouter, Anthropic, Ollama)

## Documentation

- [Hackathon Demo Guide](docs/guides/hackathon-demo.md) — full walkthrough
- [Compose Reference](docs/guides/demo-compose.md) — service details

## License

Apache 2.0
