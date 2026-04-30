import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator

from .config import CONVERSATION_HISTORY_LIMIT, DB_PATH

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    with _lock:
        conn = _connect()
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_messages_phone_id ON messages(phone, id);

            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                text TEXT NOT NULL,
                fire_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_reminders_status_fire ON reminders(status, fire_at);
            """
        )


# --- Conversation history ---

def append_message(phone: str, role: str, content: list | str) -> None:
    payload = json.dumps(content, ensure_ascii=False) if isinstance(content, list) else content
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO messages(phone, role, content) VALUES(?, ?, ?)",
            (phone, role, payload),
        )


def load_history(phone: str, limit: int = CONVERSATION_HISTORY_LIMIT) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE phone = ? ORDER BY id DESC LIMIT ?",
            (phone, limit),
        ).fetchall()
    rows = list(reversed(rows))
    out: list[dict] = []
    for r in rows:
        content = r["content"]
        try:
            parsed = json.loads(content)
            if isinstance(parsed, list):
                out.append({"role": r["role"], "content": parsed})
                continue
        except (ValueError, TypeError):
            pass
        out.append({"role": r["role"], "content": content})
    return out


# --- Reminders ---

def create_reminder(phone: str, text: str, fire_at_iso: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO reminders(phone, text, fire_at) VALUES(?, ?, ?)",
            (phone, text, fire_at_iso),
        )
        return cur.lastrowid


def get_reminder(reminder_id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM reminders WHERE id = ?", (reminder_id,)
        ).fetchone()
    return dict(row) if row else None


def list_pending_reminders(phone: str | None = None) -> list[dict]:
    sql = "SELECT * FROM reminders WHERE status = 'pending'"
    args: tuple = ()
    if phone:
        sql += " AND phone = ?"
        args = (phone,)
    sql += " ORDER BY fire_at ASC"
    with get_conn() as conn:
        rows = conn.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


def cancel_reminder(reminder_id: int, phone: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE reminders SET status = 'canceled' WHERE id = ? AND phone = ? AND status = 'pending'",
            (reminder_id, phone),
        )
        return cur.rowcount > 0


def mark_reminder_sent(reminder_id: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE reminders SET status = 'sent' WHERE id = ?",
            (reminder_id,),
        )


def now_utc_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
