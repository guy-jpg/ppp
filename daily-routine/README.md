# שגרת היום 🌅

אפליקציה לניהול שגרת היום — תכנון משימות יומיות, מעקב התקדמות ורצף הרגלים (streak).

שתי דרכי הרצה מאותו קוד מקור:
- **PWA** — ניתנת להתקנה כאפליקציה אמיתית **גם ב-iPhone (Apple) וגם ב-Android**, ועובדת אופליין.
- **נייטיב (Capacitor)** — עטיפה לפרויקטי iOS/Android אמיתיים להעלאה ל-App Store / Google Play.

## מבנה הפרויקט
```
daily-routine/
├─ www/                     ← אפליקציית הווב (זה ה-webDir של Capacitor)
│  ├─ index.html
│  ├─ app.js
│  ├─ sw.js                 ← Service Worker (אופליין)
│  ├─ manifest.webmanifest  ← מניפסט PWA
│  ├─ styles/main.css
│  └─ icons/                ← אייקוני אפליקציה (PNG)
├─ capacitor.config.json    ← הגדרות Capacitor
├─ package.json             ← תלויות + סקריפטים
└─ tools/gen-icons.js       ← מחולל אייקונים (ללא תלויות)
```

## תכונות
- ➕ הוספת משימות עם כותרת, שעה ואייקון
- ✅ סימון השלמה עם פס התקדמות
- 🔥 רצף ימים (streak) על השלמת כל המשימות
- 🔄 איפוס יומי אוטומטי (המשימות נשמרות, הסימונים מתאפסים בכל יום)
- 🗂️ סינון: הכל / פעילות / הושלמו
- 💾 שמירה מקומית במכשיר (localStorage) — ללא שרת וללא חשבון
- 📴 עובדת אופליין (Service Worker)

## הרצה מקומית (PWA)
ה-Service Worker לא רץ מ-`file://`, צריך שרת HTTP:
```bash
cd daily-routine
npm run serve          # = python3 -m http.server 8080
# פתח בדפדפן: http://localhost:8080/www/
```

## התקנה בטלפון (PWA)
PWA דורשת HTTPS — הדרך הקלה היא **GitHub Pages**:
1. ב-GitHub: Settings → Pages → Source: הענף המבוקש, תיקייה `/ (root)`.
2. הכתובת תהיה משהו כמו `https://<user>.github.io/ppp/daily-routine/www/`.
- **Android:** Chrome → תפריט (⋮) → "התקנת אפליקציה / הוספה למסך הבית".
- **iPhone/iPad:** Safari → כפתור שיתוף → "הוספה למסך הבית".

## בניית אפליקציה נייטיב לחנויות (Capacitor)
> דורש מכונה עם **גישת אינטרנט** + Android Studio (ל-Android) ו/או **Mac + Xcode** (ל-iOS).
> הסקפולד כבר מוכן בריפו — צריך רק להתקין תלויות וליצור את הפרויקטים הנייטיב:

```bash
cd daily-routine
npm install                 # מתקין את Capacitor

# יצירת הפרויקטים הנייטיב (נוצרים מקומית, לא נשמרים בריפו)
npx cap add android         # פרויקט Gradle ל-Android
npx cap add ios             # פרויקט Xcode ל-iOS (דורש Mac)

npx cap sync                # מסנכרן את www/ אל הפרויקטים הנייטיב

# פתיחה ב-IDE לבנייה/הרצה/חתימה והעלאה לחנות
npm run android             # = npx cap open android
npm run ios                 # = npx cap open ios
```
ה-`appId` הוא `com.dailyroutine.app` וה-`appName` הוא "שגרת היום" (בקובץ `capacitor.config.json`).
להעלאה לחנויות נדרשים חשבונות מפתח: Google Play (חד-פעמי) ו-Apple Developer (שנתי).

## אייקונים
נוצרים אוטומטית ע"י סקריפט ללא תלויות (כותב אל `www/icons/`):
```bash
npm run icons          # = node tools/gen-icons.js
```
