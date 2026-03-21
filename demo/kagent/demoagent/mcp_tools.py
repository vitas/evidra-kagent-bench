import os
from typing import List, Optional, Union

from google.adk.tools.base_toolset import ToolPredicate
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StreamableHTTPConnectionParams

# Only expose tools the demo agent actually needs.
# Keeps the tool list small → fewer tokens per turn, cheaper and faster.
DEMO_TOOL_ALLOW_LIST = {
    "get_pod_logs",
    "get_pods",
    "get_deployments",
    "describe_resource",
    "get_events",
    "get_services",
    "get_configmaps",
    "scale_deployment",
    "update_deployment_image",
    "apply_yaml",
}


def _demo_tool_filter(tool) -> bool:
    allow_env = os.getenv("KAGENT_TOOL_ALLOW_LIST", "")
    if allow_env:
        allowed = {t.strip() for t in allow_env.split(",") if t.strip()}
    else:
        allowed = DEMO_TOOL_ALLOW_LIST
    return tool.name in allowed


def get_mcp_tools(
    server_names: Optional[List[str]] = None,
    server_filters: Optional[Union[ToolPredicate, List[str]]] = None,
    global_filter: Optional[Union[ToolPredicate, List[str]]] = None,
) -> List[MCPToolset]:
    del server_names  # Required by ADK ToolProvider interface; unused in single-backend setup.

    url = os.getenv("KAGENT_MCP_URL", "http://agentgateway:3000/mcp/http")
    headers = {}
    api_key = os.getenv("EVIDRA_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Use demo filter unless caller provides one.
    predicate = global_filter
    if server_filters and "kubernetes" in server_filters:
        predicate = server_filters["kubernetes"]
    if predicate is None:
        predicate = _demo_tool_filter

    if headers:
        connection_params = StreamableHTTPConnectionParams(url=url, headers=headers)
    else:
        connection_params = StreamableHTTPConnectionParams(url=url)
    return [MCPToolset(connection_params=connection_params, tool_filter=predicate)]
