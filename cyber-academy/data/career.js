// ===== Cyber Academy – Real-World Career Readiness =====
// מודול המכין לעולם האמיתי: הסמכות, תפקידים, כלים, ראיונות ופרויקטים

const CAREER = {
  // ---- מסלול הסמכות (Certifications) ----
  certifications: [
    { tier: "כניסה", color: "#10b981", name: "CompTIA Security+", topics: "יסודות אבטחה, רשתות, איומים",
      note: "ההסמכה הקלאסית לכניסה לתחום. דרישת סף בהרבה משרות junior." },
    { tier: "כניסה", color: "#10b981", name: "CompTIA Network+", topics: "רשתות, TCP/IP, ניתוב",
      note: "בסיס רשתי חזק — קריטי לפני שעוברים להגנה/תקיפה." },
    { tier: "כניסה", color: "#10b981", name: "Linux Essentials / LPIC-1", topics: "Linux, shell, ניהול מערכת",
      note: "כי כמעט כל כלי סייבר רץ על Linux." },
    { tier: "מקצועי", color: "#f59e0b", name: "eJPT (INE)", topics: "Penetration Testing מעשי",
      note: "מבחן מעשי 100% — מצוין כדי להוכיח יכולת אמיתית בתקיפה מבוקרת." },
    { tier: "מקצועי", color: "#f59e0b", name: "CySA+ / Blue Team Level 1", topics: "SOC, זיהוי, ניתוח",
      note: "למסלול ההגנה (Blue Team) ו-SOC Analyst." },
    { tier: "מקצועי", color: "#f59e0b", name: "AWS Security Specialty", topics: "אבטחת ענן",
      note: "ביקוש עצום למאבטחי ענן. דורש ידע AWS מוצק קודם." },
    { tier: "מומחה", color: "#ef4444", name: "OSCP (Offensive Security)", topics: "Pen-Testing מתקדם",
      note: "תקן הזהב לבודקי חדירה. מבחן מעשי 24 שעות — קשה ויוקרתי." },
    { tier: "מומחה", color: "#ef4444", name: "GCFA / GCIH (SANS)", topics: "Forensics & Incident Response",
      note: "ההסמכות המובילות ל-DFIR. יקרות אך מוערכות מאוד בתעשייה." },
    { tier: "מומחה", color: "#ef4444", name: "CISSP (ISC²)", topics: "ניהול אבטחת מידע",
      note: "ניהולי/ארכיטקטוני. דורש 5 שנות ניסיון — יעד לטווח ארוך." }
  ],

  // ---- תפקידים בשוק (Job Roles) ----
  roles: [
    { title: "SOC Analyst (Tier 1/2)", icon: "🛰️", color: "#10b981",
      desc: "קו ההגנה הראשון — מנטר התראות, מתעדף ומסלים אירועים.",
      skills: ["IDS/IPS", "SIEM", "Linux", "MITRE ATT&CK", "ניתוח לוגים"],
      entry: "נקודת כניסה מצוינת לתחום ההגנה." },
    { title: "Penetration Tester", icon: "💥", color: "#7c3aed",
      desc: "תוקף מערכות בהרשאה כדי לחשוף חולשות לפני הרעים.",
      skills: ["Metasploit", "Python", "Linux", "רשתות", "Web/AD"],
      entry: "דורש ניסיון מעשי + OSCP/eJPT." },
    { title: "DFIR Analyst", icon: "🔍", color: "#06b6d4",
      desc: "חוקר אירועי אבטחה — מי נכנס, מה עשה, ומה דלף.",
      skills: ["Windows Forensics", "Volatility", "Timeline", "לוגים", "Python"],
      entry: "מסלול חקירתי, ביקוש גבוה." },
    { title: "Cloud Security Engineer", icon: "☁️", color: "#f97316",
      desc: "מאבטח תשתיות ענן — IAM, רשת, ניטור והקשחה.",
      skills: ["AWS", "IAM", "VPC", "IaC", "אוטומציה"],
      entry: "אחד התפקידים המבוקשים והמתוגמלים ביותר." },
    { title: "Security Engineer / Blue Team", icon: "🛡️", color: "#ef4444",
      desc: "בונה ומתחזק הגנות — Firewall, זיהוי, הקשחה ואוטומציה.",
      skills: ["pfSense", "IDS/IPS", "Linux", "Python", "SIEM"],
      entry: "מהנדס הגנה רחב — דורש ידע מערכתי." },
    { title: "Detection / ML Security Engineer", icon: "🤖", color: "#8b5cf6",
      desc: "בונה זיהוי מבוסס נתונים ו-ML, ומאבטח מערכות AI.",
      skills: ["AI/ML", "Python", "Detection Eng", "ATT&CK", "data"],
      entry: "תחום עתידי וצומח במהירות." }
  ],

  // ---- כלים שחייבים לשלוט בהם (Must-Know Tools) ----
  toolkits: [
    { area: "מערכת ורשת", icon: "🐧", tools: ["Linux CLI", "tcpdump", "Wireshark", "nmap", "netcat", "SSH"] },
    { area: "תקיפה", icon: "💥", tools: ["Metasploit", "Burp Suite", "Hydra", "John/Hashcat", "Gobuster", "sqlmap"] },
    { area: "הגנה / SOC", icon: "🚨", tools: ["Snort/Suricata", "Wazuh", "Splunk/Elastic", "Security Onion", "Sysmon"] },
    { area: "פורנזיקה", icon: "🔍", tools: ["Volatility", "Autopsy", "FTK Imager", "Eric Zimmerman Tools", "plaso"] },
    { area: "ענן ותשתית", icon: "☁️", tools: ["AWS CLI", "Terraform", "Docker", "ScoutSuite", "Prowler"] },
    { area: "פיתוח ואוטומציה", icon: "🐍", tools: ["Python", "Bash", "Git", "VS Code", "Jupyter", "regex"] }
  ],

  // ---- שאלות ראיון עבודה נפוצות (Interview Prep) ----
  interview: [
    { q: "הסבר את ההבדל בין IDS ל-IPS, ומתי תעדיף כל אחד.",
      a: "IDS מזהה ומתריע (פסיבי, out-of-band); IPS מזהה וגם חוסם (inline). IPS כשרוצים מניעה אקטיבית אך עם סיכון ל-false positive שיחסום תעבורה לגיטימית; IDS כשרוצים נראות בלי לסכן זמינות." },
    { q: "מהו עקרון ה-Least Privilege ולמה הוא חשוב?",
      a: "מתן ההרשאות המינימליות הנדרשות בלבד. מצמצם את 'משטח התקיפה' ואת הנזק האפשרי אם זהות נפרצת — תוקף שמשיג חשבון מוגבל לא משיג שליטה מלאה." },
    { q: "תאר את שלבי תגובה לאירוע (Incident Response).",
      a: "לפי NIST: הכנה → זיהוי וניתוח → הכלה, מיגור והתאוששות → לקחים. או SANS PICERL: Preparation, Identification, Containment, Eradication, Recovery, Lessons learned." },
    { q: "מה תבדוק ראשון בחקירת מכונת Windows חשודה?",
      a: "סדר התנודתיות: קודם זיכרון (RAM) — תהליכים, חיבורים, סיסמאות. אחר כך Event Logs (4624/4625/4688), משימות מתוזמנות, מפתחות Run ב-Registry (persistence), וחיבורי רשת חריגים." },
    { q: "כיצד עובד TCP three-way handshake?",
      a: "SYN מהלקוח → SYN-ACK מהשרת → ACK מהלקוח. סריקת SYN (half-open) שולחת SYN ובודקת אם מתקבל SYN-ACK בלי להשלים, כדי לזהות פורטים פתוחים בשקט." },
    { q: "מהו MITRE ATT&CK ואיך תשתמש בו בעבודה?",
      a: "בסיס ידע של TTPs של תוקפים אמיתיים. בהגנה: ממפים אילו טכניקות אנו מזהים (gap analysis) וצובעים ב-Navigator; כל התראה ממופה לטכניקה כדי לדבר בשפה אחת." },
    { q: "הבדל בין Symmetric ל-Asymmetric encryption?",
      a: "סימטרי: מפתח אחד לשני הצדדים (AES) — מהיר, אך בעיית הפצת מפתח. א-סימטרי: זוג מפתחות ציבורי/פרטי (RSA) — פותר הפצה ומאפשר חתימות. TLS משלב: א-סימטרי להחלפת מפתח, סימטרי לתעבורה." },
    { q: "מה ההבדל בין Security Group ל-NACL ב-AWS?",
      a: "Security Group = stateful, ברמת ה-instance, allow-only. NACL = stateless, ברמת ה-subnet, תומך גם ב-deny. SG זוכר חיבור ומחזיר תשובה אוטומטית; NACL דורש חוק לכל כיוון." },
    { q: "איך תזהה ותגיב להתקפת Brute-Force?",
      a: "ריבוי אירועי 4625 (Windows) או 'Failed password' (Linux auth.log) מאותו מקור. תגובה: account lockout, rate-limiting/fail2ban, חסימת IP ב-Firewall, MFA, והתראת SIEM." },
    { q: "מהי הגנה לעומק (Defense in Depth)?",
      a: "ריבוד הגנות כך שכשל בשכבה אחת לא חושף הכל: פילוח רשת, Firewall, IDS/IPS, EDR, הקשחה, הרשאות, גיבוי וניטור — שכבות שמשלימות זו את זו." }
  ],

  // ---- פרויקטים לתיק עבודות (Portfolio Projects) ----
  projects: [
    { title: "מעבדת SOC ביתית", icon: "🏠",
      desc: "הקם Security Onion/Wazuh, חבר Sysmon ממכונת Windows, צור התקפה וזהה אותה מקצה לקצה.",
      deliverable: "צילומי מסך + תיעוד של ה-detection pipeline ב-GitHub." },
    { title: "כלי אוטומציה ב-Python", icon: "🐍",
      desc: "כתוב כלי שמנתח לוגים, שואל API מוניטין IP, ומפיק דוח התראות.",
      deliverable: "ריפו עם README, argparse, ובדיקות." },
    { title: "Pentest לסביבת מעבדה", icon: "💥",
      desc: "תקוף Metasploitable/VulnHub מקצה לקצה: recon → exploitation → post → דוח.",
      deliverable: "דוח pentest מקצועי (כולל מיפוי ל-ATT&CK ותיקונים מומלצים)." },
    { title: "ארכיטקטורת ענן מאובטחת", icon: "☁️",
      desc: "בנה VPC עם subnets ציבורי/פרטי, IAM least-privilege, CloudTrail+GuardDuty.",
      deliverable: "דיאגרמה + הסבר על כל בקרה (אפשר עם Terraform)." },
    { title: "חקירה פורנזית", icon: "🔍",
      desc: "נתח memory dump ו-disk image, בנה timeline וזהה את פעולות התוקף.",
      deliverable: "דוח DFIR עם ראיות, timeline ומסקנות." }
  ],

  // ---- אימון מתמשך (Practice Platforms) ----
  practice: [
    { name: "TryHackMe", desc: "מסלולים מודרכים — מצוין למתחילים. learning paths לפי תפקיד.", url: "https://tryhackme.com" },
    { name: "Hack The Box", desc: "מכונות ו-labs מאתגרים יותר. Academy למסלול מובנה.", url: "https://hackthebox.com" },
    { name: "LetsDefend", desc: "תרגול Blue Team / SOC אמיתי עם התראות.", url: "https://letsdefend.io" },
    { name: "CyberDefenders", desc: "אתגרי DFIR ו-Blue Team מבוססי תרחיש.", url: "https://cyberdefenders.org" },
    { name: "OverTheWire", desc: "Wargames ללימוד Linux ו-security מהיסוד.", url: "https://overthewire.org" },
    { name: "PortSwigger Web Security Academy", desc: "תרגול Web security חינמי ומצוין.", url: "https://portswigger.net/web-security" }
  ]
};
