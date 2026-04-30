from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .config import (
    GOOGLE_CALENDAR_ID,
    GOOGLE_SCOPES,
    GOOGLE_TOKEN_FILE,
    TIMEZONE,
)


class CalendarUnavailable(Exception):
    pass


def _credentials() -> Credentials:
    if not GOOGLE_TOKEN_FILE.exists():
        raise CalendarUnavailable(
            "Google token missing. Run: python scripts/google_auth.py"
        )
    creds = Credentials.from_authorized_user_file(str(GOOGLE_TOKEN_FILE), GOOGLE_SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            GOOGLE_TOKEN_FILE.write_text(creds.to_json())
        else:
            raise CalendarUnavailable("Google token invalid; re-run google_auth.py")
    return creds


def _service():
    return build("calendar", "v3", credentials=_credentials(), cache_discovery=False)


def add_event(title: str, start_iso: str, end_iso: str | None = None, description: str = "") -> dict:
    tz = ZoneInfo(TIMEZONE)
    start_dt = datetime.fromisoformat(start_iso)
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=tz)
    if end_iso:
        end_dt = datetime.fromisoformat(end_iso)
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=tz)
    else:
        end_dt = start_dt + timedelta(hours=1)

    body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": TIMEZONE},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": TIMEZONE},
    }
    event = (
        _service()
        .events()
        .insert(calendarId=GOOGLE_CALENDAR_ID, body=body)
        .execute()
    )
    return {
        "id": event["id"],
        "htmlLink": event.get("htmlLink"),
        "summary": event.get("summary"),
        "start": event["start"].get("dateTime"),
        "end": event["end"].get("dateTime"),
    }


def list_events(start_iso: str, end_iso: str, max_results: int = 20) -> list[dict]:
    tz = ZoneInfo(TIMEZONE)

    def _normalize(s: str) -> str:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=tz)
        return dt.isoformat()

    events = (
        _service()
        .events()
        .list(
            calendarId=GOOGLE_CALENDAR_ID,
            timeMin=_normalize(start_iso),
            timeMax=_normalize(end_iso),
            singleEvents=True,
            orderBy="startTime",
            maxResults=max_results,
        )
        .execute()
    )
    out = []
    for e in events.get("items", []):
        out.append(
            {
                "id": e["id"],
                "summary": e.get("summary", "(ללא כותרת)"),
                "start": e["start"].get("dateTime") or e["start"].get("date"),
                "end": e["end"].get("dateTime") or e["end"].get("date"),
                "description": e.get("description", ""),
            }
        )
    return out
