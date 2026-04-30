"""One-time Google OAuth flow.

Run locally once: python scripts/google_auth.py

Prereq:
1) Go to https://console.cloud.google.com/apis/credentials
2) Create OAuth client (Desktop app) and download credentials JSON.
3) Save it as google_credentials.json in the project root.
4) Enable Google Calendar API for the project.

This will open a browser, ask for consent, and write google_token.json
that the bot uses to call Calendar API. The refresh_token in it is
long-lived; you only need to re-run this if you revoke access.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from google_auth_oauthlib.flow import InstalledAppFlow

from app.config import GOOGLE_CREDENTIALS_FILE, GOOGLE_SCOPES, GOOGLE_TOKEN_FILE


def main() -> None:
    if not GOOGLE_CREDENTIALS_FILE.exists():
        print(f"Missing {GOOGLE_CREDENTIALS_FILE}. See script docstring.")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(
        str(GOOGLE_CREDENTIALS_FILE), GOOGLE_SCOPES
    )
    creds = flow.run_local_server(port=0)
    GOOGLE_TOKEN_FILE.write_text(creds.to_json())
    print(f"Wrote token to {GOOGLE_TOKEN_FILE}")


if __name__ == "__main__":
    main()
