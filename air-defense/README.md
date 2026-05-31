# Project Air Defense HMI — "כיפת ברזל שולחנית"

אב-טיפוס של מערכת בקרת אש והגנה אווירית מבוססת ראייה ממוחשבת וזיהוי מחוות.
מצלמה רגילה הופכת ל"מכ"ם" שסורק, מזהה איומים, מחשב מסלול בליסטי, ומאפשר
למפעיל לנעול ולהשמיד באמצעות מחוות יד בלבד.

> **הערה על הממשק:** כל ה-HMI/HUD מצויר ישירות על פריים הווידאו ב-OpenCV
> בלבד (`cv2.rectangle`, `cv2.line`, `cv2.addWeighted`). אין React/Frontend.

## בנייה לבנה-לבנה

| לבנה | מה היא נותנת | סטטוס |
|------|--------------|--------|
| **1. השלד** | לולאת וידאו, גדר ב-`w//2`, אזורי SAFE/DANGER, HUD + FPS | ✅ |
| 2. המכ"ם | YOLOv8n + `persist=True`, תיבות + ID, מונה פריצות | ⬜ |
| 3. הכוונת | MediaPipe — אצבע מורה/אגודל, pinch < 40px, רטיקל | ⬜ |
| 4. ההיתוך | State machine: pinch על מטרה → `LOCKED`, flash 4Hz, `R` משחרר | ⬜ |
| 5. החיזוי | `np.polyfit` deg 2 על deque(40), חיזוי 10 פריימים קדימה | ⬜ |

## התקנה והרצה

```bash
cd air-defense
pip install -r requirements.txt

python air_defense_fusion.py                  # מצלמת ברירת מחדל
python air_defense_fusion.py --source 1        # מצלמה אחרת
python air_defense_fusion.py --source clip.mp4  # קובץ וידאו (לופ) — לבדיקה בלי מצלמה
```

שליטה: `Q`/`ESC` = יציאה · `R` = Reset.
