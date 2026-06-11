// CCNP Topics - lessons in Hebrew
// Structure: categories -> topics -> lesson body (HTML strings)

window.CCNP_CATEGORIES = [
  { id: "routing",      name: "ניתוב מתקדם",        icon: "🧭", color: "#58a6ff" },
  { id: "switching",    name: "מיתוג ו-L2",          icon: "🔀", color: "#7c5cff" },
  { id: "services",     name: "שירותי IP",           icon: "🛰️", color: "#2dd4bf" },
  { id: "security",     name: "אבטחת תשתית",         icon: "🛡️", color: "#f59e0b" },
  { id: "wireless",     name: "אלחוט",               icon: "📡", color: "#22c55e" },
  { id: "vpn",          name: "VPN & Overlays",      icon: "🕳️", color: "#ef4444" },
  { id: "automation",   name: "אוטומציה ותכנות",     icon: "🤖", color: "#a78bfa" },
  { id: "assurance",    name: "ניטור ואבחון",        icon: "📈", color: "#fb7185" },
  { id: "architecture", name: "ארכיטקטורת רשתות",   icon: "🏛️", color: "#60a5fa" }
];

window.CCNP_TOPICS = [
  // ====================== ROUTING ======================
  {
    id: "ospf-fundamentals",
    category: "routing",
    title: "OSPFv2 — יסודות ופעולה",
    summary: "פרוטוקול Link-State, היררכיית אזורים, LSA, בחירת DR/BDR וחישוב SPF.",
    minutes: 18,
    level: "מתקדם",
    body: `
<p><strong>OSPF (Open Shortest Path First)</strong> הוא פרוטוקול ניתוב פנימי (IGP) מסוג Link-State, המבוסס על אלגוריתם <em>Dijkstra (SPF)</em>. כל נתב בונה את אותה מפת טופולוגיה (LSDB) ומחשב מסלולים קצרים ביותר.</p>

<h2>היררכיית אזורים</h2>
<p>OSPF מחייב מבנה היררכי של אזורים שמתחברים ל-<code>Area 0</code> (Backbone). חיבור אזור שאינו 0 ישירות ל-Backbone הוא חובה, או דרך <em>Virtual Link</em>.</p>
<table>
  <thead><tr><th>סוג אזור</th><th>LSAs מותרים</th><th>שימוש</th></tr></thead>
  <tbody>
    <tr><td>Standard</td><td>1, 2, 3, 4, 5</td><td>אזור רגיל</td></tr>
    <tr><td>Stub</td><td>1, 2, 3 + Default</td><td>חוסם LSA 4/5</td></tr>
    <tr><td>Totally Stubby</td><td>1, 2 + Default</td><td>חוסם 3, 4, 5 (Cisco)</td></tr>
    <tr><td>NSSA</td><td>1, 2, 3, 7</td><td>מאפשר redistribution מוגבל</td></tr>
  </tbody>
</table>

<h2>סוגי LSA נפוצים</h2>
<ul>
  <li><strong>Type 1 — Router LSA</strong>: כל נתב מפרסם את ה-links שלו בתוך האזור.</li>
  <li><strong>Type 2 — Network LSA</strong>: נשלח ע"י DR בלבד ברשתות Multi-Access.</li>
  <li><strong>Type 3 — Summary</strong>: ABR מפרסם רשתות בין אזורים.</li>
  <li><strong>Type 4 — ASBR Summary</strong>: ABR מודיע איפה ASBR.</li>
  <li><strong>Type 5 — External</strong>: ASBR מפרסם רשתות חיצוניות (לא ב-Stub).</li>
  <li><strong>Type 7 — NSSA External</strong>: בתוך NSSA, מומר ל-Type 5 ע"י ABR.</li>
</ul>

<h2>שכנים, DR/BDR ומכונת המצב</h2>
<p>שכנים עוברים בין מצבים: <code>Down → Init → 2-Way → ExStart → Exchange → Loading → Full</code>. ברשתות Broadcast/NBMA נבחר <strong>DR</strong> ו-<strong>BDR</strong> לפי <em>Priority</em> ולאחריו <em>Router-ID</em> הגבוה.</p>

<blockquote>
טיפ למבחן: <code>priority = 0</code> מבטיח שהנתב <em>לעולם לא</em> ייבחר כ-DR. שינוי priority לא תופס עד שהשכנות נבנית מחדש.
</blockquote>

<h2>פקודות הגדרה</h2>
<pre><code>router ospf 1
 router-id 1.1.1.1
 auto-cost reference-bandwidth 100000
 network 10.0.0.0 0.0.0.255 area 0
 passive-interface default
 no passive-interface GigabitEthernet0/1
 area 1 stub no-summary
!
interface GigabitEthernet0/1
 ip ospf network point-to-point
 ip ospf hello-interval 5
 ip ospf dead-interval 20
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 S3cret!</code></pre>

<h2>פקודות אבחון</h2>
<pre><code>show ip ospf neighbor
show ip ospf database
show ip ospf interface brief
show ip route ospf
debug ip ospf adj
debug ip ospf hello</code></pre>

<h2>סיבות נפוצות לכשל בשכנות</h2>
<ol>
  <li>אי-התאמה ב-<strong>Area ID</strong>.</li>
  <li>אי-התאמה ב-<strong>Hello/Dead intervals</strong>.</li>
  <li>אי-התאמה ב-<strong>Subnet mask</strong> ברשת Broadcast.</li>
  <li>אי-התאמה ב-<strong>Authentication</strong>.</li>
  <li>אי-התאמה ב-<strong>Stub flags</strong> או <strong>MTU</strong> (ב-Exchange).</li>
</ol>
`
  },
  {
    id: "ospf-advanced",
    category: "routing",
    title: "OSPF מתקדם — Summarization, Filtering ו-LFA",
    summary: "סיכום בין אזורים, Type-7→5, סינון, ושיפורי התכנסות (BFD, LFA, Fast-Hello).",
    minutes: 16,
    level: "ENARSI",
    body: `
<h2>Summarization</h2>
<p>סיכום מקטין את ה-LSDB ומפחית רעידות (flapping). מתבצע על <strong>ABR</strong> או <strong>ASBR</strong> בלבד.</p>
<pre><code>! ב-ABR: סיכום בין אזורים
router ospf 1
 area 1 range 10.1.0.0 255.255.0.0

! ב-ASBR: סיכום של רשתות חיצוניות
router ospf 1
 summary-address 172.16.0.0 255.255.0.0</code></pre>

<h2>סינון מסלולים</h2>
<ul>
  <li><strong>distribute-list in</strong> — מסנן הכנסה ל-RIB (לא ל-LSDB).</li>
  <li><strong>area X range … not-advertise</strong> — מונע פרסום סיכום שלם.</li>
  <li><strong>area X filter-list prefix … in|out</strong> — סינון בין אזורים ב-ABR.</li>
</ul>

<h2>שיפורי התכנסות</h2>
<ul>
  <li><strong>BFD</strong> — זיהוי תקלה תת-שנייתי, מעדיף על Fast-Hello.</li>
  <li><strong>LFA / Remote-LFA</strong> — מחשב מסלול גיבוי מראש.</li>
  <li><strong>SPF throttle</strong>: <code>timers throttle spf 50 200 5000</code>.</li>
  <li><strong>LSA throttle</strong>: <code>timers throttle lsa 0 5000 5000</code>.</li>
</ul>
`
  },
  {
    id: "eigrp",
    category: "routing",
    title: "EIGRP — DUAL, Metrics ו-Stub",
    summary: "Advanced Distance-Vector של סיסקו: K-values, FS/FD, named mode ו-Stub.",
    minutes: 17,
    level: "מתקדם",
    body: `
<p><strong>EIGRP</strong> משלב יתרונות של Distance-Vector ו-Link-State. משתמש באלגוריתם <em>DUAL</em> כדי לבחור מסלולים ללא לולאות וגיבוי מיידי דרך <em>Feasible Successor</em>.</p>

<h2>המטריקה הקלאסית</h2>
<p>מבוססת K-values: ברירת מחדל <code>K1=1, K2=0, K3=1, K4=0, K5=0</code> — כלומר Bandwidth ו-Delay בלבד.</p>
<pre><code>Metric = (10^7 / min_BW + sum_delay/10) * 256</code></pre>
<p>ב-<strong>EIGRP Named Mode</strong> ובגרסת Wide-Metric ההיסט הוא 65,536 כדי לתמוך ב-Gigabits.</p>

<h2>מושגים מרכזיים</h2>
<ul>
  <li><strong>FD (Feasible Distance)</strong> — המטריקה הטובה ביותר אל היעד.</li>
  <li><strong>AD / RD (Advertised Distance)</strong> — מה שהשכן מפרסם.</li>
  <li><strong>Feasibility Condition</strong> — שכן הוא FS אם <code>AD &lt; FD</code> הנוכחי.</li>
  <li><strong>Successor</strong> — המסלול הראשי; <strong>FS</strong> — הגיבוי המוכן.</li>
</ul>

<h2>Named Mode (מומלץ)</h2>
<pre><code>router eigrp ENT
 address-family ipv4 unicast autonomous-system 100
  af-interface GigabitEthernet0/1
   hello-interval 2
   hold-time 6
   authentication mode hmac-sha-256 0 BluePass!
  exit-af-interface
  topology base
   variance 2
   redistribute ospf 1 metric 1000000 10 255 1 1500
  exit-af-topology
  network 10.0.0.0 0.255.255.255
  eigrp router-id 1.1.1.1
 exit-address-family</code></pre>

<h2>Stub</h2>
<p><strong>Stub</strong> אומר ל-EIGRP "אני קצה" — לא לשלוח לי queries. מצמצם SIA ומאיץ התכנסות.</p>
<pre><code>router eigrp 100
 eigrp stub connected summary</code></pre>

<h2>פתרון תקלות נפוץ</h2>
<ul>
  <li><strong>K-values mismatch</strong> → שכנות לא נבנית.</li>
  <li><strong>AS mismatch</strong> → אין שכנות.</li>
  <li><strong>Auto-summary</strong> ב-Classic mode → איבוד subnetting.</li>
  <li><strong>Stuck-In-Active (SIA)</strong> → השתמש ב-stub וב-summary.</li>
</ul>
`
  },
  {
    id: "bgp-fundamentals",
    category: "routing",
    title: "BGP — יסודות, מצבים ו-Path Attributes",
    summary: "eBGP מול iBGP, מכונת מצבים, AS_PATH, Local-Pref, MED ובחירת מסלול.",
    minutes: 22,
    level: "ENARSI",
    body: `
<p><strong>BGP (Border Gateway Protocol)</strong> הוא Path-Vector שפועל מעל TCP/179. הוא ה-Routing Protocol של האינטרנט והוא הבסיס ל-MPLS L3VPN, EVPN ו-SD-WAN Overlay.</p>

<h2>eBGP מול iBGP</h2>
<table>
  <thead><tr><th>תכונה</th><th>eBGP</th><th>iBGP</th></tr></thead>
  <tbody>
    <tr><td>AS</td><td>שונה</td><td>זהה</td></tr>
    <tr><td>TTL ברירת מחדל</td><td>1</td><td>255</td></tr>
    <tr><td>AD</td><td>20</td><td>200</td></tr>
    <tr><td>Next-hop</td><td>משתנה</td><td>נשמר (אלא אם next-hop-self)</td></tr>
    <tr><td>Loop prevention</td><td>AS_PATH</td><td>Split-horizon (Full-Mesh / RR)</td></tr>
  </tbody>
</table>

<h2>מכונת המצב</h2>
<p><code>Idle → Connect → Active → OpenSent → OpenConfirm → Established</code>. תקיעה ב-<em>Active</em> בד"כ אומרת בעיית TCP/ACL/MD5.</p>

<h2>סדר בחירת המסלול (PA)</h2>
<ol>
  <li><strong>Weight</strong> — Cisco, מקומי לנתב, הגבוה ביותר זוכה.</li>
  <li><strong>Local-Pref</strong> — בתוך AS, הגבוה ביותר זוכה.</li>
  <li>נתיב <strong>Local Origin</strong> (network / aggregate / redistribute).</li>
  <li><strong>AS_PATH</strong> — הקצר ביותר זוכה.</li>
  <li><strong>Origin</strong> — IGP &lt; EGP &lt; ?.</li>
  <li><strong>MED</strong> — הנמוך ביותר זוכה (השוואה רק לאותו AS שכן).</li>
  <li>eBGP על iBGP.</li>
  <li>IGP metric ל-Next-Hop הנמוך ביותר.</li>
  <li>Router-ID הנמוך ביותר.</li>
</ol>

<h2>פקודות הגדרה</h2>
<pre><code>router bgp 65001
 bgp router-id 1.1.1.1
 bgp log-neighbor-changes
 no bgp default ipv4-unicast
 neighbor 2.2.2.2 remote-as 65001
 neighbor 2.2.2.2 update-source Loopback0
 neighbor 10.0.0.2 remote-as 65002
 neighbor 10.0.0.2 ebgp-multihop 2
 !
 address-family ipv4 unicast
  network 192.168.1.0 mask 255.255.255.0
  neighbor 2.2.2.2 activate
  neighbor 2.2.2.2 next-hop-self
  neighbor 10.0.0.2 activate
  neighbor 10.0.0.2 route-map AS65002-IN in
 exit-address-family</code></pre>

<h2>אבחון</h2>
<pre><code>show bgp ipv4 unicast summary
show bgp ipv4 unicast neighbors 10.0.0.2 advertised-routes
show bgp ipv4 unicast 8.8.8.0/24
clear ip bgp 10.0.0.2 soft in
debug bgp ipv4 unicast updates</code></pre>
`
  },
  {
    id: "bgp-policy",
    category: "routing",
    title: "BGP — מדיניות עם Route-Maps ו-RR",
    summary: "Route-Map, prefix-list, communities, Route-Reflectors ו-Confederations.",
    minutes: 18,
    level: "ENARSI",
    body: `
<h2>Route-Maps</h2>
<pre><code>ip prefix-list CUST-NETS seq 5 permit 192.0.2.0/24
ip prefix-list CUST-NETS seq 10 permit 198.51.100.0/24

route-map AS65002-IN permit 10
 match ip address prefix-list CUST-NETS
 set local-preference 200
 set community 65001:100 additive
route-map AS65002-IN deny 99</code></pre>

<h2>BGP Communities</h2>
<p>Communities הם "תגיות" שמועברות בין נתבים ומאפשרים מדיניות מבוזרת. סוגים: סטנדרטי (32 ביט), מורחב (Extended), Large.</p>
<pre><code>ip community-list standard NO-EXPORT permit no-export
ip community-list standard PEERS permit 65001:300

route-map TO-PEER permit 10
 match community PEERS
 set community no-export additive</code></pre>

<h2>Route-Reflectors (RR)</h2>
<p>פותר את ה-Full-Mesh של iBGP. RR משכפל מסלולים בין Clients ל-Non-Clients תוך שמירת לולאה ע"י <em>Originator-ID</em> ו-<em>Cluster-List</em>.</p>
<pre><code>router bgp 65001
 neighbor 10.0.0.10 remote-as 65001
 neighbor 10.0.0.10 route-reflector-client</code></pre>

<blockquote>
חוקי RR: עדכון מ-Client → לכל ה-Peers. עדכון מ-Non-Client → רק ל-Clients. עדכון מ-eBGP → לכולם.
</blockquote>
`
  },
  {
    id: "redistribution",
    category: "routing",
    title: "Route Redistribution ולולאות ניתוב",
    summary: "ערבוב פרוטוקולים, AD, route-maps, ומניעת לולאות עם tags.",
    minutes: 14,
    level: "ENARSI",
    body: `
<p>Redistribution מאפשר להזרים מסלולים מפרוטוקול אחד לאחר. הסכנה: <strong>לולאות ניתוב</strong> ו-<strong>Sub-optimal routing</strong> כאשר ה-AD משחק עלינו.</p>

<h2>טבלת AD (ברירת מחדל)</h2>
<table>
  <thead><tr><th>מקור</th><th>AD</th></tr></thead>
  <tbody>
    <tr><td>Connected</td><td>0</td></tr>
    <tr><td>Static</td><td>1</td></tr>
    <tr><td>eBGP</td><td>20</td></tr>
    <tr><td>EIGRP (internal)</td><td>90</td></tr>
    <tr><td>OSPF</td><td>110</td></tr>
    <tr><td>IS-IS</td><td>115</td></tr>
    <tr><td>RIP</td><td>120</td></tr>
    <tr><td>EIGRP (external)</td><td>170</td></tr>
    <tr><td>iBGP</td><td>200</td></tr>
  </tbody>
</table>

<h2>פתרון Loop עם Tags</h2>
<pre><code>route-map OSPF-TO-EIGRP permit 10
 match ip address prefix-list FROM-OSPF
 set tag 110
route-map OSPF-TO-EIGRP deny 99

route-map EIGRP-TO-OSPF deny 10
 match tag 110
route-map EIGRP-TO-OSPF permit 20

router eigrp 100
 redistribute ospf 1 route-map OSPF-TO-EIGRP metric 100000 100 255 1 1500
router ospf 1
 redistribute eigrp 100 route-map EIGRP-TO-OSPF subnets</code></pre>
`
  },

  // ====================== SWITCHING ======================
  {
    id: "stp-rapid",
    category: "switching",
    title: "STP, RSTP ו-MST",
    summary: "מניעת לולאות L2, Root election, port roles, BPDU Guard ו-Root Guard.",
    minutes: 16,
    level: "מתקדם",
    body: `
<p><strong>Spanning Tree</strong> מונע לולאות ב-L2. RSTP (802.1w) מאיץ התכנסות; MST (802.1s) ממפה VLANs לאינסטנסים.</p>

<h2>בחירת Root Bridge</h2>
<ol>
  <li><strong>Bridge Priority</strong> הנמוך ביותר (ברירת מחדל 32768 + VLAN).</li>
  <li>אם שווה — <strong>MAC</strong> הנמוך ביותר.</li>
</ol>
<pre><code>spanning-tree vlan 10 root primary
spanning-tree vlan 10 priority 4096</code></pre>

<h2>תפקידי פורט (RSTP)</h2>
<ul>
  <li><strong>Root Port</strong> — המסלול הקצר ל-Root.</li>
  <li><strong>Designated</strong> — אחראי לסגמנט.</li>
  <li><strong>Alternate</strong> — גיבוי ל-Root.</li>
  <li><strong>Backup</strong> — גיבוי ל-Designated באותו סגמנט.</li>
</ul>

<h2>הגנות (Toolkit)</h2>
<table>
  <thead><tr><th>פיצ'ר</th><th>מטרה</th><th>איפה</th></tr></thead>
  <tbody>
    <tr><td>BPDU Guard</td><td>סוגר פורט שמקבל BPDU</td><td>פורטי משתמש (PortFast)</td></tr>
    <tr><td>BPDU Filter</td><td>מבטל שליחת/קבלת BPDU</td><td>בזהירות בלבד</td></tr>
    <tr><td>Root Guard</td><td>מונע מהפורט להפוך ל-Root</td><td>כלפי שכנים שאסור שיהיו Root</td></tr>
    <tr><td>Loop Guard</td><td>מונע מעבר ל-Designated אם BPDU נעלם</td><td>על Root/Alternate</td></tr>
    <tr><td>UDLD</td><td>מזהה Unidirectional link</td><td>קישורי סיב</td></tr>
  </tbody>
</table>

<h2>MST</h2>
<pre><code>spanning-tree mode mst
spanning-tree mst configuration
 name CORP
 revision 1
 instance 1 vlan 10,20,30
 instance 2 vlan 40,50,60
spanning-tree mst 1 priority 4096</code></pre>
`
  },
  {
    id: "etherchannel",
    category: "switching",
    title: "EtherChannel — LACP, PAgP ו-Load-Balancing",
    summary: "צבירת קישורים, פרוטוקולים, hashing וטעויות נפוצות.",
    minutes: 12,
    level: "מתקדם",
    body: `
<h2>פרוטוקולי משא ומתן</h2>
<table>
  <thead><tr><th>פרוטוקול</th><th>סטנדרט</th><th>מצבים תקפים</th></tr></thead>
  <tbody>
    <tr><td>LACP</td><td>802.3ad</td><td>active/active, active/passive</td></tr>
    <tr><td>PAgP</td><td>Cisco</td><td>desirable/desirable, desirable/auto</td></tr>
    <tr><td>Static</td><td>—</td><td>on/on</td></tr>
  </tbody>
</table>
<blockquote>אסור לערבב פרוטוקולים שונים בין שני קצוות. <code>on/on</code> לא בודק קישור — סכנה ללולאה.</blockquote>

<h2>הגדרה (LACP)</h2>
<pre><code>interface range Gi1/0/1 - 2
 channel-protocol lacp
 channel-group 1 mode active
!
interface Port-channel1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30</code></pre>

<h2>Load-Balancing</h2>
<pre><code>port-channel load-balance src-dst-ip
show etherchannel load-balance
show etherchannel summary</code></pre>
`
  },
  {
    id: "vlans-trunks",
    category: "switching",
    title: "VLANs, Trunks ו-VTP",
    summary: "802.1Q, Native VLAN, DTP, allowed list ו-VTP v3.",
    minutes: 10,
    level: "מבוא+",
    body: `
<h2>תיוג 802.1Q</h2>
<p>תוסף 4 בתים עם <strong>VLAN ID</strong> (12 ביט = 4094). פריימים ב-<em>Native VLAN</em> נשלחים <em>ללא</em> תיוג.</p>
<pre><code>interface Gi1/0/1
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30
 switchport nonegotiate</code></pre>

<h2>DTP</h2>
<p>DTP מנהל משא ומתן על מצב הפורט (trunk/access). בסביבת ייצור: השתמשו ב-<code>switchport mode access</code> או <code>trunk</code> + <code>nonegotiate</code>.</p>

<h2>VTP v3</h2>
<p>סנכרון מסד VLAN בין סוויצ'ים. v3 תומך גם ב-Private VLAN, MST configs ו-Primary Server לבחירה ידנית.</p>
<pre><code>vtp version 3
vtp domain CORP
vtp mode server
vtp primary vlan force</code></pre>
`
  },
  {
    id: "fhrp",
    category: "switching",
    title: "FHRP — HSRP, VRRP ו-GLBP",
    summary: "Default-Gateway redundancy, preempt, tracking וטעויות תכן.",
    minutes: 12,
    level: "מתקדם",
    body: `
<h2>השוואה</h2>
<table>
  <thead><tr><th></th><th>HSRP</th><th>VRRP</th><th>GLBP</th></tr></thead>
  <tbody>
    <tr><td>סטנדרט</td><td>Cisco</td><td>RFC 5798</td><td>Cisco</td></tr>
    <tr><td>קבוצות</td><td>0-255 (v1) / 0-4095 (v2)</td><td>0-255</td><td>0-1023</td></tr>
    <tr><td>Virtual MAC</td><td>0000.0C07.ACxx</td><td>0000.5E00.01xx</td><td>0007.B400.xxyy</td></tr>
    <tr><td>איזון עומסים</td><td>לפי קבוצות</td><td>לפי קבוצות</td><td>מובנה (AVG/AVF)</td></tr>
  </tbody>
</table>

<h2>HSRPv2 לדוגמה</h2>
<pre><code>interface Vlan10
 ip address 10.10.10.2 255.255.255.0
 standby version 2
 standby 10 ip 10.10.10.1
 standby 10 priority 110
 standby 10 preempt delay minimum 60
 standby 10 authentication md5 key-string S3cret!
 standby 10 track 1 decrement 20
!
track 1 interface Gi0/0 line-protocol</code></pre>
`
  },

  // ====================== SERVICES ======================
  {
    id: "nat",
    category: "services",
    title: "NAT — Static, Dynamic, PAT ו-NAT64",
    summary: "סוגי NAT, סדר הפעולות בנתב, ו-NAT לפתרונות IPv6.",
    minutes: 13,
    level: "מתקדם",
    body: `
<h2>סדר פעולות ב-Cisco IOS (Inside-to-Outside)</h2>
<ol>
  <li>בדיקת מדיניות (PBR)</li>
  <li>חיפוש ב-RIB</li>
  <li>NAT (inside → outside)</li>
  <li>ACL Outbound</li>
  <li>שליחה</li>
</ol>

<h2>PAT לדוגמה</h2>
<pre><code>ip access-list standard NAT-USERS
 permit 10.10.0.0 0.0.255.255

interface Gi0/0
 ip nat outside
interface Gi0/1
 ip nat inside

ip nat inside source list NAT-USERS interface Gi0/0 overload</code></pre>

<h2>Static NAT (Port forwarding)</h2>
<pre><code>ip nat inside source static tcp 10.10.10.10 80 198.51.100.5 8080 extendable</code></pre>

<h2>NAT64</h2>
<p>מתרגם תעבורת IPv6→IPv4. שילוב נפוץ: <strong>NAT64 + DNS64</strong>. <code>2001:db8:1::/96</code> הוא ה-WKP/Custom prefix שלפניו מצורף ה-IPv4.</p>
`
  },
  {
    id: "qos",
    category: "services",
    title: "QoS — MQC, Marking, Queuing ו-Shaping",
    summary: "אפיון, סימון (DSCP/CoS), תורים (CBWFQ/LLQ), שייפינג ופוליסינג.",
    minutes: 18,
    level: "מתקדם",
    body: `
<h2>מודל DiffServ</h2>
<p>סימון לפי <strong>DSCP</strong> (6 ביט) או <strong>CoS</strong> (3 ביט ב-802.1Q). PHB מוכרים:</p>
<table>
  <thead><tr><th>שירות</th><th>DSCP</th><th>שימוש</th></tr></thead>
  <tbody>
    <tr><td>EF</td><td>46</td><td>קול (Voice RTP)</td></tr>
    <tr><td>AF41</td><td>34</td><td>וידאו אינטראקטיבי</td></tr>
    <tr><td>CS6</td><td>48</td><td>Routing protocols</td></tr>
    <tr><td>CS3</td><td>24</td><td>Signaling</td></tr>
    <tr><td>BE</td><td>0</td><td>Best-effort</td></tr>
  </tbody>
</table>

<h2>MQC — Modular QoS CLI</h2>
<pre><code>class-map match-any VOICE
 match dscp ef
class-map match-any VIDEO
 match dscp af41 cs4

policy-map WAN-OUT
 class VOICE
  priority percent 20
 class VIDEO
  bandwidth percent 30
 class class-default
  fair-queue
  random-detect dscp-based

interface Gi0/0
 service-policy output WAN-OUT</code></pre>

<h2>Shaping מול Policing</h2>
<ul>
  <li><strong>Shaping</strong> — מאחסן בתור, מחליק תעבורה. בד"כ ב-Egress.</li>
  <li><strong>Policing</strong> — זורק/מסמן מחדש מיד. בד"כ ב-Ingress.</li>
</ul>
`
  },
  {
    id: "multicast",
    category: "services",
    title: "Multicast — IGMP ו-PIM",
    summary: "טווחי כתובות, IGMPv2/v3, PIM-SM, RP ו-MSDP.",
    minutes: 15,
    level: "ENARSI",
    body: `
<h2>טווחים</h2>
<ul>
  <li><code>224.0.0.0/24</code> — Link-local (OSPF 224.0.0.5/6, HSRP 224.0.0.2).</li>
  <li><code>232.0.0.0/8</code> — SSM.</li>
  <li><code>239.0.0.0/8</code> — Administratively-scoped (פרטי).</li>
</ul>

<h2>IGMP</h2>
<p>v2 — Join/Leave + Querier. v3 — תמיכה ב-Source-Specific (SSM).</p>

<h2>PIM-SM</h2>
<p>משתמש ב-<strong>RP</strong> כצומת מפגש. נתבים בונים תחילה עץ <em>RPT</em> (Root: RP) ולאחר מכן עוברים ל-<em>SPT</em> כאשר התעבורה מצדיקה.</p>
<pre><code>ip multicast-routing distributed
interface Gi0/0
 ip pim sparse-mode

ip pim rp-address 10.0.0.1
! או דינמי:
ip pim bsr-candidate Loopback0 0
ip pim rp-candidate Loopback0 group-list 10</code></pre>
`
  },
  {
    id: "ntp",
    category: "services",
    title: "NTP, PTP ו-DHCP מתקדם",
    summary: "Stratum, authentication, NTP server/client, DHCP relay ו-snooping.",
    minutes: 10,
    level: "מתקדם",
    body: `
<h2>NTP</h2>
<pre><code>ntp authenticate
ntp authentication-key 1 md5 N!ce
ntp trusted-key 1
ntp server 10.0.0.10 key 1 prefer
ntp source Loopback0</code></pre>

<h2>DHCP Relay</h2>
<pre><code>interface Vlan10
 ip helper-address 10.0.0.50
 ip helper-address 10.0.0.51</code></pre>

<h2>DHCP Snooping</h2>
<pre><code>ip dhcp snooping
ip dhcp snooping vlan 10,20
no ip dhcp snooping information option
interface Gi1/0/24
 ip dhcp snooping trust</code></pre>
`
  },

  // ====================== SECURITY ======================
  {
    id: "acl-zbf",
    category: "security",
    title: "ACL מתקדם ו-Zone-Based Firewall",
    summary: "סוגי ACL, Time-Based, Reflexive, ו-ZBFW מודרני.",
    minutes: 14,
    level: "מתקדם",
    body: `
<h2>ACL — תזכורות חשובות</h2>
<ul>
  <li>Wildcard mask = <em>היפוך</em> של subnet mask.</li>
  <li>Implicit <code>deny any</code> בסוף — מוסיפים <code>permit ip any any</code> במידת הצורך.</li>
  <li>סדר השורות קריטי — סדרו מהספציפי לכללי.</li>
  <li>Extended ACL — קרוב למקור; Standard — קרוב ליעד.</li>
</ul>
<pre><code>ip access-list extended FROM-DMZ
 deny   tcp 10.10.0.0 0.0.255.255 any eq 23
 permit tcp 10.10.0.0 0.0.255.255 any established
 permit udp any any eq 53
 permit icmp any any echo-reply
 deny   ip any any log</code></pre>

<h2>Zone-Based Firewall</h2>
<pre><code>zone security INSIDE
zone security OUTSIDE

class-map type inspect match-any WEB
 match protocol http
 match protocol https

policy-map type inspect IN-TO-OUT
 class type inspect WEB
  inspect
 class class-default
  drop

zone-pair security IN2OUT source INSIDE destination OUTSIDE
 service-policy type inspect IN-TO-OUT

interface Gi0/0
 zone-member security OUTSIDE
interface Gi0/1
 zone-member security INSIDE</code></pre>
`
  },
  {
    id: "aaa",
    category: "security",
    title: "AAA — TACACS+ ו-RADIUS",
    summary: "Authentication, Authorization, Accounting, ISE ושימוש ב-method-lists.",
    minutes: 12,
    level: "מתקדם",
    body: `
<table>
  <thead><tr><th></th><th>TACACS+</th><th>RADIUS</th></tr></thead>
  <tbody>
    <tr><td>Transport</td><td>TCP/49</td><td>UDP/1812,1813</td></tr>
    <tr><td>הצפנה</td><td>כל ה-payload</td><td>סיסמה בלבד</td></tr>
    <tr><td>AAA</td><td>מפריד בין A/A/A</td><td>משלב Auth+Auth</td></tr>
    <tr><td>שימוש</td><td>ניהול ציוד</td><td>גישת רשת (802.1X)</td></tr>
  </tbody>
</table>

<pre><code>aaa new-model
aaa group server tacacs+ ISE-T
 server name ISE1
tacacs server ISE1
 address ipv4 10.0.0.20
 key Cisc0L!ve

aaa authentication login VTY-LOGIN group ISE-T local
aaa authorization exec VTY-EXEC  group ISE-T local
aaa accounting commands 15 VTY-CMD start-stop group ISE-T

line vty 0 4
 login authentication VTY-LOGIN
 authorization exec   VTY-EXEC
 accounting commands 15 VTY-CMD</code></pre>
`
  },
  {
    id: "copp",
    category: "security",
    title: "CoPP ו-Control-Plane Protection",
    summary: "הגנת המעבד מ-DoS בעזרת MQC על ה-control-plane.",
    minutes: 10,
    level: "ENARSI",
    body: `
<p><strong>CoPP</strong> מגן על ה-CPU של הנתב ע"י סינון ופוליסינג של תעבורה שמגיעה אל ה-Control Plane.</p>
<pre><code>ip access-list extended ACL-BGP
 permit tcp host 10.0.0.2 host 10.0.0.1 eq 179
 permit tcp host 10.0.0.1 eq 179 host 10.0.0.2

class-map match-any CM-BGP
 match access-group name ACL-BGP

policy-map PM-COPP
 class CM-BGP
  police 8000 conform-action transmit exceed-action drop
 class class-default
  police 32000 conform-action transmit exceed-action drop

control-plane
 service-policy input PM-COPP</code></pre>
`
  },

  // ====================== WIRELESS ======================
  {
    id: "wireless-arch",
    category: "wireless",
    title: "ארכיטקטורות אלחוט וסיסקו CAPWAP",
    summary: "Autonomous, Centralized (WLC), FlexConnect, Mobility Express ו-Cloud.",
    minutes: 12,
    level: "מתקדם",
    body: `
<h2>סוגי AP</h2>
<ul>
  <li><strong>Autonomous</strong> — IOS מלא, ללא WLC.</li>
  <li><strong>Lightweight + WLC (Central)</strong> — CAPWAP, control + data ל-WLC.</li>
  <li><strong>FlexConnect</strong> — control ל-WLC, data נשאר מקומי בסניף.</li>
  <li><strong>Mobility Express</strong> — WLC רץ על ה-AP עצמו.</li>
  <li><strong>Cloud-managed (Meraki)</strong> — ניהול בענן, dataplane מקומי.</li>
</ul>

<h2>CAPWAP</h2>
<p>UDP 5246 (control, מוצפן DTLS) ו-5247 (data). תהליך גילוי: Static → Broadcast → DHCP option 43 → DNS → Backup.</p>

<h2>WLC ותפקידים</h2>
<ul>
  <li><strong>WLC</strong> — ניהול AP, אבטחה, mobility.</li>
  <li><strong>WLAN</strong> — SSID + security profile.</li>
  <li><strong>RF Profile</strong> — הגדרות רדיו (DCA, TPC).</li>
</ul>
`
  },
  {
    id: "wireless-security",
    category: "wireless",
    title: "אבטחת אלחוט — WPA2/3, 802.1X ו-Guest",
    summary: "WPA2-Personal/Enterprise, WPA3 SAE, EAP types, Captive Portal.",
    minutes: 14,
    level: "מתקדם",
    body: `
<h2>סטנדרטים</h2>
<ul>
  <li><strong>WPA2-Personal</strong> — PSK + AES/CCMP.</li>
  <li><strong>WPA2-Enterprise</strong> — 802.1X + RADIUS + EAP.</li>
  <li><strong>WPA3-Personal</strong> — SAE (Simultaneous Authentication of Equals), עמיד ל-offline dictionary.</li>
  <li><strong>WPA3-Enterprise 192-bit</strong> — סוויטות הצפנה גבוהות לסביבות ממשלתיות.</li>
</ul>

<h2>סוגי EAP נפוצים</h2>
<table>
  <thead><tr><th>EAP</th><th>Inner</th><th>הערות</th></tr></thead>
  <tbody>
    <tr><td>EAP-TLS</td><td>תעודות</td><td>הכי מאובטח, מורכב לפריסה</td></tr>
    <tr><td>PEAP</td><td>MSCHAPv2</td><td>נפוץ ב-AD</td></tr>
    <tr><td>EAP-FAST</td><td>PAC</td><td>סיסקו, מהיר</td></tr>
  </tbody>
</table>
`
  },

  // ====================== VPN ======================
  {
    id: "mpls-l3vpn",
    category: "vpn",
    title: "MPLS L3VPN — PE/CE, VRF ו-MP-BGP",
    summary: "תיוג, LDP, VRF, RD/RT ושימוש ב-VPNv4.",
    minutes: 20,
    level: "ENARSI",
    body: `
<h2>אלמנטים</h2>
<ul>
  <li><strong>P</strong> — Provider core, מבצע switching של labels.</li>
  <li><strong>PE</strong> — Provider Edge, מחזיק VRF ללקוחות.</li>
  <li><strong>CE</strong> — Customer Edge.</li>
</ul>

<h2>RD ו-RT</h2>
<ul>
  <li><strong>RD (Route Distinguisher)</strong> — 64 ביט שנדבק ל-prefix כדי לייחד אותו (VPNv4 = 96 ביט).</li>
  <li><strong>RT (Route Target)</strong> — Extended community שקובע "מי מקבל מה" בין VRFs.</li>
</ul>

<h2>הגדרת VRF + MP-BGP</h2>
<pre><code>vrf definition CUST_A
 rd 65000:100
 address-family ipv4
  route-target export 65000:100
  route-target import 65000:100
 exit-address-family

interface Gi0/1
 vrf forwarding CUST_A
 ip address 10.1.1.1 255.255.255.252

router bgp 65000
 neighbor 2.2.2.2 remote-as 65000
 neighbor 2.2.2.2 update-source Loopback0
 address-family vpnv4
  neighbor 2.2.2.2 activate
  neighbor 2.2.2.2 send-community both
 address-family ipv4 vrf CUST_A
  neighbor 10.1.1.2 remote-as 65100
  neighbor 10.1.1.2 activate</code></pre>
`
  },
  {
    id: "dmvpn",
    category: "vpn",
    title: "DMVPN — mGRE, NHRP ו-IPsec",
    summary: "Phase 1/2/3, Hub-Spoke, Spoke-to-Spoke ו-IPsec profiles.",
    minutes: 16,
    level: "ENARSI",
    body: `
<h2>שלבים</h2>
<ul>
  <li><strong>Phase 1</strong> — רק Hub-Spoke; כל התעבורה דרך Hub.</li>
  <li><strong>Phase 2</strong> — Spoke-to-Spoke; routing מצריך next-hop ללא שינוי.</li>
  <li><strong>Phase 3</strong> — Spoke-to-Spoke עם NHRP shortcut + redirect.</li>
</ul>

<h2>Hub Sample</h2>
<pre><code>crypto ikev2 keyring KR
 peer ANY
  address 0.0.0.0 0.0.0.0
  pre-shared-key SuperSecret!
crypto ikev2 profile P
 match identity remote address 0.0.0.0
 authentication local pre-share
 authentication remote pre-share
 keyring local KR
crypto ipsec profile IPSEC-P
 set ikev2-profile P

interface Tunnel0
 ip address 10.255.0.1 255.255.0.0
 no ip redirects
 ip mtu 1400
 ip nhrp authentication NHRPkey
 ip nhrp network-id 100
 ip nhrp redirect
 tunnel source GigabitEthernet0/0
 tunnel mode gre multipoint
 tunnel protection ipsec profile IPSEC-P</code></pre>
`
  },
  {
    id: "vxlan-evpn",
    category: "vpn",
    title: "VXLAN ו-EVPN — Data-Center Overlay",
    summary: "VTEP, VNI, BGP EVPN וגישור L2 על L3.",
    minutes: 14,
    level: "מתקדם",
    body: `
<p><strong>VXLAN</strong> עוטף L2 בתוך UDP/4789 ומאפשר Stretching של VLAN דרך תשתית L3. <strong>VNI</strong> (24 ביט) = 16M רשתות.</p>
<p><strong>EVPN</strong> משתמש ב-MP-BGP כ-control-plane: כל VTEP מפרסם MAC/IP, נקודות קצה ו-prefixes באמצעות family <code>l2vpn evpn</code>.</p>
<pre><code>feature nv overlay
feature vn-segment-vlan-based
feature bgp
feature pim

interface nve1
 source-interface loopback0
 host-reachability protocol bgp
 member vni 10010
  ingress-replication protocol bgp

router bgp 65000
 address-family l2vpn evpn
  retain route-target all
 neighbor 10.0.0.2
  remote-as 65000
  update-source loopback0
  address-family l2vpn evpn
   send-community both</code></pre>
`
  },

  // ====================== AUTOMATION ======================
  {
    id: "rest-yang",
    category: "automation",
    title: "REST, NETCONF, RESTCONF ו-YANG",
    summary: "פרוטוקולים מודרניים לניהול ציוד והבדלים בין RPC ל-REST.",
    minutes: 14,
    level: "מתקדם",
    body: `
<h2>השוואה</h2>
<table>
  <thead><tr><th></th><th>NETCONF</th><th>RESTCONF</th><th>gNMI</th></tr></thead>
  <tbody>
    <tr><td>Transport</td><td>SSH (830)</td><td>HTTPS</td><td>gRPC/HTTP2</td></tr>
    <tr><td>Encoding</td><td>XML</td><td>JSON/XML</td><td>Protobuf</td></tr>
    <tr><td>Model</td><td>YANG</td><td>YANG</td><td>YANG</td></tr>
    <tr><td>Datastore</td><td>running/candidate/startup</td><td>בעיקר running</td><td>—</td></tr>
  </tbody>
</table>

<h2>RESTCONF — דוגמה</h2>
<pre><code>GET /restconf/data/ietf-interfaces:interfaces
Accept: application/yang-data+json
Authorization: Basic …</code></pre>

<h2>Python + requests</h2>
<pre><code>import requests, urllib3
urllib3.disable_warnings()

url = "https://192.0.2.1/restconf/data/ietf-interfaces:interfaces"
r = requests.get(url, auth=("admin","cisco"),
                 headers={"Accept":"application/yang-data+json"},
                 verify=False)
print(r.json())</code></pre>
`
  },
  {
    id: "python-netmiko",
    category: "automation",
    title: "Python ו-Netmiko לאוטומציה",
    summary: "SSH ב-Python, אידיומים נפוצים ו-Jinja2 לקונפיגים.",
    minutes: 12,
    level: "מתקדם",
    body: `
<pre><code>from netmiko import ConnectHandler

dev = {
  "device_type": "cisco_ios",
  "host": "192.0.2.10",
  "username": "admin",
  "password": "cisco",
  "secret": "enable",
}
with ConnectHandler(**dev) as c:
    c.enable()
    print(c.send_command("show ip interface brief"))
    c.send_config_set([
       "interface Loopback9",
       "ip address 9.9.9.9 255.255.255.255"
    ])
    c.save_config()</code></pre>

<h2>תבנית Jinja2</h2>
<pre><code>{% for i in interfaces %}
interface {{ i.name }}
 description {{ i.desc }}
 ip address {{ i.ip }} {{ i.mask }}
 no shutdown
{% endfor %}</code></pre>
`
  },
  {
    id: "sdn-sdwan",
    category: "automation",
    title: "SDN, SD-Access ו-SD-WAN",
    summary: "Underlay vs Overlay, Fabric, vSmart/vBond/vManage ו-DNA Center.",
    minutes: 14,
    level: "מתקדם",
    body: `
<h2>SDN</h2>
<p>הפרדה בין Data-Plane ל-Control-Plane. ארכיטקטורה מודרנית: <em>Controller</em> + <em>Southbound</em> (NETCONF/OpenFlow) + <em>Northbound</em> (REST).</p>

<h2>SD-Access</h2>
<ul>
  <li><strong>Underlay</strong> — IS-IS/OSPF.</li>
  <li><strong>Overlay</strong> — VXLAN data, LISP control, CTS/SGT לאבטחה.</li>
  <li><strong>Fabric Nodes</strong>: Edge, Border, Control-Plane.</li>
  <li><strong>DNA Center</strong> מנהל ומפעיל את ה-Fabric.</li>
</ul>

<h2>SD-WAN</h2>
<ul>
  <li><strong>vManage</strong> — ניהול.</li>
  <li><strong>vBond</strong> — אוריינטציה ו-NAT traversal.</li>
  <li><strong>vSmart</strong> — control-plane (OMP).</li>
  <li><strong>vEdge / cEdge</strong> — נתבי קצה שמקימים IPsec/GRE.</li>
</ul>
`
  },

  // ====================== ASSURANCE ======================
  {
    id: "monitoring",
    category: "assurance",
    title: "SNMP, Syslog ו-NetFlow",
    summary: "כלי ניטור בסיסיים, SNMPv3, מבני NetFlow ו-IPFIX.",
    minutes: 12,
    level: "מתקדם",
    body: `
<pre><code>! SNMPv3
snmp-server group OPS v3 priv read VIEW1 write VIEW1
snmp-server user mon OPS v3 auth sha M0nitor! priv aes 256 PrivK3y!
snmp-server view VIEW1 iso included

! Syslog
logging host 10.0.0.50
logging trap informational
logging source-interface Loopback0

! NetFlow v9 / Flexible NetFlow
flow record FNF-RECORD
 match ipv4 source address
 match ipv4 destination address
 match transport source-port
 match transport destination-port
 collect counter bytes
 collect counter packets

flow exporter FNF-EXP
 destination 10.0.0.60
 transport udp 9996

flow monitor FNF
 record FNF-RECORD
 exporter FNF-EXP

interface Gi0/0
 ip flow monitor FNF input</code></pre>
`
  },
  {
    id: "span-erspan",
    category: "assurance",
    title: "SPAN, RSPAN ו-ERSPAN",
    summary: "Mirror של תעבורה למטרות ניטור ופתרון בעיות.",
    minutes: 8,
    level: "מתקדם",
    body: `
<pre><code>! SPAN מקומי
monitor session 1 source interface Gi1/0/1 - 2 both
monitor session 1 destination interface Gi1/0/24

! RSPAN בין סוויצ'ים על ה-VLAN
vlan 999
 remote-span
monitor session 2 source interface Gi1/0/1
monitor session 2 destination remote vlan 999

! ERSPAN על L3 (GRE)
monitor session 3 type erspan-source
 source interface Gi0/0
 destination
  erspan-id 100
  ip address 10.0.0.99
  origin ip address 1.1.1.1</code></pre>
`
  },
  {
    id: "ip-sla",
    category: "assurance",
    title: "IP SLA ו-Tracking",
    summary: "מדידת זמינות, ביצועים, ושילוב עם static routing ו-FHRP.",
    minutes: 10,
    level: "מתקדם",
    body: `
<pre><code>ip sla 1
 icmp-echo 8.8.8.8 source-interface Gi0/0
 frequency 5
ip sla schedule 1 life forever start-time now

track 10 ip sla 1 reachability

ip route 0.0.0.0 0.0.0.0 198.51.100.1 track 10
ip route 0.0.0.0 0.0.0.0 203.0.113.1 200</code></pre>
`
  },

  // ====================== ARCHITECTURE ======================
  {
    id: "campus-design",
    category: "architecture",
    title: "תכן Campus — 2-Tier ו-3-Tier",
    summary: "Access/Distribution/Core, StackWise, חיבוריות, ושיקולי SD-Access.",
    minutes: 12,
    level: "מתקדם",
    body: `
<h2>שכבות</h2>
<ul>
  <li><strong>Access</strong> — חיבור משתמשים, PoE, 802.1X, QoS marking.</li>
  <li><strong>Distribution</strong> — סיכום ניתוב, ACLs, FHRP, מדיניות.</li>
  <li><strong>Core</strong> — switching מהיר, ללא מדיניות.</li>
</ul>

<h2>Collapsed Core (2-Tier)</h2>
<p>מתאים לארגונים קטנים/בינוניים — Distribution ו-Core מאוחדים.</p>

<h2>שיטות מודרניות</h2>
<ul>
  <li><strong>StackWise / VSS</strong> — איחוד מספר סוויצ'ים פיזיים ל-logical אחד.</li>
  <li><strong>Routed Access</strong> — L3 עד לשכבת הגישה (מהיר יותר מ-STP).</li>
  <li><strong>SD-Access</strong> — Fabric, segmentation עם SGT.</li>
</ul>
`
  },
  {
    id: "ipv6-basics",
    category: "architecture",
    title: "IPv6 — Addressing, SLAAC ו-First-Hop Security",
    summary: "סוגי כתובות, RA, DHCPv6, RA-Guard ו-DHCPv6 Guard.",
    minutes: 14,
    level: "מתקדם",
    body: `
<h2>סוגי כתובות</h2>
<ul>
  <li><strong>Link-Local</strong> — <code>fe80::/10</code>.</li>
  <li><strong>Global Unicast</strong> — <code>2000::/3</code>.</li>
  <li><strong>Unique Local</strong> — <code>fc00::/7</code>.</li>
  <li><strong>Multicast</strong> — <code>ff00::/8</code> (FF02::1 All Nodes, FF02::2 All Routers).</li>
</ul>

<h2>SLAAC מול DHCPv6</h2>
<p>RA קובע אם הלקוח עושה SLAAC (A=1), Stateless DHCP (O=1) או Stateful DHCP (M=1).</p>

<h2>First-Hop Security</h2>
<pre><code>ipv6 nd raguard policy MY-RAG
 device-role host
interface range Gi1/0/1 - 24
 ipv6 nd raguard attach-policy MY-RAG

ipv6 dhcp guard policy DG
 device-role client
interface range Gi1/0/1 - 24
 ipv6 dhcp guard attach-policy DG</code></pre>
`
  }
];
