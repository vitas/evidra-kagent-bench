import os

from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StreamableHTTPConnectionParams

# Only expose tools the demo agent actually needs.
# Keeps the tool list small -> fewer tokens per turn, cheaper and faster.
DEMO_TOOL_ALLOW_LIST = {
    "run_command",
    "prescribe_smart",
    "prescribe_full",
    "report",
    "get_event",
}


def _demo_tool_filter(tool) -> bool:
    allow_env = os.getenv("KAGENT_TOOL_ALLOW_LIST", "")
    if allow_env:
        allowed = {t.strip() for t in allow_env.split(",") if t.strip()}
    else:
        allowed = DEMO_TOOL_ALLOW_LIST
    return tool.name in allowed


def get_mcp_tools() -> list[MCPToolset]:
    url = os.getenv("KAGENT_MCP_URL", "http://agentgateway:3000/mcp/http")
    headers = {}
    api_key = os.getenv("EVIDRA_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    connection_params = StreamableHTTPConnectionParams(url=url, headers=headers)
    return [MCPToolset(connection_params=connection_params, tool_filter=_demo_tool_filter)]
