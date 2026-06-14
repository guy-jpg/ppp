"use strict";

require("dotenv").config();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const storage = require("./storage");
const scheduler = require("./scheduler");
const { parseMessage } = require("./claude");

// רשימת מספרים מורשים (אופציונלי). פורמט: 9725XXXXXXXX, מופרד בפסיקים.
// אם ריק — הסוכן מגיב לכל מי שכותב לו.
const ALLOWED = (process.env.ALLOWED_NUMBERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowed(chatId) {
  if (ALLOWED.length === 0) return true;
  const number = chatId.replace(/@c\.us$/, "");
  return ALLOWED.includes(number);
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.SESSION_DIR || "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("\nסרוק את קוד ה-QR בוואטסאפ (הגדרות → מכשירים מקושרים):\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ הסוכן מחובר ומוכן.");
  scheduler.start((chatId, text) => client.sendMessage(chatId, text));
});

client.on("auth_failure", (m) => console.error("אימות נכשל:", m));
client.on("disconnected", (r) => console.error("נותק:", r));

client.on("message", async (msg) => {
  const chatId = msg.from;
  if (chatId.endsWith("@g.us")) return; // מתעלמים מקבוצות
  if (!isAllowed(chatId)) return;
  const text = (msg.body || "").trim();
  if (!text) return;

  try {
    const parsed = await parseMessage(text);

    switch (parsed.intent) {
      case "create_reminder": {
        if (!parsed.fire_at) {
          await msg.reply("לא הצלחתי להבין לאיזו שעה. נסה למשל: 'תזכיר לי מחר ב-9 לקנות חלב'.");
          return;
        }
        storage.add({
          id: newId(),
          chatId,
          message: parsed.message || text,
          fireAt: new Date(parsed.fire_at).toISOString(),
          recurrence: parsed.recurrence || "none",
          createdAt: new Date().toISOString(),
          done: false,
        });
        await msg.reply(parsed.reply);
        break;
      }

      case "list_reminders": {
        const items = storage.pending(chatId);
        if (items.length === 0) {
          await msg.reply("אין לך תזכורות פעילות 🎉");
          break;
        }
        const lines = items
          .sort((a, b) => new Date(a.fireAt) - new Date(b.fireAt))
          .map((r, i) => {
            const when = new Date(r.fireAt).toLocaleString("he-IL", {
              timeZone: process.env.TIMEZONE || "Asia/Jerusalem",
            });
            const rec = r.recurrence !== "none" ? ` (${r.recurrence})` : "";
            return `${i + 1}. ${when}${rec} — ${r.message}`;
          });
        await msg.reply("📋 התזכורות שלך:\n" + lines.join("\n"));
        break;
      }

      case "cancel_reminders": {
        const items = storage.pending(chatId);
        items.forEach((r) => storage.remove(r.id));
        await msg.reply(parsed.reply || `ביטלתי ${items.length} תזכורות.`);
        break;
      }

      default:
        await msg.reply(parsed.reply || "לא הבנתי. נסה: 'תזכיר לי בשעה 20:00 להוציא כביסה'.");
    }
  } catch (err) {
    console.error("שגיאה בטיפול בהודעה:", err);
    await msg.reply("אופס, משהו השתבש בעיבוד הבקשה. נסה שוב בעוד רגע.");
  }
});

client.initialize();
