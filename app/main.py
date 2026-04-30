from __future__ import annotations

import logging
import threading

from fastapi import FastAPI, Form, HTTPException, Response

from . import db
from .agent import handle_message
from .config import ALLOWED_PHONE, HOST, PORT
from .scheduler import get_scheduler, restore_pending_jobs
from .whatsapp import send_whatsapp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)
log = logging.getLogger("whatsapp-agent")

app = FastAPI(title="WhatsApp Personal Agent")


@app.on_event("startup")
def _startup() -> None:
    db.init_db()
    get_scheduler()
    restore_pending_jobs()
    log.info("Startup complete")


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.post("/webhook/whatsapp")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(""),
    NumMedia: str = Form("0"),
) -> Response:
    """Twilio WhatsApp webhook. Body params follow Twilio's form-encoded format.

    Returns an empty TwiML response immediately; the actual reply is sent
    asynchronously via Twilio's REST API once Claude has produced one.
    """
    log.info("Incoming WhatsApp from=%s body=%r media=%s", From, Body, NumMedia)

    if ALLOWED_PHONE and From != ALLOWED_PHONE:
        log.warning("Rejected message from unauthorized number %s", From)
        return Response(content="<Response/>", media_type="application/xml")

    if not Body.strip():
        return Response(content="<Response/>", media_type="application/xml")

    threading.Thread(
        target=_handle_in_background, args=(From, Body), daemon=True
    ).start()
    return Response(content="<Response/>", media_type="application/xml")


def _handle_in_background(phone: str, body: str) -> None:
    try:
        reply = handle_message(phone, body)
    except Exception:
        log.exception("agent failure for %s", phone)
        reply = "סליחה, נתקלתי בתקלה. נסה שוב בעוד דקה."
    if reply:
        try:
            send_whatsapp(phone, reply)
        except Exception:
            log.exception("send_whatsapp failed for %s", phone)


@app.post("/admin/send")
def admin_send(to: str = Form(...), body: str = Form(...)) -> dict:
    if not ALLOWED_PHONE or to != ALLOWED_PHONE:
        raise HTTPException(403, "to must equal ALLOWED_PHONE")
    sid = send_whatsapp(to, body)
    return {"sid": sid}


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)


if __name__ == "__main__":
    main()
