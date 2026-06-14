"use strict";

// פירוש הודעות בשפה חופשית (עברית) באמצעות Claude API.
// מחזיר אובייקט מובנה (structured output) שמתאר את כוונת המשתמש.

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic(); // קורא את ANTHROPIC_API_KEY מהסביבה

const TIMEZONE = process.env.TIMEZONE || "Asia/Jerusalem";
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

// סכימת הפלט שאנחנו מכריחים את המודל להחזיר.
const SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["create_reminder", "list_reminders", "cancel_reminders", "unknown"],
      description: "כוונת המשתמש",
    },
    fire_at: {
      type: ["string", "null"],
      description:
        "מועד התזכורת בפורמט ISO 8601 כולל אזור זמן (לדוגמה 2026-06-14T20:00:00+03:00). null אם לא רלוונטי.",
    },
    message: {
      type: ["string", "null"],
      description: "תוכן התזכורת שצריך לשלוח למשתמש בזמן הזה",
    },
    recurrence: {
      type: "string",
      enum: ["none", "daily", "weekly"],
      description: "האם התזכורת חוזרת",
    },
    reply: {
      type: "string",
      description: "תשובה ידידותית בעברית למשתמש שמאשרת/מסבירה מה הבנת",
    },
  },
  required: ["intent", "fire_at", "message", "recurrence", "reply"],
  additionalProperties: false,
};

function systemPrompt() {
  const now = new Date().toLocaleString("sv-SE", { timeZone: TIMEZONE });
  return [
    "אתה עוזר אישי שמנהל תזכורות בוואטסאפ. המשתמש כותב בעברית בשפה חופשית.",
    `אזור הזמן של המשתמש הוא ${TIMEZONE}. השעה והתאריך הנוכחיים: ${now}.`,
    "המר ביטויים יחסיים ('מחר בבוקר', 'עוד שעתיים', 'כל יום ב-8') למועד מדויק בפורמט ISO 8601 עם אזור זמן.",
    "אם המשתמש מבקש תזכורת חוזרת, קבע recurrence בהתאם (daily/weekly) ו-fire_at למופע הקרוב הבא.",
    "אם המשתמש מבקש לראות תזכורות -> intent=list_reminders. אם מבקש לבטל -> intent=cancel_reminders.",
    "אם לא הבנת בקשה לתזכורת -> intent=unknown והסבר בנימוס ב-reply.",
    "השדה reply תמיד בעברית, קצר וברור.",
  ].join("\n");
}

async function parseMessage(text) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: systemPrompt(),
    messages: [{ role: "user", content: text }],
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
    },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("לא התקבלה תשובה מהמודל");
  return JSON.parse(block.text);
}

module.exports = { parseMessage };
