/* CCNP Learning App — Hebrew
   Single-page app with hash routing, no build step. */

(function () {
  "use strict";

  // ===== State =====
  const STORE_KEY = "ccnp.app.v1";
  const defaultState = {
    completedTopics: {},   // topicId -> timestamp
    quizStats: {},         // category|"all" -> {attempts, correct, best}
    flashSeen: {},         // cardId -> {known: bool, ts}
    theme: null            // "dark" | "light" | null
  };
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(defaultState);
      return Object.assign(structuredClone(defaultState), JSON.parse(raw));
    } catch (e) {
      return structuredClone(defaultState);
    }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { /* quota */ }
  }

  // ===== Data shortcuts =====
  const cats = window.CCNP_CATEGORIES;
  const topics = window.CCNP_TOPICS;
  const questions = window.CCNP_QUESTIONS;
  const flash = window.CCNP_FLASHCARDS;
  const glossary = window.CCNP_GLOSSARY;
  const catById = Object.fromEntries(cats.map(c => [c.id, c]));
  const topicById = Object.fromEntries(topics.map(t => [t.id, t]));

  // ===== Utils =====
  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const view = $("#view");

  function tpl(id) { return document.getElementById(id).content.cloneNode(true); }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === "style" && typeof v === "object") {
        Object.assign(node.style, v);
      } else node.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function topicProgress(topicId) {
    return !!state.completedTopics[topicId];
  }

  function categoryProgress(catId) {
    const ts = topics.filter(t => t.category === catId);
    const done = ts.filter(t => topicProgress(t.id)).length;
    return { done, total: ts.length, pct: ts.length ? Math.round(done / ts.length * 100) : 0 };
  }

  function overallProgress() {
    const total = topics.length;
    const done = topics.filter(t => topicProgress(t.id)).length;
    return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
  }

  function nextTopic(id) {
    const i = topics.findIndex(t => t.id === id);
    return i >= 0 && i < topics.length - 1 ? topics[i + 1] : null;
  }
  function prevTopic(id) {
    const i = topics.findIndex(t => t.id === id);
    return i > 0 ? topics[i - 1] : null;
  }

  // ===== Theme =====
  function applyTheme() {
    const t = state.theme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", t);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    state.theme = cur === "dark" ? "light" : "dark";
    saveState(); applyTheme();
  }
  applyTheme();
  $("#themeToggle").addEventListener("click", toggleTheme);

  // ===== Router =====
  const routes = {
    "":            renderHome,
    "/":           renderHome,
    "/topics":     renderTopics,
    "/topic":      renderTopic,         // /topic/<id>
    "/quiz":       renderQuizHome,
    "/quiz/run":   renderQuizRun,       // /quiz/run/<mode>/<scope>
    "/flashcards": renderFlashcards,
    "/glossary":   renderGlossary,
    "/progress":   renderProgress
  };

  function parseHash() {
    let h = location.hash.replace(/^#/, "");
    if (!h) h = "/";
    const parts = h.split("/").filter(Boolean);
    const matchOrder = ["/quiz/run", "/topic", "/quiz", "/topics", "/flashcards", "/glossary", "/progress", "/"];
    for (const r of matchOrder) {
      const rp = r.split("/").filter(Boolean);
      if (rp.every((seg, i) => parts[i] === seg)) {
        return { route: r, params: parts.slice(rp.length) };
      }
    }
    return { route: "404", params: [] };
  }

  function navigate() {
    const { route, params } = parseHash();
    view.innerHTML = "";
    const fn = routes[route];
    if (!fn) {
      view.appendChild(tpl("tpl-404"));
    } else {
      try { fn(params); }
      catch (err) {
        console.error(err);
        view.appendChild(el("div", { class: "empty" }, el("h2", { text: "אירעה שגיאה" }), el("p", { text: String(err.message || err) })));
      }
    }
    view.focus({ preventScroll: false });
    updateActiveNav(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateActiveNav(route) {
    const map = {
      "/": "home", "": "home",
      "/topics": "topics", "/topic": "topics",
      "/quiz": "quiz", "/quiz/run": "quiz",
      "/flashcards": "flashcards",
      "/glossary": "glossary",
      "/progress": "progress"
    };
    const id = map[route];
    $$(".nav a").forEach(a => a.classList.toggle("is-active", a.dataset.route === id));
  }

  window.addEventListener("hashchange", navigate);

  // ===== Search =====
  const searchInput = $("#search");
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      if (q) location.hash = `#/topics?q=${encodeURIComponent(q)}`;
    }
  });

  // ===== Renderers =====

  function renderHome() {
    const node = tpl("tpl-home");

    // hero stats
    const stats = node.querySelector("#heroStats");
    stats.append(
      el("li", {}, el("strong", { text: topics.length }), el("span", { text: "שיעורים" })),
      el("li", {}, el("strong", { text: questions.length }), el("span", { text: "שאלות חידון" })),
      el("li", {}, el("strong", { text: flash.length }), el("span", { text: "פלאשקארדס" }))
    );

    // progress ring
    const o = overallProgress();
    const ring = node.querySelector("#progressRing");
    ring.style.setProperty("--val", o.pct);
    ring.setAttribute("data-label", `${o.pct}%`);

    const list = node.querySelector("#progressList");
    cats.slice(0, 5).forEach(c => {
      const p = categoryProgress(c.id);
      list.append(el("li", {},
        el("span", { text: `${c.icon} ${c.name}` }),
        el("span", { text: `${p.done}/${p.total}` })
      ));
    });

    // featured topics — first from each of first 6 categories
    const featured = node.querySelector("#featuredTopics");
    const picks = [];
    const seenCats = new Set();
    for (const t of topics) {
      if (!seenCats.has(t.category)) {
        picks.push(t); seenCats.add(t.category);
        if (picks.length >= 6) break;
      }
    }
    picks.forEach(t => featured.appendChild(topicCard(t)));

    view.appendChild(node);
  }

  function topicCard(t) {
    const c = catById[t.category];
    const done = topicProgress(t.id);
    return el("a", { class: "card", href: `#/topic/${t.id}` },
      el("div", { class: "card__tag", text: `${c.icon} ${c.name}` }),
      el("h3", { class: "card__title", text: t.title }),
      el("p", { class: "card__desc", text: t.summary }),
      el("div", { class: "card__bar" }, el("i", { style: { "--w": done ? "100%" : "0%" } })),
      el("div", { class: "card__meta" },
        el("span", { text: `${t.minutes} דקות · ${t.level || ""}`.trim() }),
        el("span", { text: done ? "✓ נלמד" : "התחלת לימוד" })
      )
    );
  }

  function renderTopics() {
    const node = tpl("tpl-topics");
    const filters = node.querySelector("#categoryFilters");
    const grid = node.querySelector("#topicsGrid");

    const url = new URL(location.href);
    const initialQ = new URLSearchParams(location.hash.split("?")[1] || "").get("q") || "";

    let activeCat = "all";
    let query = initialQ;

    const allChip = el("button", { class: "chip is-active", text: "הכול", onclick: () => set("all", null) });
    filters.appendChild(allChip);
    cats.forEach(c => {
      const chip = el("button", { class: "chip", text: `${c.icon} ${c.name}`, onclick: () => set(c.id, chip) });
      filters.appendChild(chip);
    });

    const searchBox = el("input", {
      class: "search search--block", type: "search",
      placeholder: "סינון לפי טקסט…", value: query,
      oninput: e => { query = e.target.value.toLowerCase(); draw(); }
    });
    node.querySelector(".page-head").appendChild(searchBox);

    function set(catId, chip) {
      activeCat = catId;
      $$(".chip", filters).forEach(c => c.classList.remove("is-active"));
      (chip || allChip).classList.add("is-active");
      draw();
    }

    function draw() {
      grid.innerHTML = "";
      const filtered = topics.filter(t => {
        if (activeCat !== "all" && t.category !== activeCat) return false;
        if (!query) return true;
        const hay = `${t.title} ${t.summary} ${t.body}`.toLowerCase();
        return hay.includes(query);
      });
      if (!filtered.length) {
        grid.appendChild(el("p", { class: "muted", text: "לא נמצאו תוצאות." }));
        return;
      }
      filtered.forEach(t => grid.appendChild(topicCard(t)));
    }

    draw();
    view.appendChild(node);
  }

  function renderTopic(params) {
    const id = params[0];
    const t = topicById[id];
    if (!t) { view.appendChild(tpl("tpl-404")); return; }

    const node = tpl("tpl-topic");
    const root = node.querySelector("#lessonRoot");
    const c = catById[t.category];
    const done = topicProgress(t.id);
    const prev = prevTopic(t.id);
    const next = nextTopic(t.id);

    root.append(
      el("div", { class: "lesson__head" },
        el("div", {},
          el("div", { class: "lesson__path", text: `${c.icon} ${c.name} · ${t.level || ""} · ${t.minutes} דק׳` }),
          el("h1", { text: t.title }),
          el("p", { class: "muted", text: t.summary })
        ),
        el("div", { class: "lesson__done" },
          el("button", {
            class: done ? "btn btn--primary" : "btn",
            text: done ? "✓ נלמד" : "סמן כנלמד",
            onclick: e => {
              if (state.completedTopics[t.id]) delete state.completedTopics[t.id];
              else state.completedTopics[t.id] = Date.now();
              saveState();
              navigate();
            }
          })
        )
      ),
      el("div", { class: "lesson__body", html: t.body }),
      el("div", { class: "lesson__nav" },
        prev ? el("a", { class: "btn", href: `#/topic/${prev.id}`, text: `← ${prev.title}` }) : el("span"),
        el("a", { class: "btn btn--primary", href: `#/quiz/run/topic/${t.id}`, text: "חידון על הנושא" }),
        next ? el("a", { class: "btn", href: `#/topic/${next.id}`, text: `${next.title} →` }) : el("span")
      )
    );

    view.appendChild(node);
  }

  // ====== Quiz ======
  function renderQuizHome() {
    const node = tpl("tpl-quiz-home");
    const grid = node.querySelector("#quizModes");

    const modes = [
      { title: "חידון מהיר (10 שאלות)", desc: "10 שאלות אקראיות מכל התחומים.", href: "#/quiz/run/mixed/10" },
      { title: "מבחן סימולציה (25 שאלות)", desc: "מבחן ארוך, סגנון מבחן הסמכה.", href: "#/quiz/run/mixed/25" },
      { title: "כל השאלות", desc: `${questions.length} שאלות — מצב לימוד.`, href: "#/quiz/run/mixed/all" }
    ];

    modes.forEach(m => {
      grid.appendChild(el("a", { class: "card", href: m.href },
        el("div", { class: "card__tag", text: "כללי" }),
        el("h3", { class: "card__title", text: m.title }),
        el("p", { class: "card__desc", text: m.desc })
      ));
    });

    // per category
    cats.forEach(c => {
      const count = questions.filter(q => q.category === c.id).length;
      if (!count) return;
      grid.appendChild(el("a", { class: "card", href: `#/quiz/run/category/${c.id}` },
        el("div", { class: "card__tag", text: `${c.icon} ${c.name}` }),
        el("h3", { class: "card__title", text: `חידון: ${c.name}` }),
        el("p", { class: "card__desc", text: `${count} שאלות בתחום` })
      ));
    });

    view.appendChild(node);
  }

  function renderQuizRun(params) {
    const [mode, scope] = params;
    if (!mode) { location.hash = "#/quiz"; return; }

    let pool = questions.slice();
    let title = "חידון";

    if (mode === "topic") {
      pool = questions.filter(q => q.topicId === scope);
      const t = topicById[scope];
      title = t ? `חידון: ${t.title}` : "חידון לפי נושא";
    } else if (mode === "category") {
      pool = questions.filter(q => q.category === scope);
      title = `חידון: ${catById[scope]?.name || scope}`;
    } else if (mode === "mixed") {
      pool = shuffle(questions);
      if (scope && scope !== "all") {
        const n = parseInt(scope, 10);
        if (!isNaN(n)) pool = pool.slice(0, n);
      }
      title = `חידון מעורב (${pool.length} שאלות)`;
    }

    if (!pool.length) {
      view.appendChild(el("div", { class: "empty" },
        el("h2", { text: "אין שאלות לתחום שנבחר" }),
        el("a", { class: "btn btn--primary", href: "#/quiz", text: "בחירת חידון אחר" })
      ));
      return;
    }

    pool = shuffle(pool);
    let idx = 0;
    let correctCount = 0;
    const answered = new Map();
    const node = tpl("tpl-quiz-run");
    const root = node.querySelector("#quizRoot");
    view.appendChild(node);

    drawQ();

    function drawQ() {
      root.innerHTML = "";
      const q = pool[idx];
      const total = pool.length;
      const pct = Math.round((idx) / total * 100);

      const progress = el("div", { class: "quiz__progress" }, el("i", { style: { "--p": `${pct}%` } }));
      const meta = el("div", { class: "quiz__meta" },
        el("span", { text: `${title}` }),
        el("span", { text: `שאלה ${idx + 1} מתוך ${total}` })
      );

      const options = el("ul", { class: "options" });
      const letters = ["א", "ב", "ג", "ד", "ה"];
      q.options.forEach((opt, i) => {
        const li = el("li", {},
          el("span", { class: "marker", text: letters[i] || (i + 1) }),
          el("div", { html: escapeHtml(opt) })
        );
        li.addEventListener("click", () => choose(i, li));
        options.appendChild(li);
      });

      const expl = el("div", { class: "quiz__explanation", style: { display: "none" } });
      const actions = el("div", { class: "quiz__actions" });

      const nextBtn = el("button", {
        class: "btn btn--primary",
        text: idx === total - 1 ? "סיום" : "הבא →",
        disabled: true,
        onclick: () => {
          if (idx === total - 1) finish();
          else { idx++; drawQ(); }
        }
      });
      const skipBtn = el("button", {
        class: "btn",
        text: "דלג",
        onclick: () => { if (idx < total - 1) { idx++; drawQ(); } else finish(); }
      });
      actions.append(nextBtn, skipBtn);

      root.append(progress, meta,
        el("h2", { class: "quiz__q", html: escapeHtml(q.q) }),
        options, expl, actions);

      function choose(i, li) {
        if (answered.has(q.id)) return;
        const correct = (i === q.correct);
        if (correct) correctCount++;
        answered.set(q.id, { picked: i, correct });

        $$(".options li", root).forEach((node, k) => {
          node.classList.add("is-revealed");
          node.style.pointerEvents = "none";
          if (k === q.correct) node.classList.add("is-correct");
          if (k === i && !correct) node.classList.add("is-wrong");
        });
        expl.style.display = "";
        expl.innerHTML = `<strong>${correct ? "תשובה נכונה!" : "תשובה שגויה."}</strong> ${escapeHtml(q.explain || "")}`;
        nextBtn.disabled = false;
        nextBtn.focus();
      }
    }

    function finish() {
      const total = pool.length;
      const pct = Math.round(correctCount / total * 100);
      // Save stats
      const scopeKey = mode === "category" ? scope : (mode === "topic" ? `topic:${scope}` : "all");
      const cur = state.quizStats[scopeKey] || { attempts: 0, correct: 0, best: 0, total: 0 };
      cur.attempts += 1;
      cur.correct += correctCount;
      cur.total += total;
      cur.best = Math.max(cur.best, pct);
      state.quizStats[scopeKey] = cur;
      saveState();

      root.innerHTML = "";
      root.append(
        el("div", { class: "quiz__result" },
          el("h2", { text: "סיכום החידון" }),
          el("div", { class: "quiz__score", text: `${pct}%` }),
          el("p", { class: "muted", text: `${correctCount} מתוך ${total} תשובות נכונות` })
        ),
        el("div", { class: "quiz__actions" },
          el("a", { class: "btn btn--primary", href: "javascript:void(0)", text: "התחל שוב",
                    onclick: () => { idx = 0; correctCount = 0; answered.clear(); pool = shuffle(pool); drawQ(); } }),
          el("a", { class: "btn", href: "#/quiz", text: "לרשימת החידונים" }),
          el("a", { class: "btn btn--ghost", href: "#/progress", text: "התקדמות" })
        )
      );
    }
  }

  // ====== Flashcards ======
  function renderFlashcards() {
    const node = tpl("tpl-flashcards");
    const filters = node.querySelector("#deckFilters");
    const stage = node.querySelector("#flashStage");

    let activeDeck = "all";
    let cards = flash.slice();
    let i = 0;

    const allChip = el("button", { class: "chip is-active", text: "כל החפיסות", onclick: () => set("all", null) });
    filters.appendChild(allChip);
    cats.forEach(c => {
      const has = flash.some(f => f.deck === c.id);
      if (!has) return;
      const chip = el("button", { class: "chip", text: `${c.icon} ${c.name}`, onclick: () => set(c.id, chip) });
      filters.appendChild(chip);
    });

    function set(deck, chip) {
      activeDeck = deck;
      $$(".chip", filters).forEach(c => c.classList.remove("is-active"));
      (chip || allChip).classList.add("is-active");
      cards = deck === "all" ? flash.slice() : flash.filter(f => f.deck === deck);
      cards = shuffle(cards);
      i = 0; draw();
    }

    function draw() {
      stage.innerHTML = "";
      if (!cards.length) {
        stage.appendChild(el("p", { class: "muted", text: "אין כרטיסים בחפיסה זו." }));
        return;
      }
      const card = cards[i];
      const seen = state.flashSeen[card.id] || {};
      const deckMeta = catById[card.deck];

      const flashEl = el("div", { class: "flashcard", tabindex: "0" },
        el("div", { class: "flashcard__inner" },
          el("div", { class: "flashcard__face" },
            el("small", { text: `${deckMeta?.icon || ""} ${deckMeta?.name || ""}` }),
            el("div", { html: escapeHtml(card.front) })
          ),
          el("div", { class: "flashcard__face flashcard__face--back" },
            el("small", { text: "תשובה" }),
            el("div", { html: escapeHtml(card.back) })
          )
        )
      );
      flashEl.addEventListener("click", () => flashEl.classList.toggle("is-flipped"));

      const counter = el("p", { class: "flashcard-counter", text: `כרטיס ${i + 1} מתוך ${cards.length}${seen.known ? " · סומן 'ידעתי'" : ""}` });
      const tools = el("div", { class: "flashcard-toolbar" },
        el("button", { class: "btn", text: "← קודם", onclick: prev }),
        el("button", { class: "btn", text: "הפוך (רווח)", onclick: () => flashEl.classList.toggle("is-flipped") }),
        el("button", { class: "btn btn--ghost", text: "לא ידעתי", onclick: () => mark(false) }),
        el("button", { class: "btn btn--primary", text: "ידעתי ✓", onclick: () => mark(true) }),
        el("button", { class: "btn", text: "הבא →", onclick: next })
      );

      stage.append(flashEl, counter, tools);
      flashEl.focus();
    }
    function next() { i = (i + 1) % cards.length; draw(); }
    function prev() { i = (i - 1 + cards.length) % cards.length; draw(); }
    function mark(known) {
      const card = cards[i];
      state.flashSeen[card.id] = { known, ts: Date.now() };
      saveState();
      next();
    }

    cards = shuffle(cards);
    draw();
    view.appendChild(node);

    // Keyboard
    const onKey = e => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " ") { e.preventDefault(); $(".flashcard", stage)?.classList.toggle("is-flipped"); }
      else if (e.key === "ArrowLeft")  next();
      else if (e.key === "ArrowRight") prev();
      else if (e.key.toLowerCase() === "k") mark(true);
      else if (e.key.toLowerCase() === "n") mark(false);
    };
    document.addEventListener("keydown", onKey);
    view.addEventListener("DOMNodeRemoved", () => document.removeEventListener("keydown", onKey), { once: true });
  }

  // ====== Glossary ======
  function renderGlossary() {
    const node = tpl("tpl-glossary");
    const list = node.querySelector("#glossaryList");
    const search = node.querySelector("#glossarySearch");

    function draw(q) {
      list.innerHTML = "";
      const items = !q ? glossary :
        glossary.filter(g => (`${g.term} ${g.english} ${g.def}`).toLowerCase().includes(q));
      if (!items.length) {
        list.appendChild(el("p", { class: "muted", text: "לא נמצאו מונחים." }));
        return;
      }
      items
        .slice()
        .sort((a, b) => a.term.localeCompare(b.term))
        .forEach(g => {
          list.appendChild(el("div", { class: "glossary__item" },
            el("div", { class: "glossary__term" },
              el("strong", { text: g.term }),
              el("em", { text: g.english || "" })
            ),
            el("p", { text: g.def || "" })
          ));
        });
    }
    search.addEventListener("input", e => draw(e.target.value.toLowerCase().trim()));
    draw("");
    view.appendChild(node);
  }

  // ====== Progress ======
  function renderProgress() {
    const node = tpl("tpl-progress");
    const grid = node.querySelector("#progressGrid");

    const o = overallProgress();
    grid.appendChild(progressCard("סה״כ נושאים", `${o.done}/${o.total}`, o.pct));

    cats.forEach(c => {
      const p = categoryProgress(c.id);
      grid.appendChild(progressCard(`${c.icon} ${c.name}`, `${p.done}/${p.total}`, p.pct));
    });

    // Quiz stats
    const stats = state.quizStats || {};
    Object.entries(stats).forEach(([key, s]) => {
      let name = "כל החידונים";
      if (key.startsWith("topic:")) {
        const t = topicById[key.split(":")[1]];
        name = `חידון נושא: ${t?.title || key}`;
      } else if (key !== "all") {
        name = `חידון ${catById[key]?.name || key}`;
      }
      const avg = s.total ? Math.round(s.correct / s.total * 100) : 0;
      grid.appendChild(progressCard(name, `ניסיונות: ${s.attempts} · ממוצע: ${avg}%`, s.best));
    });

    // Flashcards
    const total = flash.length;
    const known = Object.values(state.flashSeen).filter(s => s.known).length;
    grid.appendChild(progressCard("פלאשקארדס שסומנו 'ידעתי'", `${known}/${total}`, total ? Math.round(known / total * 100) : 0));

    node.querySelector("#resetProgress").addEventListener("click", () => {
      if (confirm("לאפס את כל ההתקדמות? פעולה זו אינה הפיכה.")) {
        state = structuredClone(defaultState);
        saveState(); navigate();
      }
    });

    view.appendChild(node);
  }

  function progressCard(title, sub, pct) {
    return el("div", { class: "progress-card" },
      el("h3", { text: title }),
      el("div", { class: "bar" }, el("i", { style: { "--w": `${pct}%` } })),
      el("div", { class: "meta" },
        el("span", { text: sub }),
        el("span", { text: `${pct}%` })
      )
    );
  }

  // ===== Helpers =====
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ===== Global keys =====
  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
  });

  // ===== Boot =====
  navigate();
})();
