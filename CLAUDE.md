# מודל חיזוי עימות ישראל–איראן

## מה הפרויקט הזה

מערכת Python שמחשבת הסתברות לחידוש עימות ישראל-איראן.
מבוסס על 9 גורמי סיכון גיאופוליטיים עם Monte Carlo + ניתוח חדשות בזמן אמת.

## מבנה הקבצים

```
conflict_model/
├── factors.py      # 9 גורמי סיכון – שנה כאן ציונים ומשקלים
├── model.py        # מנוע חישוב: logistic aggregation + Monte Carlo
├── scenarios.py    # תרחישים מוגדרים מראש (nuclear_breakout וכו')
├── news.py         # שליפת RSS + ניתוח sentiment
├── display.py      # rendering לטרמינל (צבעים, טבלאות)
└── cli.py          # ממשק פקודות
main.py             # נקודת כניסה
```

## התקנה (פעם אחת)

```bash
pip install colorama
```

## פקודות להרצה

```bash
# תוצאה בסיסית
python main.py predict

# אופק זמן ספציפי (ימים)
python main.py predict --days 14
python main.py predict --days 30
python main.py predict --days 90

# עדכון מחדשות בזמן אמת
python main.py live
python main.py live --days 14
python main.py live --days 14 --headlines

# השוואת כל התרחישים
python main.py compare

# ניתוח רגישות (איזה גורם הכי משפיע)
python main.py tornado

# תרחיש ספציפי
python main.py predict --scenario nuclear_breakout
python main.py predict --scenario diplomatic_breakthrough
python main.py predict --scenario proxy_escalation
python main.py predict --scenario us_disengagement

# עדכון ציון גורם ידני
python main.py update nuclear_advancement 9.5
python main.py update proxy_activity 8.0

# רשימת כל הגורמים וציוניהם
python main.py factors

# רשימת כל התרחישים
python main.py scenarios
```

## תרחישים זמינים

| מפתח | תיאור |
|------|-------|
| `baseline` | מצב נוכחי (מאי 2026) |
| `nuclear_breakout` | איראן מגיעה לסף נשק גרעיני |
| `diplomatic_breakthrough` | הסכם גרעין חדש נחתם |
| `proxy_escalation` | חיזבאלה וחות'ים מתגברים |
| `us_disengagement` | נסיגה אמריקאית מהאזור |
| `full_escalation` | כל הגורמים במקסימום |
| `calm` | כל הגורמים במינימום |

## גורמי סיכון – מפתחות לעדכון

```
nuclear_advancement      התקדמות גרעינית איראנית     (משקל 22%)
proxy_activity           פעילות פרוקסי               (משקל 14%)
direct_strike_history    היסטוריית מתקפות ישירות     (משקל 13%)
diplomatic_channels      ערוצים דיפלומטיים           (משקל 11%)
international_pressure   לחץ בינלאומי לריסון         (משקל 10%)
nuclear_deal_status      מצב הסכם גרעין              (משקל  9%)
idf_readiness            כוננות צבאית ישראלית        (משקל  9%)
iran_domestic_stability  יציבות פנים איראנית         (משקל  7%)
israel_domestic_pressure לחץ פנים ישראלי לפעולה      (משקל  5%)
```

## איך לשנות ציון גורם

פתח `conflict_model/factors.py` ושנה את `score` של הגורם הרצוי (ערך בין 0 ל-10).
אחרי כל שינוי הרץ `python main.py predict` לראות את ההשפעה.

## איך להוסיף תרחיש חדש

פתח `conflict_model/scenarios.py` והוסף לדיקשנרי `SCENARIOS`:

```python
"my_scenario": Scenario(
    key="my_scenario",
    name="שם התרחיש",
    description="תיאור קצר",
    overrides={
        "nuclear_advancement": 9.0,
        "proxy_activity": 7.0,
    },
),
```

## איך להוסיף מקור חדשות חדש

פתח `conflict_model/news.py` והוסף לרשימת `RSS_FEEDS`:

```python
("שם המקור", "https://url-of-rss-feed.xml"),
```

## הערות טכניות

- המודל מכויל ל-12 חודשים כברירת מחדל
- סקאלינג זמן: Poisson process – `--days 14` ממיר את ההסתברות השנתית לחלון 14 יום
- Monte Carlo: 10,000 סימולציות עם רעש גאוסי לפי `uncertainty` של כל גורם
- CI 90%: אחוזון 5 עד אחוזון 95 של הסימולציות
