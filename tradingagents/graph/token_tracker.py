import logging
from contextvars import ContextVar
from typing import Any, Callable, Dict, Optional

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

_logger = logging.getLogger(__name__)

# Thread-local context carrying {agent_name, job_id, model}
token_tracker_ctx: ContextVar[Optional[Dict[str, str]]] = ContextVar(
    "token_tracker_ctx", default=None
)


def set_token_context(agent_name: str, job_id: str, model: str = "") -> None:
    token_tracker_ctx.set({
        "agent_name": agent_name,
        "job_id": job_id,
        "model": model,
    })


class TokenUsageCallbackHandler(BaseCallbackHandler):
    """Captures LLM token usage and delegates to an on_usage callable.

    Reads agent/job context from ``token_tracker_ctx`` ContextVar.
    Extracts input/output/total tokens from the standard LangChain
    ``usage_metadata`` and ``response_metadata.token_usage`` fields.
    """

    def __init__(self, on_usage: Callable[[str, str, str, int, int], None]):
        self._on_usage = on_usage

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        ctx = token_tracker_ctx.get()
        if not ctx:
            return

        try:
            total_input = 0
            total_output = 0

            # Priority: usage_metadata > llm_output.token_usage > response_metadata.token_usage
            # Only use one source to avoid double/triple-counting when providers
            # populate multiple locations with the same token counts.
            used_usage_metadata = False
            for gen_list in response.generations:
                for gen in gen_list:
                    msg = getattr(gen, "message", None)
                    if msg is None:
                        continue
                    usage_meta = getattr(msg, "usage_metadata", None) or {}
                    input_t = int(usage_meta.get("input_tokens", 0) or 0)
                    output_t = int(usage_meta.get("output_tokens", 0) or 0)
                    if input_t > 0 or output_t > 0:
                        total_input += input_t
                        total_output += output_t
                        used_usage_metadata = True

            if not used_usage_metadata:
                # Fallback to llm_output (some providers put tokens here)
                llm_output = response.llm_output or {}
                token_usage = llm_output.get("token_usage", {})
                if token_usage:
                    total_input += int(token_usage.get("prompt_tokens", 0) or 0)
                    total_output += int(token_usage.get("completion_tokens", 0) or 0)
                else:
                    # Last resort: response_metadata.token_usage (OpenAI-style)
                    for gen_list in response.generations:
                        for gen in gen_list:
                            msg = getattr(gen, "message", None)
                            if msg is None:
                                continue
                            resp_meta = getattr(msg, "response_metadata", None) or {}
                            tu = resp_meta.get("token_usage", {})
                            total_input += int(tu.get("prompt_tokens", 0) or 0)
                            total_output += int(tu.get("completion_tokens", 0) or 0)

            if total_input == 0 and total_output == 0:
                return

            self._on_usage(
                ctx["job_id"],
                ctx["agent_name"],
                ctx.get("model", ""),
                total_input,
                total_output,
            )
        except Exception:
            _logger.warning("Failed to capture token usage", exc_info=True)
