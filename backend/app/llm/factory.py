"""Lazy LLM provider singleton.

Picks the provider implementation based on settings.LLM_PROVIDER:
  - "kie"      → KieProvider (api.kie.ai/gpt-5-2)  [default]
  - "deepseek" → DeepSeekProvider (api.deepseek.com)

DeepSeek is reachable directly from Russia, so by default we don't route the
LLM client through `HTTP_PROXY_URL` (which is meant for Telegram/YooKassa).
"""

from __future__ import annotations

from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.deepseek import DeepSeekConfig, DeepSeekProvider
from app.llm.kie import KieConfig, KieProvider

_provider: LLMProvider | None = None


def get_llm() -> LLMProvider:
    global _provider
    if _provider is not None:
        return _provider

    name = (settings.LLM_PROVIDER or "kie").lower()
    if name == "kie":
        if not settings.KIE_API_KEY:
            raise RuntimeError("KIE_API_KEY is not configured")
        _provider = KieProvider(
            KieConfig(
                api_key=settings.KIE_API_KEY,
                api_base=settings.KIE_API_BASE,
                model_path=settings.KIE_MODEL,
                reasoning_effort=settings.KIE_REASONING_EFFORT,
            ),
            proxy=None,
        )
    elif name == "deepseek":
        if not settings.DEEPSEEK_API_KEY:
            raise RuntimeError("DEEPSEEK_API_KEY is not configured")
        _provider = DeepSeekProvider(
            DeepSeekConfig(
                api_key=settings.DEEPSEEK_API_KEY,
                api_base=settings.DEEPSEEK_API_BASE,
                model=settings.DEEPSEEK_MODEL,
            ),
            proxy=None,
        )
    else:
        raise RuntimeError(f"unknown LLM_PROVIDER={name!r} (expected 'kie' or 'deepseek')")
    return _provider


def set_llm(provider: LLMProvider | None) -> None:
    """Test seam — replace the cached provider with a stub or None to reset."""
    global _provider
    _provider = provider
