from __future__ import annotations

import logging

from twilio.rest import Client

from .config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM

log = logging.getLogger(__name__)

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
            raise RuntimeError("Twilio credentials missing in .env")
        _client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return _client


def send_whatsapp(to: str, body: str) -> str:
    """Send a WhatsApp message via Twilio. Returns message SID."""
    if not to.startswith("whatsapp:"):
        to = f"whatsapp:{to}"
    msg = _get_client().messages.create(
        from_=TWILIO_WHATSAPP_FROM,
        to=to,
        body=body[:1600],
    )
    log.info("Sent WhatsApp to %s sid=%s", to, msg.sid)
    return msg.sid
