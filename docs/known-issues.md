# Known Issues

## CRITICAL: LiteLLM Supply Chain Attack (v1.82.7+)

**Status:** Active threat — do NOT use litellm >= 1.82.7

LiteLLM v1.82.8 on PyPI contains a credential-stealing payload that
exfiltrates SSH keys, cloud creds, K8s configs, and API keys. The
maintainer account was compromised via the Trivy/KICS supply chain
attack chain.

**Mitigation:** The Dockerfile pins `litellm<1.82.7`. Do not remove
this pin until BerriAI confirms the compromised versions are yanked
and the maintainer account is secured.

**References:**
- [BerriAI/litellm#24512](https://github.com/BerriAI/litellm/issues/24512)

## ADK Tool Calling Bug (Fixed)

**Status:** Fix submitted — [google/adk-python#4985](https://github.com/google/adk-python/pull/4985)

Google ADK sets `litellm.add_function_to_prompt = True` globally,
forcing all models through text-based tool calling. This breaks
native function calling for Groq, OpenAI, and Anthropic — models
output XML tags instead of proper `tool_calls` JSON.

We proved the root cause (direct LiteLLM works, ADK-wrapped fails)
and submitted a one-line fix. The demo Dockerfile uses a patched
ADK fork until the fix is merged upstream.

**Issue:** [kagent-dev/kagent#1532](https://github.com/kagent-dev/kagent/issues/1532)
