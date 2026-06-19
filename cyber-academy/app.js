// ===== Cyber Academy App =====

const STORAGE_KEY = 'cyber_progress';

// תוכנית הלימוד – מסלול מובנה
const ROADMAP = [
  { phase: "שלב 0 – חימום", weeks: "שבוע 1", color: "#94a3b8",
    items: ["הקמת מעבדה ביתית (VirtualBox/VMware)", "Cyberium Arena – זירת האימון", "Git ותיעוד"],
    topics: ["cyberium"] },
  { phase: "שלב 1 – מערכות הפעלה", weeks: "שבועות 2–5", color: "#f59e0b",
    items: ["Linux: shell, הרשאות, רשת, scripting", "Windows Forensics: artifacts, זיכרון, timeline"],
    topics: ["linux", "winforensics"] },
  { phase: "שלב 2 – Python", weeks: "שבועות 6–8", color: "#3b82f6",
    items: ["יסודות → אוטומציה", "sockets, scapy, requests", "פרויקט: מנתח לוגים"],
    topics: ["python"] },
  { phase: "שלב 3 – הגנה היקפית", weeks: "שבועות 9–12", color: "#dc2626",
    items: ["pfSense: Firewall, NAT, VPN, VLAN", "IDS/IPS: Snort/Suricata, כתיבת חוקים"],
    topics: ["pfsense", "idsips"] },
  { phase: "שלב 4 – חשיבה התקפית", weeks: "שבועות 13–17", color: "#7c3aed",
    items: ["Metasploit: exploitation, Meterpreter", "MITRE ATT&CK: מיפוי TTPs"],
    topics: ["metasploit", "mitre"] },
  { phase: "שלב 5 – ענן ועתיד", weeks: "שבועות 18–22", color: "#f97316",
    items: ["AWS: IAM, VPC, אבטחת ענן", "AI in Cyber: הגנה, איומים, אבטחת LLM"],
    topics: ["aws", "ai"] },
  { phase: "שלב 6 – פרויקט גמר", weeks: "שבועות 23–28", color: "#10b981",
    items: ["תרחיש Red vs Blue מלא בזירה", "דוח חקירה + portfolio ב-GitHub"],
    topics: [] }
];

