"use strict";

// אחסון פשוט מבוסס קובץ JSON. שורד אתחול של התהליך/השרת.
// כל תזכורת: { id, chatId, message, fireAt (ISO), recurrence, createdAt, done }

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "reminders.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf8");
}

function load() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(reminders) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(reminders, null, 2), "utf8");
}

function add(reminder) {
  const reminders = load();
  reminders.push(reminder);
  save(reminders);
  return reminder;
}

function update(id, patch) {
  const reminders = load();
  const idx = reminders.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  reminders[idx] = { ...reminders[idx], ...patch };
  save(reminders);
  return reminders[idx];
}

function remove(id) {
  const reminders = load();
  const next = reminders.filter((r) => r.id !== id);
  save(next);
  return reminders.length !== next.length;
}

function pending(chatId) {
  return load().filter((r) => !r.done && (!chatId || r.chatId === chatId));
}

module.exports = { load, save, add, update, remove, pending };
