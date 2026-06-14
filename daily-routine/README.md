# שגרת היום 🌅

אפליקציה לניהול שגרת היום — תכנון משימות יומיות, מעקב התקדמות ורצף הרגלים (streak).
בנויה כ-**PWA** (Progressive Web App) ולכן ניתנת להתקנה כאפליקציה אמיתית **גם ב-iPhone (Apple) וגם ב-Android**, ועובדת גם ללא חיבור לאינטרנט.

## תכונות
- ➕ הוספת משימות עם כותרת, שעה ואייקון
- ✅ סימון השלמה עם פס התקדמות
- 🔥 רצף ימים (streak) על השלמת כל המשימות
- 🔄 איפוס יומי אוטומטי (המשימות נשמרות, הסימונים מתאפסים בכל יום)
- 🗂️ סינון: הכל / פעילות / הושלמו
- 💾 שמירה מקומית במכשיר (localStorage) — ללא שרת וללא חשבון
- 📴 עובדת אופליין (Service Worker)

## הרצה מקומית
צריך שרת HTTP (ה-Service Worker לא רץ מ-`file://`):
```bash
cd daily-routine
python3 -m http.server 8080
# פתח בדפדפן: http://localhost:8080
```

## פרסום אונליין (כדי להתקין בטלפון)
PWA דורשת HTTPS. הדרך הקלה: **GitHub Pages**.
1. ב-GitHub: Settings → Pages → Source: הענף המבוקש, תיקייה `/ (root)`.
2. הכתובת תהיה משהו כמו `https://<user>.github.io/ppp/daily-routine/`.

### התקנה ב-Android
פותחים את הכתובת ב-Chrome → תפריט (⋮) → **"הוספה למסך הבית" / "התקנת אפליקציה"**.

### התקנה ב-iPhone / iPad (Apple)
פותחים את הכתובת ב-Safari → כפתור שיתוף → **"הוספה למסך הבית"**.

## אפליקציה אמיתית בחנויות (App Store / Google Play)
ה-PWA מספיקה לרוב השימושים. אם רוצים אפליקציה נייטיב בחנויות, אפשר לעטוף את אותו קוד עם [Capacitor](https://capacitorjs.com/):
```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "שגרת היום" com.example.dailyroutine --web-dir .
npx cap add ios       # דורש Mac + Xcode
npx cap add android   # דורש Android Studio
npx cap sync
```
לאחר מכן בונים ומעלים דרך Xcode / Android Studio (נדרשים חשבונות מפתח בתשלום בחנויות).

## אייקונים
האייקונים נוצרים אוטומטית ע"י סקריפט ללא תלויות:
```bash
node tools/gen-icons.js
```
