// ===== Cyber Academy App =====

const STORAGE_KEY = 'cyber_progress';

// תוכנית הלימוד – מסלול מובנה ל-18 שבועות
// כל נושא בונה על הקודם: יסודות → תשתית → זיהוי והגנה → תקיפה ואינטגרציה → פרויקט גמר
const ROADMAP = [
  {
    phase: "שלב 1 – יסודות", weeks: "שבועות 1–4", color: "#f59e0b",
    topics: ["linux", "python"],
    weeksDetail: [
      { n: "שבוע 1", title: "Linux בסיסי",
        focus: "ניווט בshell, היררכיית מערכת הקבצים, הרשאות (chmod/chown), משתמשים וקבוצות, ניהול חבילות.",
        exercise: "הקם Linux VM מאפס, צור משתמשים ברמות הרשאה שונות, שבור ותקן בעיות הרשאה.",
        deliverable: "Cheat-sheet אישי של כל פקודה שהשתמשת בה." },
      { n: "שבוע 2", title: "Linux מתקדם",
        focus: "תהליכים, שירותים (systemd), cron, פקודות רשת (ip, ss, netstat, tcpdump), מיקומי לוגים (/var/log).",
        exercise: "תזמן cron job, בדוק שירותים רצים, לכוד תעבורה עם tcpdump תוך כדי גלישה.",
        deliverable: "Runbook: 'איך לחקור מה Linux box עושה'." },
      { n: "שבוע 3", title: "יסודות Python",
        focus: "משתנים, סוגי נתונים, רשימות/מילונים, לולאות, פונקציות, קלט/פלט קבצים, טיפול בשגיאות.",
        exercise: "כתוב סקריפט שקורא קובץ לוג וסופר כמה פעמים מופיעה כל כתובת IP.",
        deliverable: "סקריפט מנתח הלוגים, מתועד בהערות." },
      { n: "שבוע 4", title: "Python לאבטחה",
        focus: "ספריית requests, פענוח JSON, argparse לכלי CLI, ביטויים רגולריים (regex).",
        exercise: "כתוב כלי ששואל API ציבורי (למשל שירות מוניטין IP) ומדפיס תוצאות.",
        deliverable: "כלי CLI קטן שבאמת תשתמש בו שוב." }
    ]
  },
  {
    phase: "שלב 2 – רשתות ותשתית", weeks: "שבועות 5–8", color: "#dc2626",
    topics: ["pfsense", "aws"],
    weeksDetail: [
      { n: "שבוע 5", title: "רענון רשתות + התקנת pfSense",
        focus: "מודל OSI, TCP/IP, subnetting, NAT, DNS. התקנת pfSense במעבדה.",
        exercise: "בנה רשת עם pfSense כשער (gateway) בין שתי תת-רשתות VM.",
        deliverable: "דיאגרמת רשת של המעבדה שלך." },
      { n: "שבוע 6", title: "חוקים ושירותים ב-pfSense",
        focus: "חוקי Firewall, NAT/port forwarding, VLANs, DHCP, VPN בסיסי.",
        exercise: "כתוב חוקים שמאפשרים לתת-רשת אחת לגלוש באינטרנט אך חוסמים אותה מתת-רשת אחרת; אמת בבדיקה.",
        deliverable: "ruleset מתועד עם ההיגיון מאחורי כל חוק." },
      { n: "שבוע 7", title: "יסודות AWS",
        focus: "IAM (משתמשים, roles, policies), מודל האחריות המשותפת, regions/AZs, EC2, S3.",
        exercise: "הפעל EC2 instance, צרף role בעקרון least-privilege, שמור ושלוף קובץ מ-S3.",
        deliverable: "הסבר כתוב על מדיניות ה-IAM שכתבת." },
      { n: "שבוע 8", title: "רשת ואבטחה ב-AWS",
        focus: "VPCs, subnets, Security Groups מול NACLs, CloudTrail, יסודות GuardDuty.",
        exercise: "בנה VPC עם subnets ציבורי ופרטי, נעל גישה עם Security Groups, הפעל CloudTrail.",
        deliverable: "דיאגרמת ארכיטקטורה + הערות על מה כל בקרה מגנה." }
    ]
  },
  {
    phase: "שלב 3 – זיהוי והגנה", weeks: "שבועות 9–13", color: "#10b981",
    topics: ["idsips", "mitre", "winforensics"],
    weeksDetail: [
      { n: "שבוע 9", title: "מושגי IDS/IPS + הקמה",
        focus: "זיהוי signature מול anomaly, inline מול passive; התקנת Snort או Suricata.",
        exercise: "גרום לחיישן לראות תעבורה ולירות על חוקי ברירת המחדל.",
        deliverable: "תיאור היכן החיישן יושב ולמה." },
      { n: "שבוע 10", title: "כתיבה וכיוונון חוקים",
        focus: "תחביר חוקים, צמצום false positives, מיון התראות (triage).",
        exercise: "כתוב חוק מותאם לזיהוי תבנית ספציפית, צור תעבורה תואמת, אמת את ההתראה.",
        deliverable: "3–5 חוקים מותאמים עם הסברים." },
      { n: "שבוע 11", title: "MITRE ATT&CK",
        focus: "טקטיקות, טכניקות, תת-טכניקות; המטריצה; מיפוי התנהגות למזהי טכניקה.",
        exercise: "קח דוח אירוע ציבורי ומפה כל פעולה לטכניקות ATT&CK.",
        deliverable: "המיפוי כטבלה." },
      { n: "שבוע 12", title: "Windows Forensics – חלק 1",
        focus: "Event logs, registry, scheduled tasks, מיקומי persistence, artifacts של תוקף.",
        exercise: "בצע פעולה על Windows VM, ואז מצא את הראיות בלוגים/registry.",
        deliverable: "Timeline של מה שעשית מול ה-artifacts שהוכיחו זאת." },
      { n: "שבוע 13", title: "Windows Forensics – חלק 2",
        focus: "ניתוח זיכרון (יסודות Volatility), timelines של מערכת הקבצים, טיפול בראיות ו-chain of custody.",
        exercise: "לכוד image של זיכרון וזהה ממנו תהליכים רצים וחיבורי רשת.",
        deliverable: "דוח פורנזי קצר." }
    ]
  },
  {
    phase: "שלב 4 – תקיפה (לטובת הגנה) ואינטגרציה", weeks: "שבועות 14–17", color: "#7c3aed",
    topics: ["metasploit", "ai"],
    weeksDetail: [
      { n: "שבוע 14", title: "טכניקות תקיפה – מנקודת מבט המגן",
        focus: "שימוש ב-Metasploit במעבדה מבודדת כדי להבין recon, exploitation ו-post-exploitation — בדגש על איך כל שלב נראה בלוגים וברשת.",
        exercise: "הרץ טכניקה בסיסית נגד VM פגיע במכוון (כמו Metasploitable) ולכוד את התראות ה-IDS וה-artifacts שנוצרים.",
        deliverable: "טבלת 'פעולת תוקף → אות זיהוי'." },
      { n: "שבוע 15", title: "מיפוי תקיפות לזיהוי",
        focus: "מפה את טכניקות שבוע 14 ל-MITRE ATT&CK, ואז לכיסוי הזיהוי שלך משבועות 9–13.",
        exercise: "זהה פערים שבהם פעולה לא הפיקה שום התראה.",
        deliverable: "מטריצת כיסוי שמראה מה זוהה מול נקודות עיוורות." },
      { n: "שבוע 16", title: "AI בסייבר – חלק 1",
        focus: "יישומי ML: זיהוי אנומליות, סיווג נוזקות, סינון spam/phishing, מיון התראות ב-SOC.",
        exercise: "אמן מסווג פשוט על dataset מתויג (למשל URLs של phishing מול לגיטימיים) ב-Python.",
        deliverable: "ה-notebook + תוצאות דיוק." },
      { n: "שבוע 17", title: "AI בסייבר – חלק 2",
        focus: "סיכונים ומגבלות: adversarial examples, model poisoning, evasion, עלות false-positive, ולמה AI מחזק ולא מחליף אנליסטים.",
        exercise: "נסה לגרום למסווג משבוע 16 לטעות בסיווג, ותעד כיצד.",
        deliverable: "סיכום קצר על חולשות המודל." }
    ]
  },
  {
    phase: "שלב 5 – פרויקט גמר", weeks: "שבוע 18", color: "#ef4444",
    topics: ["cyberium"],
    weeksDetail: [
      { n: "שבוע 18", title: "פרויקט גמר – Cyberium Arena",
        focus: "תרגילים מבוססי תרחיש שמשלבים הכל: זיהוי, חקירה, ניתוח פורנזי, מיפוי ל-ATT&CK, ותגובה.",
        exercise: "השלם אירוע מלא — מהתראה ועד דוח.",
        deliverable: "דוח תגובה לאירוע (IR) מלא שמחבר רשתות, זיהוי, פורנזיקה ומיון בסיוע AI." }
    ]
  }
];

