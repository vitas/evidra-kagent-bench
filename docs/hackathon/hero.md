**Evidra + AgentGateway: Evidence Intelligence Layer & Infrastructure Certification for kagent**

AgentGateway routes MCP traffic. But it doesn't know if the agent behind it is stuck in a retry loop, mutating the wrong namespace, or escalating risk with every command. We fixed that.

Evidra plugs in behind AgentGateway — no gateway code changes — and adds auto-evidence recording, risk assessment, and 8 behavioral signal detectors on every tool call flowing through the gateway.

We used it to build certification exams for kagent: 75 real failure scenarios (CKA/CKS + Terraform) against real Kind clusters. The agent doesn't just need to fix the problem — it needs to fix it without setting off Evidra's detectors.

Along the way we fixed a tool-calling bug in Google ADK (google/adk-python#4985) and caught a supply chain attack in LiteLLM v1.82.8.

**Try it:** `docker compose up -d` → `localhost:28080/lab` → pick a scenario → watch the evidence chain build.
