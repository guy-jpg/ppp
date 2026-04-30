import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-7")

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "")

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")

TIMEZONE = os.environ.get("TIMEZONE", "Asia/Jerusalem")
LOCALE = os.environ.get("LOCALE", "he")

GOOGLE_CREDENTIALS_FILE = ROOT / os.environ.get("GOOGLE_CREDENTIALS_FILE", "google_credentials.json")
GOOGLE_TOKEN_FILE = ROOT / os.environ.get("GOOGLE_TOKEN_FILE", "google_token.json")
GOOGLE_CALENDAR_ID = os.environ.get("GOOGLE_CALENDAR_ID", "primary")
GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar"]

DB_PATH = ROOT / os.environ.get("DB_PATH", "data/agent.db")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

ALLOWED_PHONE = os.environ.get("ALLOWED_PHONE", "").strip()

CONVERSATION_HISTORY_LIMIT = 30