// הרגלים שכדאי לשמר לאורך כל המסלול
const ROADMAP_HABITS = [
  "נהל קובץ הערות אחד לכל נושא.",
  "בצע כל תרגיל ידנית במעבדה, לא רק בקריאה.",
  "שמור את המעבדות מבודדות (host-only networking) כך ששום דבר לא נוגע במערכות אמיתיות.",
  "בסוף כל שלב, כתוב סיכום בן עמוד אחד על מה אתה יכול לעשות עכשיו שלא יכולת קודם."
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
      case 'career':       main.appendChild(this.renderCareer()); break;
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
      <div class="section-title">🗺️ מסלול לימוד – 18 שבועות</div>
      <p style="color:var(--text-muted);margin-bottom:24px">תוכנית מובנית המכסה עשרה נושאי ליבה, מסודרת כך שכל נושא בונה על הקודם. לחץ על שבוע כדי לפתוח את הפירוט, ועל תחום כדי לקפוץ לחומר הלימוד שלו.</p>
      <div class="timeline" id="timeline"></div>
      <div class="section-title" style="margin-top:32px">🔁 הרגלים לשמר לאורך כל המסלול</div>
      <div class="progress-card">
        <ul style="padding-right:20px;margin:0">
          ${ROADMAP_HABITS.map(h => `<li style="color:var(--text-muted);font-size:0.9rem;margin-bottom:8px">${h}</li>`).join('')}
        </ul>
      </div>
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
      const weeksHtml = stage.weeksDetail.map(w => `
        <div class="week-item">
          <div class="week-header">
            <span class="week-title"><strong>${w.n}</strong> · ${w.title}</span>
            <span class="subtopic-chevron">⌄</span>
          </div>
          <div class="week-body">
            <p><span class="week-tag">🎯 מיקוד</span> ${w.focus}</p>
            <p><span class="week-tag">🧪 תרגיל</span> ${w.exercise}</p>
            <p><span class="week-tag">📦 תוצר</span> ${w.deliverable}</p>
          </div>
        </div>
      `).join('');
      node.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="timeline-head">
            <span class="timeline-phase">${stage.phase}</span>
            <span class="timeline-weeks">${stage.weeks}</span>
          </div>
          <div class="weeks-list">${weeksHtml}</div>
          ${topicChips ? `<div class="chip-row">${topicChips}</div>` : ''}
        </div>
      `;
      tl.appendChild(node);
    });
    // toggle week details
    tl.querySelectorAll('.week-item').forEach(item => {
      item.querySelector('.week-header').addEventListener('click', () =>
        item.classList.toggle('open'));
    });
    div.querySelectorAll('.chip').forEach(chip =>
      chip.addEventListener('click', () => this.navigate('topic', chip.dataset.topic)));
    return div;
  },

  // ===== CAREER / REAL-WORLD READINESS =====
  renderCareer() {
    const div = document.createElement('div');
    div.className = 'page';
    const c = CAREER;
    div.innerHTML = `
      <div class="home-hero" style="padding:40px 20px 28px">
        <h1 style="font-size:2rem">🎯 מוכנות לעולם האמיתי</h1>
        <p>לא רק ללמוד — להפוך למועסק. הסמכות, תפקידים, כלים, ראיונות ופרויקטים לתיק עבודות.</p>
      </div>

      <div class="section-title">📜 מסלול הסמכות</div>
      <div class="cert-grid">
        ${c.certifications.map(cert => `
          <div class="cert-card" style="border-right:4px solid ${cert.color}">
            <div class="cert-top"><span class="cert-tier" style="background:${cert.color}22;color:${cert.color}">${cert.tier}</span></div>
            <div class="cert-name">${cert.name}</div>
            <div class="cert-topics">${cert.topics}</div>
            <div class="cert-note">${cert.note}</div>
          </div>`).join('')}
      </div>

      <div class="section-title" style="margin-top:36px">💼 תפקידים בשוק</div>
      <div class="topics-grid">
        ${c.roles.map(r => `
          <div class="topic-card" style="--card-color:${r.color};cursor:default">
            <span class="tc-icon">${r.icon}</span>
            <div class="tc-name">${r.title}</div>
            <div class="tc-desc">${r.desc}</div>
            <div class="topic-tags" style="margin:8px 0">${r.skills.map(s => `<span class="tag">${s}</span>`).join('')}</div>
            <div class="cert-note">${r.entry}</div>
          </div>`).join('')}
      </div>

      <div class="section-title" style="margin-top:36px">🧰 ארגז הכלים – מה חייבים לדעת</div>
      <div class="cert-grid">
        ${c.toolkits.map(t => `
          <div class="cert-card">
            <div class="cert-name">${t.icon} ${t.area}</div>
            <div class="topic-tags" style="margin-top:10px">${t.tools.map(x => `<span class="tag">${x}</span>`).join('')}</div>
          </div>`).join('')}
      </div>

      <div class="section-title" style="margin-top:36px">🎤 שאלות ראיון עבודה</div>
      <div class="subtopics-list" id="iv-list">
        ${c.interview.map((it, i) => `
          <div class="subtopic-item">
            <div class="subtopic-header" data-iv="${i}">
              <span class="subtopic-title">❓ ${it.q}</span>
              <span class="subtopic-chevron">⌄</span>
            </div>
            <div class="subtopic-content"><p><strong>תשובה:</strong> ${it.a}</p></div>
          </div>`).join('')}
      </div>

      <div class="section-title" style="margin-top:36px">📦 פרויקטים לתיק עבודות</div>
      <div class="topics-grid">
        ${c.projects.map(p => `
          <div class="topic-card" style="cursor:default">
            <span class="tc-icon">${p.icon}</span>
            <div class="tc-name">${p.title}</div>
            <div class="tc-desc">${p.desc}</div>
            <div class="cert-note" style="margin-top:8px">📦 תוצר: ${p.deliverable}</div>
          </div>`).join('')}
      </div>

      <div class="section-title" style="margin-top:36px">🏋️ פלטפורמות לאימון מתמשך</div>
      <div class="cert-grid">
        ${c.practice.map(p => `
          <a class="cert-card practice-card" href="${p.url}" target="_blank" rel="noopener">
            <div class="cert-name">${p.name} ↗</div>
            <div class="cert-topics">${p.desc}</div>
          </a>`).join('')}
      </div>
    `;
    div.querySelectorAll('#iv-list .subtopic-header').forEach(h =>
      h.addEventListener('click', () => h.parentElement.classList.toggle('open')));
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
