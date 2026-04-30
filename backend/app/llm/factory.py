"""Lazy LLM provider singleton."""

from __future__ import annotations

from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.deepseek import DeepSeekConfig, DeepSeekProvider

_provider: LLMProvider | None = None


def get_llm() -> LLMProvider:
    global _provider
    if _provider is None:
        if not settings.DEEPSEEK_API_KEY:
            raise RuntimeError("DEEPSEEK_API_KEY is not configured")
        _provider = DeepSeekProvider(
            DeepSeekConfig(
                api_key=settings.DEEPSEEK_API_KEY,
                api_base=settings.DEEPSEEK_API_BASE,
                model=settings.DEEPSEEK_MODEL,
            )
        )
    return _provider


def set_llm(provider: LLMProvider | None) -> None:
    """Test seam — replace the cached provider with a stub or None to reset."""
    global _provider
    _provider = provider
