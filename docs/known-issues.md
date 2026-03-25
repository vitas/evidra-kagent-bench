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
- [Supply chain analysis](https://futuresearch.ai/blog/litellm-pypi-supply-chain-attack/)

## ADK Tool Calling Fails with Groq Llama

**Status:** Open — filed as [kagent-dev/kagent#1532](https://github.com/kagent-dev/kagent/issues/1532)

**Impact:** kagent cannot execute MCP tool calls when using Groq's
llama-3.3-70b-versatile model. The agent receives the task but fails
to call any tools, making it unable to interact with Kubernetes.

**Root cause:** Google ADK's `LiteLlm` adapter converts MCP tool schemas
through `FunctionDeclaration` and structures messages in a way that
makes the model fall back to XML-style tool calling (`<function=name
{...} </function>`) instead of proper OpenAI `tool_calls` JSON. Groq
rejects the malformed output with `tool_use_failed`.

**Key finding:** LiteLLM itself works correctly. A direct `litellm.completion()`
call inside the same kagent container with the same model and same tool
schema returns proper `tool_calls` JSON. The bug is in ADK, not LiteLLM
or Groq.

**Proof:**
```python
# Works (direct LiteLLM):
litellm.completion(model="groq/llama-3.3-70b-versatile", tools=[...])
# → finish_reason: "tool_calls", proper JSON ✓

# Fails (via ADK):
Agent(model=LiteLlm(model="groq/llama-3.3-70b-versatile"), tools=[MCPToolset(...)])
# → <function=run_command {"command": "..."} </function>
# → Groq 400: "Failed to call a function" ✗
```

**Workarounds under consideration:**
1. Use a different model provider (Claude, OpenAI) — ADK may handle
   their tool calling format better
2. Bypass kagent/ADK and use a custom agent loop (like evidra-bench's
   BifrostProvider) that calls LiteLLM directly
3. Monkey-patch ADK's tool conversion in the Dockerfile
4. Wait for fix upstream (ADK or kagent)

**Related:**
- [smolagents #1119](https://github.com/huggingface/smolagents/issues/1119) — same XML tag issue with Groq in HuggingFace's framework
- [LiteLLM #11001](https://github.com/BerriAI/litellm/issues/11001) — Groq tool calling format issues
- Real fix belongs in [google/adk-python](https://github.com/google/adk-python), not kagent

## prescribe_full Hidden by Default (Evidra v0.5.8)

**Status:** By design

**Impact:** The `prescribe_full` tool is no longer exposed by default in
Evidra MCP v0.5.8. It requires the `--full-prescribe` flag to enable.

**Root cause:** When `prescribe_full` is available, agents tend to
generate full YAML artifacts for the `artifact_bytes` field and then
attempt to parse the returned YAML prescription, leading to infinite
YAML generation/parse loops. `prescribe_smart` avoids this by accepting
structured fields (tool name, operation, target) instead of raw artifact
bytes.

**Action:** The demo tool allow list uses `prescribe_smart` only. Do not
add `prescribe_full` to `DEMO_TOOL_ALLOW_LIST` unless you also pass
`--full-prescribe` to evidra-mcp and have tested the agent with it.

## Groq Free Tier Rate Limits

**Impact:** Groq's free tier has a 12K token-per-minute (TPM) limit.
MCP tool schemas consume ~6-9K tokens per request, leaving almost no
room for the actual conversation. Multiple tool calls in quick
succession trigger `429 Too Many Requests`.

**Workaround:** Reduce the tool allow list to just `run_command` (one
tool, ~200 tokens for the schema). Or use a paid tier / different
provider with higher limits.
