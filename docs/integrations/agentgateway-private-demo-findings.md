# AgentGateway Private Demo Findings

Updated: 2026-03-19

This note captures concrete findings from wiring the private demo chain:

`kagent/demo-runner -> AgentGateway -> OTEL Collector -> bridge -> Evidra`

## Confirmed Working

- AgentGateway `0.11.1` starts correctly in the demo stack when invoked with `--file /etc/agentgateway/config.yaml`.
- The in-stack MCP backend works behind AgentGateway when the upstream target is
  configured as `http://mcp-backend:3005/mcp`.
- The bridge accepts OTLP traffic and forwards typed ingest calls to Evidra.
- The kind bootstrap flow works from compose when kubeconfig is rewritten to use `host.docker.internal:<api-port>` plus `tls-server-name: kubernetes`.

## Findings From Live MCP Traffic

- AgentGateway returns `406 Not Acceptable` for MCP HTTP requests that do not advertise both `application/json` and `text/event-stream` in the `Accept` header.
- Adding `Accept: application/json, text/event-stream` fixes MCP `initialize` against `/mcp/http`.
- AgentGateway returns `text/event-stream` responses for both `initialize` and `tools/call` in this flow, even when the request also accepts `application/json`.
- The demo runner therefore must normalize SSE payloads of the form `data: {...}` before treating the body as JSON.

## Findings From The Local kagent Service Path

- The released `kagent-adk run` path exposes the A2A service at the root path `/`, with health at `/health` and the agent card at `/.well-known/agent-card.json`.
- A2A requests must use JSON-RPC `message/send` and include `params.message.messageId`; omitting `messageId` returns a structured `-32602 Invalid parameters` error.
- The released `kagent-adk run --local` mode still requires `KAGENT_URL`, `KAGENT_NAME`, and `KAGENT_NAMESPACE` to be set because `KAgentConfig()` is constructed before the `--local` branch is applied.
- In this demo image, `kagent-adk run --local` reaches `Running in local mode with InMemorySessionService` before the local A2A service is actually ready. `/health` starts answering after roughly 25-30 seconds, so startup needs an explicit readiness wait.
- Once the local service is healthy, `message/send` works end to end. Without provider credentials it returns a structured task result with `status.state = failed` and the underlying LiteLLM authentication error in the agent message.
- The first published/containerized approach failed because the expected `kagent-adk` base image reference was not pullable here. The private demo now builds `kagent-adk` from the upstream `v0.8.0-beta9` source tag instead.

## Findings About Our Demo Wiring

- The original demo runner bug was ours, not AgentGateway's:
  - missing `Accept` header
  - assuming raw JSON instead of SSE framing
- The first `kubectl-mcp-server` proxying failure was ours:
  - AgentGateway target was configured as `/mcp/` with a trailing slash
  - `kubectl-mcp-server` redirected that POST with `307 Temporary Redirect`
  - AgentGateway did not follow the redirect for the MCP POST
  - the correct upstream target is `/mcp` with no trailing slash
- The first Evidra ingest `500` was ours:
  - external ingest claims can arrive without `claim.payload`
  - store persistence needed to normalize empty claim payloads to `{}`
- The original AgentGateway container command bug was ours:
  - `serve --config ...` was wrong
  - `--file /etc/agentgateway/config.yaml` is correct for `0.11.1`
- The initial kind access bug was ours:
  - kubeconfig exported inside the bootstrap container still resolved to `127.0.0.1`
  - the demo needed a rewritten server endpoint plus `tls-server-name: kubernetes`
- The first verifier failure was ours:
  - `/v1/evidence/entries` returns `actor` as a string summary in this list view
  - the verifier incorrectly assumed `actor.id`
- The second verifier failure was ours:
  - `broken-deployment` verification was written for the fallback smoke path
  - a real `kagent` remediation heals the deployment, so expecting `ErrImagePull` or `ImagePullBackOff` is wrong in service mode
  - the verifier now branches on the resolved runner mode

## Findings From Real qwen-plus Runs

- On the same `qwen-plus` model and the same `kagent -> AgentGateway -> OTEL -> bridge -> Evidra` chain, the baseline `before` prompt can fail by hallucinating `kubectl_get`, which is not a real tool in the exported MCP set.
- The tuned `after` prompt succeeded on the same stack and produced observed Evidra lifecycle entries for the run.
- This is the exact prompt-only delta we wanted to surface:
  - same model
  - same cluster
  - same gateway and bridge
  - different instruction quality
- The baseline failure is useful product evidence, not just a demo nuisance. It shows why prompt/skill tuning should be benchmarked against real tool contracts instead of assuming generic kubectl verb names.

## Not Yet Classified As Upstream Issues

- No AgentGateway product bug is confirmed yet.
- The main externally visible issue so far is request-shape sensitivity around `Accept`, but the returned error is explicit and correct.
- If we later find missing generic OTEL fields or documentation drift while keeping the request shape correct, that is a better candidate for an upstream PR.

## Good Upstream PR Candidates Later

- documentation clarification for MCP streamable HTTP request requirements if their docs are incomplete
- documentation clarification that local `kagent-adk run --local` still requires `KAGENT_URL`, `KAGENT_NAME`, and `KAGENT_NAMESPACE`
- documentation/examples for the local A2A JSON-RPC request shape (`POST /` with `message/send` and `messageId`)
- documentation or packaging fix for the released `kagent-adk` container image path if the current published reference is stale
- generic OTEL/CEL field exposure improvements for MCP method/session/authz metadata
- config/docs examples for MCP proxying through AgentGateway if the current examples lag the implementation
