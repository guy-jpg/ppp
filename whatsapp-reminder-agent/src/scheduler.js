"use strict";

// מנוע התזמון: בודק כל 30 שניות אילו תזכורות הגיע זמנן, שולח אותן,
// ומסמן/מתזמן מחדש לפי recurrence. עובד גם אחרי אתחול כי הנתונים בקובץ.

const storage = require("./storage");

const CHECK_INTERVAL_MS = 30 * 1000;

function nextOccurrence(fireAt, recurrence) {
  const d = new Date(fireAt);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else return null;
  return d.toISOString();
}

// sendFn(chatId, text) -> Promise. מסופק מבחוץ (לקוח הוואטסאפ).
function start(sendFn) {
  async function tick() {
    const now = Date.now();
    const reminders = storage.load();
    for (const r of reminders) {
      if (r.done) continue;
      if (new Date(r.fireAt).getTime() > now) continue;

      try {
        await sendFn(r.chatId, `⏰ תזכורת: ${r.message}`);
      } catch (err) {
        console.error(`שליחת תזכורת ${r.id} נכשלה:`, err.message);
        continue; // ננסה שוב בסבב הבא
      }

      const next = nextOccurrence(r.fireAt, r.recurrence);
      if (next) storage.update(r.id, { fireAt: next });
      else storage.update(r.id, { done: true });
    }
  }

  tick(); // ריצה ראשונה מיידית (תופס תזכורות שעבר זמנן בזמן שהשרת היה כבוי)
  return setInterval(tick, CHECK_INTERVAL_MS);
}

module.exports = { start };
