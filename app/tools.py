"""Tool definitions and dispatchers for the Claude agent.

Each tool is callable with (input_dict, phone) and returns a string
that becomes the tool_result content for the next API turn.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from . import db
from . import google_calendar
from .config import TIMEZONE
from .scheduler import cancel_reminder_job, schedule_reminder

log = logging.getLogger(__name__)

TZ = ZoneInfo(TIMEZONE)


def _parse_local_iso(s: str) -> datetime:
    """Parse an ISO timestamp; assume local TZ if naive."""
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    return dt.astimezone(TZ)


def _fmt_local(dt: datetime) -> str:
    return dt.astimezone(TZ).strftime("%Y-%m-%d %H:%M")


# ---------------- tool implementations ----------------

def tool_get_current_time(_inp: dict, _phone: str) -> str:
    now = datetime.now(TZ)
    return json.dumps(
        {
            "now_iso": now.isoformat(),
            "now_human": now.strftime("%A, %Y-%m-%d %H:%M"),
            "timezone": TIMEZONE,
            "weekday_he": ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"][now.weekday()],
        },
        ensure_ascii=False,
    )


def tool_set_reminder(inp: dict, phone: str) -> str:
    text = (inp.get("text") or "").strip()
    when = (inp.get("when_iso") or "").strip()
    if not text or not when:
        return "ERROR: missing 'text' or 'when_iso'"
    try:
        fire_at = _parse_local_iso(when)
    except ValueError as e:
        return f"ERROR: invalid when_iso ({e})"
    now = datetime.now(TZ)
    if fire_at <= now:
        return f"ERROR: when_iso is in the past (now={now.isoformat()})"
    rid = db.create_reminder(phone, text, fire_at.isoformat())
    schedule_reminder(rid, fire_at)
    return json.dumps(
        {"ok": True, "id": rid, "fires_at": _fmt_local(fire_at), "text": text},
        ensure_ascii=False,
    )


def tool_list_reminders(_inp: dict, phone: str) -> str:
    items = db.list_pending_reminders(phone)
    out = [
        {
            "id": r["id"],
            "text": r["text"],
            "fires_at": _fmt_local(_parse_local_iso(r["fire_at"])),
        }
        for r in items
    ]
    return json.dumps({"reminders": out}, ensure_ascii=False)


def tool_cancel_reminder(inp: dict, phone: str) -> str:
    rid = inp.get("id")
    if not isinstance(rid, int):
        try:
            rid = int(rid)
        except (TypeError, ValueError):
            return "ERROR: id must be an integer"
    ok = db.cancel_reminder(rid, phone)
    if ok:
        cancel_reminder_job(rid)
    return json.dumps({"ok": ok, "id": rid}, ensure_ascii=False)


def tool_add_to_calendar(inp: dict, _phone: str) -> str:
    title = (inp.get("title") or "").strip()
    start = (inp.get("start_iso") or "").strip()
    end = (inp.get("end_iso") or "").strip() or None
    description = inp.get("description") or ""
    if not title or not start:
        return "ERROR: missing 'title' or 'start_iso'"
    try:
        event = google_calendar.add_event(title, start, end, description)
    except google_calendar.CalendarUnavailable as e:
        return f"ERROR: calendar unavailable ({e})"
    except Exception as e:
        log.exception("calendar add failed")
        return f"ERROR: {e}"
    return json.dumps({"ok": True, "event": event}, ensure_ascii=False)


def tool_list_calendar_events(inp: dict, _phone: str) -> str:
    start = (inp.get("start_iso") or "").strip()
    end = (inp.get("end_iso") or "").strip()
    if not start:
        start = datetime.now(TZ).isoformat()
    if not end:
        end = (datetime.now(TZ) + timedelta(days=7)).isoformat()
    try:
        events = google_calendar.list_events(start, end)
    except google_calendar.CalendarUnavailable as e:
        return f"ERROR: calendar unavailable ({e})"
    except Exception as e:
        log.exception("calendar list failed")
        return f"ERROR: {e}"
    return json.dumps({"events": events}, ensure_ascii=False)


# ---------------- registry ----------------

DISPATCH = {
    "get_current_time": tool_get_current_time,
    "set_reminder": tool_set_reminder,
    "list_reminders": tool_list_reminders,
    "cancel_reminder": tool_cancel_reminder,
    "add_to_calendar": tool_add_to_calendar,
    "list_calendar_events": tool_list_calendar_events,
}


# Tool schemas exposed to Claude. Order is deterministic for prompt caching.
TOOLS_SCHEMA = [
    {
        "name": "get_current_time",
        "description": (
            "Returns the current date and time in the user's timezone. "
            "Call this before scheduling anything that depends on relative time "
            "(today, tomorrow, in 2 hours, next Sunday, etc.)."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "set_reminder",
        "description": (
            "Create a one-time reminder. The bot will send the user a WhatsApp "
            "message at the specified time."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "What to remind the user about, in their language.",
                },
                "when_iso": {
                    "type": "string",
                    "description": (
                        "When to fire the reminder. ISO 8601 datetime; if no "
                        "timezone is given the user's local timezone is assumed. "
                        "Example: 2026-04-30T18:30:00."
                    ),
                },
            },
            "required": ["text", "when_iso"],
        },
    },
    {
        "name": "list_reminders",
        "description": "List the user's pending reminders.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "cancel_reminder",
        "description": "Cancel a pending reminder by id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Reminder id from list_reminders."}
            },
            "required": ["id"],
        },
    },
    {
        "name": "add_to_calendar",
        "description": (
            "Add an event to the user's Google Calendar. "
            "Use this for scheduled events (meetings, appointments) — not for reminders."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "start_iso": {
                    "type": "string",
                    "description": "Event start. ISO 8601, local TZ if not specified.",
                },
                "end_iso": {
                    "type": "string",
                    "description": "Event end. ISO 8601. Defaults to start + 1 hour if omitted.",
                },
                "description": {"type": "string"},
            },
            "required": ["title", "start_iso"],
        },
    },
    {
        "name": "list_calendar_events",
        "description": (
            "List Google Calendar events in a date range. "
            "Defaults to the next 7 days if no range is given."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "start_iso": {"type": "string"},
                "end_iso": {"type": "string"},
            },
            "required": [],
        },
    },
]


def run_tool(name: str, inp: dict, phone: str) -> str:
    fn = DISPATCH.get(name)
    if not fn:
        return f"ERROR: unknown tool {name}"
    try:
        return fn(inp or {}, phone)
    except Exception as e:
        log.exception("tool %s failed", name)
        return f"ERROR: {e}"
