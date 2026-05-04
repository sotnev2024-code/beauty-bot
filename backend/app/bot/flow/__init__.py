"""Deterministic button-only booking funnel.

Activated for masters whose `bot_settings.message_format == "buttons"`.
The LLM is bypassed for the booking flow; only the «Задать вопрос» branch
serves answers from the knowledge base. Free-form text from the client
while in-flow is parsed contextually (name+phone collection step) or
ignored with a re-render of the current step.
"""