const App = {
  currentPage: 'home',
  quizState: null,
  progress: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),

  init() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });
    this.navigate('home');
  },

  navigate(page, data = null) {
    this.currentPage = page;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    switch (page) {
      case 'home':         main.appendChild(this.renderHome()); break;
      case 'roadmap':      main.appendChild(this.renderRoadmap()); break;
      case 'topics':       main.appendChild(this.renderTopics()); break;
      case 'topic':        main.appendChild(this.renderTopicDetail(data)); break;
      case 'quiz':         main.appendChild(this.renderQuizSetup()); break;
      case 'quiz-run':     main.appendChild(this.renderQuiz(data)); break;
      case 'quiz-results': main.appendChild(this.renderResults(data)); break;
      case 'progress':     main.appendChild(this.renderProgress()); break;
    }
    window.scrollTo(0, 0);
  },

  saveProgress(topicId, subtopicIdx) {
    if (!this.progress[topicId]) this.progress[topicId] = {};
    this.progress[topicId][subtopicIdx] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
  },

  getTopicProgress(topicId) {
    const topic = TOPICS.find(t => t.id === topicId);
    if (!topic) return 0;
    const viewed = Object.keys(this.progress[topicId] || {}).length;
    return Math.round((viewed / topic.subtopics.length) * 100);
  },

  getTotalProgress() {
    if (!TOPICS.length) return 0;
    const total = TOPICS.reduce((sum, t) => sum + this.getTopicProgress(t.id), 0);
    return Math.round(total / TOPICS.length);
  },

  // ===== HOME =====
  renderHome() {
    const div = document.createElement('div');
    div.className = 'page';
    div.innerHTML = `
      <div class="home-hero">
        <h1>🛡️ Cyber Academy</h1>
        <p>המסלול המלא להפיכתך ללוחם סייבר — מהיסודות ועד תקיפה והגנה מתקדמת. כל מה שצריך כדי לשלוט, במקום אחד.</p>
        <div class="hero-stats">
          <div class="stat-box"><span class="num">${TOPICS.length}</span><span class="lbl">תחומים</span></div>
          <div class="stat-box"><span class="num">${TOTAL_SUBTOPICS}</span><span class="lbl">פרקי לימוד</span></div>
          <div class="stat-box"><span class="num">${QUESTIONS.length}</span><span class="lbl">שאלות תרגול</span></div>
          <div class="stat-box"><span class="num">${this.getTotalProgress()}%</span><span class="lbl">התקדמות</span></div>
        </div>
      </div>

      <div class="section-title">🎓 כל תחומי הלימוד</div>
      <div class="topics-grid" id="home-topics"></div>

      <div class="section-title">🚀 פעולות מהירות</div>
      <div class="topics-grid">
        <div class="topic-card" id="go-roadmap" style="--card-color:#10b981">
          <span class="tc-icon">🗺️</span>
          <div class="tc-name">תוכנית הלימוד המלאה</div>
          <div class="tc-desc">המסלול המובנה – 28 שבועות, שלב אחר שלב</div>
        </div>
        <div class="topic-card" id="quick-quiz" style="--card-color:#ef4444">
          <span class="tc-icon">✏️</span>
          <div class="tc-name">תרגול מהיר – 10 שאלות</div>
          <div class="tc-desc">שאלות אקראיות מכל התחומים</div>
        </div>
        <div class="topic-card" id="full-quiz" style="--card-color:#7c3aed">
          <span class="tc-icon">🏆</span>
          <div class="tc-name">מבחן מקיף</div>
          <div class="tc-desc">כל השאלות – בדוק את הידע שלך</div>
        </div>
      </div>
    `;

    const grid = div.querySelector('#home-topics');
    TOPICS.forEach(topic => {
      const prog = this.getTopicProgress(topic.id);
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.style.setProperty('--card-color', topic.color);
      card.innerHTML = `
        <span class="tc-icon">${topic.icon}</span>
        <div class="tc-name">${topic.name}</div>
        <div class="tc-desc">${topic.description}</div>
        <div class="tc-progress"><div class="tc-progress-fill" style="width:${prog}%"></div></div>
        <div class="tc-meta"><span>${topic.subtopics.length} פרקים</span><span>${prog}% הושלם</span></div>
      `;
      card.addEventListener('click', () => this.navigate('topic', topic.id));
      grid.appendChild(card);
    });

    div.querySelector('#go-roadmap').addEventListener('click', () => this.navigate('roadmap'));
    div.querySelector('#quick-quiz').addEventListener('click', () =>
      this.navigate('quiz-run', { questions: this.shuffleArray([...QUESTIONS]).slice(0, 10), topicName: 'כל התחומים' }));
    div.querySelector('#full-quiz').addEventListener('click', () =>
      this.navigate('quiz-run', { questions: this.shuffleArray([...QUESTIONS]), topicName: 'מבחן מקיף' }));

    return div;
  },

  // ===== ROADMAP =====
  renderRoadmap() {
    const div = document.createElement('div');
    div.className = 'page';
    div.innerHTML = `
      <div class="section-title">🗺️ מסלול "Cyber Warrior" – תוכנית הלימוד המלאה</div>
      <p style="color:var(--text-muted);margin-bottom:24px">מסע מובנה של כ-28 שבועות. לחץ על תחום כדי לקפוץ לחומר הלימוד שלו.</p>
      <div class="timeline" id="timeline"></div>
    `;
    const tl = div.querySelector('#timeline');
    ROADMAP.forEach(stage => {
      const node = document.createElement('div');
      node.className = 'timeline-item';
      node.style.setProperty('--stage-color', stage.color);
      const topicChips = stage.topics.map(id => {
        const t = TOPICS.find(x => x.id === id);
        return t ? `<span class="chip" data-topic="${id}">${t.icon} ${t.name}</span>` : '';
      }).join('');
      node.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="timeline-head">
            <span class="timeline-phase">${stage.phase}</span>
            <span class="timeline-weeks">${stage.weeks}</span>
          </div>
          <ul>${stage.items.map(i => `<li>${i}</li>`).join('')}</ul>
          ${topicChips ? `<div class="chip-row">${topicChips}</div>` : ''}
        </div>
      `;
      tl.appendChild(node);
    });
    div.querySelectorAll('.chip').forEach(chip =>
      chip.addEventListener('click', () => this.navigate('topic', chip.dataset.topic)));
    return div;
  },

  // ===== TOPICS =====
  renderTopics() {
    const div = document.createElement('div');
    div.className = 'page';
    div.innerHTML = `
      <div class="section-title">🎓 כל תחומי הלימוד</div>
      <div class="topics-grid" id="all-topics"></div>
    `;
    const grid = div.querySelector('#all-topics');
    TOPICS.forEach(topic => {
      const prog = this.getTopicProgress(topic.id);
      const qCount = (QUESTIONS_BY_TOPIC[topic.id] || []).length;
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.style.setProperty('--card-color', topic.color);
      card.innerHTML = `
        <span class="tc-icon">${topic.icon}</span>
        <div class="tc-name">${topic.name}</div>
        <div class="tc-desc">${topic.description}</div>
        <div class="topic-tags">${topic.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="tc-progress" style="margin-top:12px"><div class="tc-progress-fill" style="width:${prog}%"></div></div>
        <div class="tc-meta"><span>${topic.subtopics.length} פרקים · ${qCount} שאלות</span><span>${prog}%</span></div>
      `;
      card.addEventListener('click', () => this.navigate('topic', topic.id));
      grid.appendChild(card);
    });
    return div;
  },

  // ===== TOPIC DETAIL =====
  renderTopicDetail(topicId) {
    const topic = TOPICS.find(t => t.id === topicId);
    if (!topic) return this.renderHome();

    const div = document.createElement('div');
    div.className = 'page topic-detail';
    div.innerHTML = `
      <button class="back-btn" id="back-btn">← חזור לתחומים</button>
      <div class="topic-header" style="border-right:4px solid ${topic.color}">
        <h2>${topic.icon} ${topic.name} – ${topic.fullName}</h2>
        <p>${topic.description}</p>
        <div class="topic-tags">${topic.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      <div class="section-title">📖 פרקי הלימוד</div>
      <div class="subtopics-list" id="subtopics-list"></div>
      <br>
      <div class="section-title">✏️ תרגול</div>
      <button class="btn-start" id="topic-quiz" style="max-width:320px">תרגל שאלות על ${topic.name}</button>
    `;

    div.querySelector('#back-btn').addEventListener('click', () => this.navigate('topics'));

    const list = div.querySelector('#subtopics-list');
    topic.subtopics.forEach((sub, idx) => {
      const isViewed = this.progress[topicId]?.[idx];
      const item = document.createElement('div');
      item.className = 'subtopic-item';
      item.innerHTML = `
        <div class="subtopic-header">
          <span class="subtopic-title">${isViewed ? '✅' : '📖'} ${sub.title}</span>
          <span class="subtopic-chevron">⌄</span>
        </div>
        <div class="subtopic-content">${sub.content}</div>
      `;
      item.querySelector('.subtopic-header').addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        list.querySelectorAll('.subtopic-item').forEach(i => i.classList.remove('open'));
        if (!wasOpen) {
          item.classList.add('open');
          this.saveProgress(topicId, idx);
          item.querySelector('.subtopic-title').textContent = `✅ ${sub.title}`;
        }
      });
      list.appendChild(item);
    });

    const topicQuestions = QUESTIONS_BY_TOPIC[topicId] || [];
    const quizBtn = div.querySelector('#topic-quiz');
    if (topicQuestions.length === 0) {
      quizBtn.disabled = true;
      quizBtn.textContent = 'אין שאלות לתחום זה עדיין';
    } else {
      quizBtn.addEventListener('click', () =>
        this.navigate('quiz-run', { questions: this.shuffleArray([...topicQuestions]), topicName: topic.name }));
    }
    return div;
  },

  // ===== QUIZ SETUP =====
  renderQuizSetup() {
    const div = document.createElement('div');
    div.className = 'page quiz-setup';
    div.innerHTML = `
      <h2>✏️ בחר תרגול</h2>
      <p>בחר תחום ומספר שאלות כדי להתחיל</p>
      <div class="section-title">תחום</div>
      <div class="quiz-options-grid" id="topic-options">
        <div class="quiz-option-card selected" data-topic="all">
          <span class="qoc-icon">🌐</span>
          <div class="qoc-name">כל התחומים</div>
          <div class="qoc-count">${QUESTIONS.length} שאלות</div>
        </div>
        ${TOPICS.map(t => `
          <div class="quiz-option-card" data-topic="${t.id}">
            <span class="qoc-icon">${t.icon}</span>
            <div class="qoc-name">${t.name}</div>
            <div class="qoc-count">${(QUESTIONS_BY_TOPIC[t.id]||[]).length} שאלות</div>
          </div>
        `).join('')}
      </div>
      <div class="form-group">
        <label>מספר שאלות</label>
        <select id="question-count">
          <option value="5">5 שאלות – תרגול קצר</option>
          <option value="10" selected>10 שאלות – תרגול רגיל</option>
          <option value="20">20 שאלות – מבחן מורחב</option>
          <option value="all">כל השאלות</option>
        </select>
      </div>
      <button class="btn-start" id="start-quiz-btn">🚀 התחל</button>
    `;

    let selectedTopic = 'all';
    div.querySelectorAll('.quiz-option-card').forEach(card => {
      card.addEventListener('click', () => {
        div.querySelectorAll('.quiz-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTopic = card.dataset.topic;
      });
    });

    div.querySelector('#start-quiz-btn').addEventListener('click', () => {
      const countVal = div.querySelector('#question-count').value;
      let pool = selectedTopic === 'all' ? [...QUESTIONS] : [...(QUESTIONS_BY_TOPIC[selectedTopic] || [])];
      if (pool.length === 0) return;
      pool = this.shuffleArray(pool);
      if (countVal !== 'all') pool = pool.slice(0, parseInt(countVal));
      const topicName = selectedTopic === 'all' ? 'כל התחומים' : TOPICS.find(t => t.id === selectedTopic)?.name || '';
      this.navigate('quiz-run', { questions: pool, topicName });
    });

    return div;
  },

  // ===== QUIZ RUN =====
  renderQuiz(data) {
    this.quizState = { questions: data.questions, topicName: data.topicName, current: 0, answers: [], answered: false };
    const div = document.createElement('div');
    div.className = 'page';
    div.id = 'quiz-container';
    this.renderQuestion(div);
    return div;
  },

  renderQuestion(container) {
    const state = this.quizState;
    const q = state.questions[state.current];
    const total = state.questions.length;
    const pct = Math.round((state.current / total) * 100);

    container.innerHTML = `
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <div class="quiz-meta">
        <span>שאלה ${state.current + 1} מתוך ${total}</span>
        <span>📚 ${state.topicName}</span>
      </div>
      <div class="question-card">
        <div class="question-num">
          <span class="question-topic-tag">${q.topicName}</span>
          שאלה ${state.current + 1}
        </div>
        <div class="question-text">${q.question}</div>
        <div class="answers-grid" id="answers-grid">
          ${q.answers.map((a, i) => `
            <button class="answer-btn" data-idx="${i}">
              <span class="answer-letter">${String.fromCharCode(65 + i)}</span>
              <span>${a}</span>
            </button>`).join('')}
        </div>
        <div class="explanation-box" id="explanation"><strong>הסבר:</strong> ${q.explanation}</div>
      </div>
      <div class="quiz-actions">
        <button class="btn-next" id="btn-next">${state.current < total - 1 ? 'שאלה הבאה ←' : 'סיים 🏁'}</button>
      </div>
    `;

    container.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.answered) return;
        state.answered = true;
        const chosen = parseInt(btn.dataset.idx);
        const correct = q.correct;
        state.answers.push({ chosen, correct, isCorrect: chosen === correct });
        container.querySelectorAll('.answer-btn').forEach((b, i) => {
          b.disabled = true;
          if (i === correct) b.classList.add('correct');
          else if (i === chosen) b.classList.add('wrong');
        });
        container.querySelector('#explanation').classList.add('show');
        container.querySelector('#btn-next').classList.add('show');
      });
    });

    container.querySelector('#btn-next').addEventListener('click', () => {
      state.current++;
      state.answered = false;
      if (state.current >= state.questions.length) {
        this.navigate('quiz-results', { answers: state.answers, topicName: state.topicName });
      } else {
        this.renderQuestion(container);
      }
    });
  },

  // ===== RESULTS =====
  renderResults(data) {
    const { answers, topicName } = data;
    const correct = answers.filter(a => a.isCorrect).length;
    const total = answers.length;
    const pct = Math.round((correct / total) * 100);
    const grade = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : 'poor';
    const msg = pct >= 80 ? '🎉 מצוין! שליטה מרשימה' : pct >= 60 ? '👍 עברת! יש מקום לחזק' : '💪 להמשיך לתרגל – אתה בדרך!';

    if (!this.progress._quizHistory) this.progress._quizHistory = [];
    this.progress._quizHistory.push({ date: new Date().toLocaleDateString('he-IL'), pct, topicName, correct, total });
    if (this.progress._quizHistory.length > 20) this.progress._quizHistory = this.progress._quizHistory.slice(-20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));

    const div = document.createElement('div');
    div.className = 'page quiz-results';
    div.innerHTML = `
      <div class="results-circle ${grade}">
        <span class="score-num">${pct}%</span>
        <span class="score-label">${correct}/${total}</span>
      </div>
      <div class="results-title">${msg}</div>
      <div class="results-sub">תחום: ${topicName}</div>
      <div class="results-stats">
        <div class="results-stat r-correct"><span class="rs-num">${correct}</span><span class="rs-lbl">✅ נכון</span></div>
        <div class="results-stat r-wrong"><span class="rs-num">${total - correct}</span><span class="rs-lbl">❌ שגוי</span></div>
        <div class="results-stat"><span class="rs-num">${total}</span><span class="rs-lbl">📝 סה"כ</span></div>
      </div>
      <div class="results-btns">
        <button class="btn-start" id="retry-btn" style="width:auto">🔄 נסה שוב</button>
        <button class="btn-secondary" id="home-btn">🏠 בית</button>
        <button class="btn-secondary" id="progress-btn">📊 התקדמות</button>
      </div>
    `;
    div.querySelector('#retry-btn').addEventListener('click', () => this.navigate('quiz'));
    div.querySelector('#home-btn').addEventListener('click', () => this.navigate('home'));
    div.querySelector('#progress-btn').addEventListener('click', () => this.navigate('progress'));
    return div;
  },

  // ===== PROGRESS =====
  renderProgress() {
    const div = document.createElement('div');
    div.className = 'page';
    const totalRead = TOPICS.reduce((sum, t) => sum + Object.keys(this.progress[t.id] || {}).length, 0);
    const history = this.progress._quizHistory || [];
    const avgScore = history.length ? Math.round(history.reduce((s, h) => s + h.pct, 0) / history.length) : 0;
    const bestScore = history.length ? Math.max(...history.map(h => h.pct)) : 0;

    div.innerHTML = `
      <div class="section-title">📊 הסטטיסטיקות שלי</div>
      <div class="stats-overview">
        <div class="stat-card sc-blue"><span class="sc-icon">📖</span><div><span class="sc-num">${totalRead}</span><div class="sc-lbl">פרקים נקראו</div></div></div>
        <div class="stat-card sc-green"><span class="sc-icon">✏️</span><div><span class="sc-num">${history.length}</span><div class="sc-lbl">תרגולים הושלמו</div></div></div>
        <div class="stat-card sc-yellow"><span class="sc-icon">⭐</span><div><span class="sc-num">${avgScore}%</span><div class="sc-lbl">ממוצע</div></div></div>
        <div class="stat-card sc-green"><span class="sc-icon">🏆</span><div><span class="sc-num">${bestScore}%</span><div class="sc-lbl">שיא</div></div></div>
      </div>
      <div class="section-title">התקדמות לפי תחום</div>
      <div class="progress-grid" id="topic-progress"></div>
      ${history.length > 0 ? `
        <div class="section-title" style="margin-top:32px">היסטוריית תרגולים</div>
        <div class="progress-card">
          ${history.slice().reverse().map(h => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="color:var(--text-muted);font-size:0.82rem">${h.date}</span>
              <span style="color:var(--text)">${h.topicName}</span>
              <span style="font-weight:700;color:${h.pct>=80?'var(--secondary)':h.pct>=60?'var(--warning)':'var(--danger)'}">${h.pct}%</span>
            </div>`).join('')}
        </div>` : ''}
    `;

    const grid = div.querySelector('#topic-progress');
    TOPICS.forEach(topic => {
      const prog = this.getTopicProgress(topic.id);
      const card = document.createElement('div');
      card.className = 'progress-card';
      card.innerHTML = `
        <h3 style="color:${topic.color}">${topic.icon} ${topic.name}</h3>
        <div class="progress-bar-wrap">
          <div class="progress-bar-label"><span>קריאה</span><span>${prog}%</span></div>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${prog}%;background:${topic.color}"></div></div>
        </div>
        <div style="font-size:0.78rem;color:var(--text-muted)">${Object.keys(this.progress[topic.id]||{}).length} / ${topic.subtopics.length} פרקים</div>
      `;
      grid.appendChild(card);
    });
    return div;
  },

  // ===== UTILS =====
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
