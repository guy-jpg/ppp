/* ===== שגרת היום – ניהול משימות יומיות =====
   אפליקציה מבוססת דפדפן בלבד. הנתונים נשמרים ב-localStorage.
   ----------------------------------------------------------------
   מבנה הנתונים:
   tasks: [{ id, title, time, icon, done }]
   streak: { count, lastCompletedDate }
   lastResetDate: "YYYY-MM-DD"  – לאיפוס יומי של סימוני ההשלמה
*/

const STORAGE_KEY = 'daily-routine-v1';

const ICONS = ['📝', '💪', '📚', '🍎', '💧', '🧘', '💼', '🛌', '☎️', '🧹'];

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/* ---------- מצב ---------- */
let state = {
  tasks: [],
  streak: { count: 0, lastCompletedDate: null },
  lastResetDate: null
};
let selectedIcon = ICONS[0];
let currentFilter = 'all';

/* ---------- עזרי תאריך ---------- */
function todayKey() {
  const d = new Date();
  // מפתח מקומי כדי להימנע מהיסט אזור זמן
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- שמירה / טעינה ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
      if (!state.streak) state.streak = { count: 0, lastCompletedDate: null };
    }
  } catch (e) {
    console.warn('שגיאה בטעינת נתונים', e);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('שגיאה בשמירת נתונים', e);
  }
}

/* ---------- איפוס יומי ---------- */
// בכל יום חדש מאפסים את סימוני ההשלמה אך שומרים על המשימות והרצף.
function applyDailyReset() {
  const today = todayKey();
  if (state.lastResetDate !== today) {
    state.tasks.forEach(t => { t.done = false; });
    state.lastResetDate = today;
    save();
  }
}

/* ---------- לוגיקת רצף ---------- */
function updateStreak() {
  const today = todayKey();
  const allDone = state.tasks.length > 0 && state.tasks.every(t => t.done);

  if (allDone) {
    if (state.streak.lastCompletedDate === today) return; // כבר נספר היום
    if (state.streak.lastCompletedDate === yesterdayKey()) {
      state.streak.count += 1; // המשך הרצף
    } else {
      state.streak.count = 1; // התחלת רצף חדש
    }
    state.streak.lastCompletedDate = today;
    save();
  }
}

/* ---------- פעולות ---------- */
function addTask(title, time, icon) {
  state.tasks.push({ id: uid(), title: title.trim(), time: time || '', icon, done: false });
  sortTasks();
  save();
  render();
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  updateStreak();
  save();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(x => x.id !== id);
  save();
  render();
}

// מיון לפי שעה (משימות ללא שעה בסוף)
function sortTasks() {
  state.tasks.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

/* ---------- תצוגה ---------- */
function greetingText() {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function renderDate() {
  const d = new Date();
  const txt = `יום ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ב${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('today-date').textContent = txt;
}

function renderSummary() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('greeting').textContent = greetingText() + '!';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${total}`;
  document.getElementById('streak-num').textContent = state.streak.count;

  let sub;
  if (total === 0) sub = 'בוא נתחיל את היום — הוסף משימה ראשונה';
  else if (done === total) sub = '🎉 כל הכבוד! סיימת את כל המשימות להיום';
  else if (done === 0) sub = `יש ${total} משימות מחכות לך`;
  else sub = `נשארו ${total - done} משימות — אתה בדרך הנכונה!`;
  document.getElementById('summary-sub').textContent = sub;
}

function filteredTasks() {
  if (currentFilter === 'active') return state.tasks.filter(t => !t.done);
  if (currentFilter === 'done') return state.tasks.filter(t => t.done);
  return state.tasks;
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const tasks = filteredTasks();

  list.innerHTML = '';

  if (state.tasks.length === 0) {
    empty.hidden = false;
    empty.querySelector('p').textContent = 'אין משימות עדיין — הוסף את המשימה הראשונה שלך!';
    return;
  }
  if (tasks.length === 0) {
    empty.hidden = false;
    empty.querySelector('p').textContent = 'אין משימות בתצוגה הזו.';
    return;
  }
  empty.hidden = true;

  tasks.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' done' : '');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = t.done;
    check.setAttribute('aria-label', 'סמן כהושלם');
    check.addEventListener('change', () => toggleTask(t.id));

    const icon = document.createElement('span');
    icon.className = 'task-icon';
    icon.textContent = t.icon;

    const body = document.createElement('div');
    body.className = 'task-body';
    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = t.title;
    body.appendChild(title);
    if (t.time) {
      const time = document.createElement('div');
      time.className = 'task-time';
      time.textContent = '🕐 ' + t.time;
      body.appendChild(time);
    }

    const del = document.createElement('button');
    del.className = 'task-del';
    del.textContent = '🗑️';
    del.title = 'מחק משימה';
    del.setAttribute('aria-label', 'מחק משימה');
    del.addEventListener('click', () => {
      if (confirm(`למחוק את המשימה "${t.title}"?`)) deleteTask(t.id);
    });

    li.append(check, icon, body, del);
    list.appendChild(li);
  });
}

function render() {
  renderSummary();
  renderTasks();
}

/* ---------- אתחול ממשק ---------- */
function buildIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = '';
  ICONS.forEach((ic, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-opt' + (i === 0 ? ' selected' : '');
    btn.textContent = ic;
    btn.addEventListener('click', () => {
      selectedIcon = ic;
      picker.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    picker.appendChild(btn);
  });
}

function bindForm() {
  document.getElementById('add-form').addEventListener('submit', e => {
    e.preventDefault();
    const titleEl = document.getElementById('task-title');
    const timeEl = document.getElementById('task-time');
    const title = titleEl.value.trim();
    if (!title) return;
    addTask(title, timeEl.value, selectedIcon);
    titleEl.value = '';
    timeEl.value = '';
    titleEl.focus();
  });
}

function bindFilters() {
  document.getElementById('filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
  });
}

/* ---------- הפעלה ---------- */
function init() {
  load();
  applyDailyReset();
  sortTasks();
  renderDate();
  buildIconPicker();
  bindForm();
  bindFilters();
  render();
}

document.addEventListener('DOMContentLoaded', init);
