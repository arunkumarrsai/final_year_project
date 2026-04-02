import os
from langchain_anthropic import ChatAnthropic

def get_llm(model: str = "claude-3-5-sonnet-latest", **kwargs):
    """Return a ChatAnthropic LLM instance."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("⚠️  WARNING: ANTHROPIC_API_KEY environment variable is not set!")

    return ChatAnthropic(
        model_name=model,
        anthropic_api_key=api_key,
        temperature=0,
    )
