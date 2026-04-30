from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.background import BackgroundScheduler

from . import db
from .config import DB_PATH, TIMEZONE
from .whatsapp import send_whatsapp

log = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _job_id(reminder_id: int) -> str:
    return f"reminder:{reminder_id}"


def _fire_reminder(reminder_id: int) -> None:
    rec = db.get_reminder(reminder_id)
    if not rec or rec["status"] != "pending":
        return
    body = f"⏰ תזכורת: {rec['text']}"
    try:
        send_whatsapp(rec["phone"], body)
        db.mark_reminder_sent(reminder_id)
    except Exception:
        log.exception("Failed sending reminder %s", reminder_id)


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        jobstores = {"default": SQLAlchemyJobStore(url=f"sqlite:///{DB_PATH}")}
        _scheduler = BackgroundScheduler(
            jobstores=jobstores, timezone=ZoneInfo(TIMEZONE)
        )
        _scheduler.start()
    return _scheduler


def schedule_reminder(reminder_id: int, fire_at: datetime) -> None:
    sched = get_scheduler()
    if fire_at.tzinfo is None:
        fire_at = fire_at.replace(tzinfo=ZoneInfo(TIMEZONE))
    sched.add_job(
        _fire_reminder,
        trigger="date",
        run_date=fire_at,
        args=[reminder_id],
        id=_job_id(reminder_id),
        replace_existing=True,
        misfire_grace_time=60 * 60,
    )
    log.info("Scheduled reminder %s for %s", reminder_id, fire_at.isoformat())


def cancel_reminder_job(reminder_id: int) -> None:
    sched = get_scheduler()
    try:
        sched.remove_job(_job_id(reminder_id))
    except Exception:
        pass


def restore_pending_jobs() -> None:
    """On startup, ensure every pending reminder has a job (covers DB-only inserts)."""
    sched = get_scheduler()
    tz = ZoneInfo(TIMEZONE)
    now = datetime.now(tz)
    for r in db.list_pending_reminders():
        try:
            fire_at = datetime.fromisoformat(r["fire_at"])
            if fire_at.tzinfo is None:
                fire_at = fire_at.replace(tzinfo=tz)
        except ValueError:
            continue
        if fire_at <= now:
            _fire_reminder(r["id"])
            continue
        if not sched.get_job(_job_id(r["id"])):
            schedule_reminder(r["id"], fire_at)
