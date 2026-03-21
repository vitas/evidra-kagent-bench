import os
from pathlib import Path

from google.adk import Agent
from google.adk.models.lite_llm import LiteLlm

from .mcp_tools import get_mcp_tools


DEFAULT_INSTRUCTION = """\
You are a Kubernetes remediation agent working on a single incident in a kind
cluster.

Goal:
- restore the affected workload and confirm the user-visible service is healthy

Operating method:
- use only the Kubernetes MCP tools exposed through AgentGateway
- diagnose before you mutate
- make the smallest targeted change that matches the observed cause
- verify after every mutation
- keep scope tightly limited to the intended namespace and workload
- do not ask for confirmation

Keep your answers concise and action-oriented.
"""


def load_instruction() -> str:
    prompt_path = Path(
        os.environ.get("KAGENT_SYSTEM_PROMPT_FILE", "/demo/prompts/kagent-before.md")
    )
    if prompt_path.is_file():
        return prompt_path.read_text(encoding="utf-8").strip()
    return DEFAULT_INSTRUCTION.strip()


def create_model() -> LiteLlm:
    model_name = os.environ.get("KAGENT_MODEL", "qwen-plus")
    return LiteLlm(model=f"openai/{model_name}")


root_agent = Agent(
    model=create_model(),
    name="demoagent_agent",
    description="Kubernetes remediation agent for Evidra benchmark.",
    instruction=load_instruction(),
    tools=get_mcp_tools(),
)
