"""Claude agent: takes a user WhatsApp message, runs the tool-use loop,
returns the final text reply to send back."""
from __future__ import annotations

import logging

import anthropic

from . import db
from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, LOCALE, TIMEZONE
from .tools import TOOLS_SCHEMA, run_tool

log = logging.getLogger(__name__)

if not ANTHROPIC_API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY not set in .env")
_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = f"""You are a personal WhatsApp assistant for the user. You help with reminders, calendar events, and general questions.

User profile:
- Locale: {LOCALE} (respond in Hebrew unless the user clearly switches to another language)
- Timezone: {TIMEZONE}
- Channel: WhatsApp (keep replies short, natural, no markdown headings, no code blocks)

Rules:
1. ALWAYS call get_current_time before scheduling anything that depends on relative time ("מחר", "בעוד שעה", "ביום ראשון"). Don't guess the date.
2. Use set_reminder for "תזכיר לי..." style requests — the bot will WhatsApp the user at that time.
3. Use add_to_calendar for actual scheduled events the user has with others (meetings, appointments). Reminders ≠ calendar events.
4. After completing an action, confirm in one short Hebrew sentence with the local time. Example: "סבבה, אזכיר לך מחר ב-18:30 לקנות חלב."
5. If the user asks "מה יש לי היום/השבוע" — call list_calendar_events and/or list_reminders.
6. If a tool returns an ERROR string, explain to the user briefly what went wrong (e.g., "היומן לא מחובר עדיין") — don't retry blindly.
7. For genuinely ambiguous times, ask one short clarifying question instead of guessing.
8. Don't invent reminder ids. To cancel, list first if you don't already know the id.
"""


def _extract_text(content_blocks: list) -> str:
    parts = [b.text for b in content_blocks if getattr(b, "type", None) == "text"]
    return "\n".join(p for p in parts if p).strip()


def _serialize_assistant_content(content_blocks: list) -> list[dict]:
    out: list[dict] = []
    for b in content_blocks:
        t = getattr(b, "type", None)
        if t == "text":
            out.append({"type": "text", "text": b.text})
        elif t == "tool_use":
            out.append({"type": "tool_use", "id": b.id, "name": b.name, "input": b.input})
        elif t == "thinking":
            out.append({"type": "thinking", "thinking": b.thinking, "signature": b.signature})
    return out


MAX_TURNS = 6


def handle_message(phone: str, user_text: str) -> str:
    """Run the agent on a single user message. Returns the assistant text reply."""
    history = db.load_history(phone)
    new_turns: list[dict] = [{"role": "user", "content": user_text}]
    messages = history + list(new_turns)

    final_text = ""
    for turn in range(MAX_TURNS):
        response = _client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2048,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=TOOLS_SCHEMA,
            messages=messages,
        )

        log.info(
            "claude turn=%s stop_reason=%s in=%s out=%s cache_read=%s",
            turn,
            response.stop_reason,
            response.usage.input_tokens,
            response.usage.output_tokens,
            getattr(response.usage, "cache_read_input_tokens", 0),
        )

        assistant_msg = {
            "role": "assistant",
            "content": _serialize_assistant_content(response.content),
        }
        messages.append(assistant_msg)
        new_turns.append(assistant_msg)

        if response.stop_reason != "tool_use":
            final_text = _extract_text(response.content)
            break

        tool_results = []
        for block in response.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            log.info("tool_use name=%s input=%s", block.name, block.input)
            result = run_tool(block.name, block.input or {}, phone)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                }
            )
        tool_msg = {"role": "user", "content": tool_results}
        messages.append(tool_msg)
        new_turns.append(tool_msg)

    if not final_text:
        final_text = "סליחה, יש בעיה זמנית. נסה שוב בעוד רגע."

    for m in new_turns:
        db.append_message(phone, m["role"], m["content"])

    return final_text
