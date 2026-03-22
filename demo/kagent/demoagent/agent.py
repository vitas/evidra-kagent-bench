import os
from pathlib import Path

from google.adk import Agent
from google.adk.models.lite_llm import LiteLlm

from .mcp_tools import get_mcp_tools


def load_instruction() -> str:
    prompt_path = Path(
        os.environ.get("KAGENT_SYSTEM_PROMPT_FILE", "/demo/prompts/kagent-before.md")
    )
    if not prompt_path.is_file():
        raise FileNotFoundError(f"prompt file not found: {prompt_path}")
    return prompt_path.read_text(encoding="utf-8").strip()


def create_model() -> LiteLlm:
    model_name = os.environ.get("KAGENT_MODEL", "qwen-plus")
    provider = os.environ.get("KAGENT_MODEL_PROVIDER", "openai")
    return LiteLlm(model=f"{provider}/{model_name}")


root_agent = Agent(
    model=create_model(),
    name="demoagent_agent",
    description="Kubernetes remediation agent for Evidra benchmark.",
    instruction=load_instruction(),
    tools=get_mcp_tools(),
)
