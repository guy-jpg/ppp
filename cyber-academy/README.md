# 🛡️ Cyber Academy

מערכת אתר לימוד מלאה לעולם הסייבר בעברית — כל מה שצריך כדי לשלוט, במקום אחד.
האתר בנוי כ-SPA (Single Page Application) ב-Vanilla JavaScript, ללא תלויות וללא צורך בבנייה.

## 🎯 מה יש באתר

10 תחומי לימוד, כל אחד עם פרקי תיאוריה מעשיים, דוגמאות קוד ושאלות תרגול:

| # | תחום | תיאור |
|---|------|--------|
| 1 | 🛡️ Cyberium Arena | זירת אימון, מעבדה ביתית, Red vs Blue |
| 2 | 🐧 Linux | shell, הרשאות, רשת, Bash scripting |
| 3 | 🐍 Python | אוטומציה, sockets, scapy, ניתוח לוגים |
| 4 | 🔍 Windows Forensics | DFIR, Volatility, Event Logs, timeline |
| 5 | ☁️ AWS | IAM, VPC, Security Groups, CloudTrail |
| 6 | 🔥 pfSense | Firewall, NAT, VPN, VLAN |
| 7 | 💥 Metasploit | exploitation, Meterpreter, pivoting |
| 8 | 🎯 MITRE ATT&CK | TTPs, 14 טקטיקות, מיפוי וזיהוי |
| 9 | 🚨 IDS/IPS | Snort/Suricata, כתיבת חוקים, SIEM |
| 10 | 🤖 AI in Cyber | הגנה, איומים, אבטחת LLM |

## ✨ תכונות

- **🗺️ מסלול לימוד מובנה** — תוכנית של 28 שבועות בשלבים
- **📖 פרקי לימוד** — תוכן מעשי עם דוגמאות קוד ותיבות מידע/אזהרה
- **✏️ מנוע תרגול** — שאלות אמריקאיות עם הסברים, לפי תחום או מעורב
- **📊 מעקב התקדמות** — נשמר ב-localStorage (פרקים שנקראו, היסטוריית מבחנים, ציונים)
- **🎨 עיצוב Dark Mode** בעברית מלאה (RTL), רספונסיבי למובייל

## 🚀 הפעלה

לא נדרשת התקנה. פשוט פתח את `index.html` בדפדפן, או הרץ שרת מקומי:

```bash
cd cyber-academy
python3 -m http.server 8000
# פתח http://localhost:8000
```

## 📁 מבנה

```
cyber-academy/
├── index.html          # נקודת הכניסה
├── app.js              # מנוע ה-SPA (ניווט, תרגול, התקדמות)
├── styles/main.css     # עיצוב (ערכת צבעים cyber)
└── data/
    ├── topics.js       # תוכן 10 התחומים והפרקים
    └── questions.js     # מאגר שאלות התרגול
```

## 📝 הרחבה

- **הוספת תחום:** הוסף אובייקט ל-`TOPICS` ב-`data/topics.js`
- **הוספת שאלות:** הוסף אובייקטים ל-`QUESTIONS` ב-`data/questions.js` (עם שדה `topic` תואם)

---

⚠️ **הערה:** התוכן לשימוש חינוכי ובדיקות חדירה מורשות בלבד.
