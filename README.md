# WhatsApp Personal Agent

סוכן וואטסאפ אישי שמתזכר, מוסיף ליומן Google, ושולח התראות. בנוי על Claude (Anthropic) עם tool use, Twilio WhatsApp, ו-APScheduler.

## מה הוא יודע לעשות

- שיחה רגילה בעברית
- "תזכיר לי לקנות חלב מחר ב-18:30" → שומר תזכורת ובזמן הנכון שולח לך הודעת WhatsApp
- "תוסיף ליומן פגישה עם דני ביום ראשון ב-10" → מוסיף אירוע ליומן Google
- "מה יש לי השבוע?" → מציג אירועי יומן + תזכורות פתוחות
- "תבטל את התזכורת על החלב" → מבטל

## ארכיטקטורה

```
WhatsApp ── Twilio webhook ──▶ FastAPI /webhook/whatsapp
                                    │
                                    ▼
                      Claude (Opus 4.7, tool use)
                       │       │            │
                  set_reminder │     add_to_calendar
                       │   list_reminders        │
                       ▼                         ▼
                APScheduler              Google Calendar API
                       │
                       ▼
            Twilio REST API ──▶ WhatsApp (התראות בזמן)
```

נתונים נשמרים ב-SQLite (`data/agent.db`) — היסטוריית שיחה לכל מספר טלפון, רשימת תזכורות, ו-jobs של APScheduler. אם השרת קם מחדש, התזכורות נטענות מחדש ב-`restore_pending_jobs()`.

## התקנה

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

ערוך את `.env` עם הסודות שלך (ראה למטה).

## הסודות שאתה צריך

### 1. Anthropic API key
- כנס ל-https://console.anthropic.com/settings/keys
- צור מפתח, הדבק ב-`ANTHROPIC_API_KEY`

### 2. Twilio WhatsApp Sandbox (להתחלה — חינמי)
- צור חשבון ב-https://www.twilio.com
- ב-Console: **Messaging → Try it out → Send a WhatsApp message**
- יש מספר sandbox (בדרך כלל `+1 415 523 8886`) וקוד הצטרפות (`join <words>`)
- שלח את הקוד מהוואטסאפ שלך למספר הזה כדי לאשר את המספר שלך
- ב-`.env`:
  ```
  TWILIO_ACCOUNT_SID=ACxxxxxx
  TWILIO_AUTH_TOKEN=xxxxxxxx
  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
  ALLOWED_PHONE=whatsapp:+9725XXXXXXXX   # המספר שלך, מומלץ בחום
  ```

### 3. ngrok (לחשיפת ה-webhook ל-Twilio בפיתוח מקומי)
```bash
brew install ngrok      # macOS, או הורד מ-ngrok.com
ngrok http 8000
```
תקבל URL כמו `https://abcd-1234.ngrok-free.app`. הדבק אותו ב-`PUBLIC_BASE_URL` בקובץ `.env`.

ב-Twilio Console (sandbox settings) — בשדה **"WHEN A MESSAGE COMES IN"** הדבק:
```
https://abcd-1234.ngrok-free.app/webhook/whatsapp
```
שיטה: `HTTP POST`.

### 4. Google Calendar (אופציונלי — אם אתה רוצה הוספה ליומן)
1. https://console.cloud.google.com/ — צור פרויקט.
2. **APIs & Services → Library** → הפעל "Google Calendar API".
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → סוג "Desktop app".
4. הורד את ה-JSON ושמור אותו בשם `google_credentials.json` בשורש הפרויקט.
5. הוסף את עצמך כ-Test User תחת **OAuth consent screen → Test users**.
6. הרץ פעם אחת:
   ```bash
   python scripts/google_auth.py
   ```
   זה יפתח דפדפן, יבקש הרשאה, וישמור `google_token.json` (refresh token לטווח ארוך).

אם לא הגדרת את גוגל — הסוכן עדיין יעבוד לתזכורות ולשיחה. ניסיון להוסיף ליומן יחזיר שגיאה ידידותית.

## הרצה

```bash
python -m app.main
```

או:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

ובמסך נפרד:
```bash
ngrok http 8000
```

עדכן את ה-webhook ב-Twilio ל-URL של ngrok.

## בדיקה

שלח לבוט בוואטסאפ:
- "היי" → תקבל ברכה
- "תזכיר לי בעוד דקה לבדוק את הבוט" → תקבל אישור, וכעבור דקה — תזכורת
- "מה השעה?" → ייקרא ל-`get_current_time`
- "מה יש לי השבוע ביומן?" → רשימת אירועים

## בעיות נפוצות

| תופעה | סיבה / פתרון |
|---|---|
| ה-webhook לא מגיע | בדוק ש-ngrok רץ ושעדכנת את ה-URL ב-Twilio Sandbox |
| `Twilio credentials missing` | חסרים `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` ב-`.env` |
| `Google token missing` | הרץ `python scripts/google_auth.py` |
| תזכורת לא נשלחה | בדוק לוגים — אולי השרת היה כבוי בזמן הירייה. `restore_pending_jobs()` יטפל בעתיד |
| הבוט לא עונה לי | אם הגדרת `ALLOWED_PHONE` — ודא שזה בדיוק המספר שלך עם פרפיקס `whatsapp:` |

## עלות

- **Twilio Sandbox**: חינמי לפיתוח. ל-production תצטרך מספר WhatsApp Business מאושר (~$1/חודש + $0.005-0.01 להודעה).
- **Anthropic Claude Opus 4.7**: כ-$5 ל-1M tokens קלט / $25 ל-1M tokens פלט. עם prompt caching, השיחות הראשונות במשך כל שעה זולות בערך פי 10. שיחה ממוצעת היא כמה אלפי טוקנים — עלות צפויה: סנטים בודדים ליום לבוט אישי.
- אם זה יקר מדי, החלף ל-Sonnet 4.6 (`ANTHROPIC_MODEL=claude-sonnet-4-6` ב-`.env`) — חצי המחיר.

## מבנה הקבצים

```
app/
├── config.py          # קריאת .env + נתיבים
├── db.py              # SQLite: היסטוריה + תזכורות
├── google_calendar.py # Google Calendar wrapper
├── whatsapp.py        # Twilio sender
├── scheduler.py       # APScheduler (תזכורות)
├── tools.py           # סכמות הכלים + dispatchers
├── agent.py           # לולאת ה-tool use של Claude
└── main.py            # FastAPI + webhook
scripts/
└── google_auth.py     # OAuth חד-פעמי
```
