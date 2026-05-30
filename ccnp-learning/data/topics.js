// ===== CCNP Topic Content =====
const TOPICS = [
  {
    id: "ospf",
    name: "OSPF",
    fullName: "Open Shortest Path First",
    icon: "🔄",
    color: "#1a73e8",
    description: "פרוטוקול ניתוב Link-State המבוסס על אלגוריתם Dijkstra",
    tags: ["Layer 3", "IGP", "Link-State", "RFC 2328"],
    subtopics: [
      {
        title: "מבוא ל-OSPF",
        content: `
          <h4>מהו OSPF?</h4>
          <p>OSPF (Open Shortest Path First) הוא פרוטוקול ניתוב פנימי (IGP) מסוג Link-State. הוא עובד על ידי בניית מפה טופולוגית מלאה של הרשת ומחשב את הנתיב הקצר ביותר לכל יעד באמצעות אלגוריתם Dijkstra (SPF).</p>
          <p>OSPF מוגדר ב-RFC 2328 ל-IPv4 וב-RFC 5340 ל-IPv6 (OSPFv3).</p>
          <h4>יתרונות OSPF</h4>
          <ul>
            <li>התכנסות מהירה (Fast Convergence)</li>
            <li>תמיכה ב-VLSM ו-CIDR</li>
            <li>שימוש ב-Multicast (224.0.0.5, 224.0.0.6) במקום Broadcast</li>
            <li>ללא מגבלת Hop Count</li>
            <li>תמיכה בריבוי אזורים (Multi-Area)</li>
            <li>Authentication מובנה</li>
          </ul>
          <div class="info-box">💡 OSPF משתמש ב-Metric שנקרא Cost, המחושב כ: Cost = 10^8 / Bandwidth (bps). ניתן לשנות את Reference Bandwidth.</div>
        `
      },
      {
        title: "OSPF Neighbor & Adjacency",
        content: `
          <h4>Hello Protocol</h4>
          <p>OSPF משתמש ב-Hello Packets לגילוי ותחזוקת שכנים. ה-Hello נשלח כל Hello Interval (ברירת מחדל: 10 שניות ב-Broadcast, 30 שניות ב-NBMA).</p>
          <h4>פרמטרים לשכנות</h4>
          <ul>
            <li>Hello & Dead Intervals חייבים להתאים</li>
            <li>Area ID חייב להיות זהה</li>
            <li>Authentication חייב להתאים</li>
            <li>Stub Area Flag חייב להתאים</li>
            <li>MTU חייב להתאים (ניתן להשבית עם ip ospf mtu-ignore)</li>
          </ul>
          <h4>מצבי שכנות (Neighbor States)</h4>
          <ul>
            <li><strong>Down</strong> – אין תקשורת</li>
            <li><strong>Init</strong> – קיבלנו Hello אבל הראוטר שלנו לא מוזכר בו</li>
            <li><strong>2-Way</strong> – שני הצדדים רואים זה את זה (DR/BDR election מתרחש כאן)</li>
            <li><strong>ExStart</strong> – המשא ומתן על Master/Slave ו-Sequence Number</li>
            <li><strong>Exchange</strong> – שיתוף DBD (Database Description)</li>
            <li><strong>Loading</strong> – שליחת LSR/LSU להשלמת מידע חסר</li>
            <li><strong>Full</strong> – מסד הנתונים מסונכרן במלואו</li>
          </ul>
        `
      },
      {
        title: "DR/BDR Election",
        content: `
          <h4>מדוע DR/BDR?</h4>
          <p>ברשתות Multi-Access (כמו Ethernet), אם כל ראוטר יבנה adjacency עם כל ראוטר אחר, יהיו n*(n-1)/2 adjacencies. DR ו-BDR מצמצמים את זה.</p>
          <h4>תהליך הבחירה</h4>
          <ul>
            <li>הראוטר עם ה-Priority הגבוה ביותר נבחר כ-DR (ברירת מחדל: 1)</li>
            <li>Priority = 0 מונע מהראוטר להיבחר</li>
            <li>בשיוויון Priority, ה-Router ID הגבוה ביותר מנצח</li>
            <li>הבחירה היא Non-Preemptive – DR לא יוחלף עד שייפול</li>
          </ul>
          <div class="code-block">interface GigabitEthernet0/0
 ip ospf priority 100    ! Set higher priority to become DR</div>
          <h4>Router ID</h4>
          <p>סדר עדיפויות: 1) router-id מוגדר ידנית, 2) כתובת ה-Loopback הגבוהה, 3) ה-Interface IP הגבוה ביותר</p>
          <div class="code-block">router ospf 1
 router-id 1.1.1.1</div>
        `
      },
      {
        title: "OSPF Areas & LSA Types",
        content: `
          <h4>Multi-Area OSPF</h4>
          <p>אזורים מצמצמים את גודל ה-LSDB, מגבילים SPF recalculations, ומאפשרים Summarization.</p>
          <ul>
            <li><strong>Area 0 (Backbone)</strong> – כל אזור חייב להתחבר אליו</li>
            <li><strong>Regular Area</strong> – אזור רגיל</li>
            <li><strong>Stub Area</strong> – חוסם LSA type 5 (External), מקבל Default Route</li>
            <li><strong>Totally Stubby</strong> – חוסם גם type 3 (Summary LSA)</li>
            <li><strong>NSSA</strong> – Stub עם אפשרות לייבא External Routes</li>
          </ul>
          <h4>סוגי LSA</h4>
          <ul>
            <li><strong>Type 1 (Router LSA)</strong> – נוצר על ידי כל ראוטר, מתאר links באזור שלו</li>
            <li><strong>Type 2 (Network LSA)</strong> – נוצר על ידי DR, מתאר Multi-Access networks</li>
            <li><strong>Type 3 (Summary LSA)</strong> – נוצר על ידי ABR, מתאר Inter-Area routes</li>
            <li><strong>Type 4 (ASBR Summary)</strong> – מציין מיקום ה-ASBR</li>
            <li><strong>Type 5 (External LSA)</strong> – External routes מה-ASBR, Flooding לכל הדומיין</li>
            <li><strong>Type 7 (NSSA External)</strong> – External routes בתוך NSSA</li>
          </ul>
          <div class="code-block">router ospf 1
 area 1 stub no-summary     ! Totally Stubby
 area 2 nssa                ! NSSA
 area 1 range 10.1.0.0 255.255.0.0  ! Summarization</div>
        `
      },
      {
        title: "OSPF Virtual Links & Authentication",
        content: `
          <h4>Virtual Links</h4>
          <p>כאשר אזור אינו מחובר ישירות ל-Area 0, ניתן ליצור Virtual Link דרך אזור Transit.</p>
          <div class="code-block">! On both ABRs in transit area
router ospf 1
 area 2 virtual-link 2.2.2.2    ! Router ID of the other ABR</div>
          <h4>OSPF Authentication</h4>
          <p>OSPF תומך ב-3 סוגי Authentication:</p>
          <ul>
            <li>Type 0 – ללא Authentication</li>
            <li>Type 1 – Plain-text (Clear text password)</li>
            <li>Type 2 – MD5 (מוצפן)</li>
          </ul>
          <div class="code-block">! Interface-level MD5 Auth
interface GigabitEthernet0/0
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 MyPassword

! Or area-level
router ospf 1
 area 0 authentication message-digest</div>
          <div class="warning-box">⚠️ בחינות CCNP רבות בודקות את ההבדל בין Virtual Link לגשר רגיל. Virtual Link חייב לעבור דרך Regular Area (לא Stub).</div>
        `
      }
    ]
  },
  {
    id: "bgp",
    name: "BGP",
    fullName: "Border Gateway Protocol",
    icon: "🌍",
    color: "#ea4335",
    description: "פרוטוקול ניתוב בין-אוטונומי, עמוד השדרה של האינטרנט",
    tags: ["Layer 3", "EGP", "Path-Vector", "RFC 4271"],
    subtopics: [
      {
        title: "יסודות BGP",
        content: `
          <h4>מהו BGP?</h4>
          <p>BGP (Border Gateway Protocol) הוא פרוטוקול ניתוב מסוג Path-Vector המשמש לניתוב בין Autonomous Systems (AS). הוא הפרוטוקול שמנהל את הניתוב באינטרנט.</p>
          <h4>iBGP vs eBGP</h4>
          <ul>
            <li><strong>eBGP</strong> – בין ראוטרים ב-AS שונות. ברירת מחדל: TTL=1 (שכנים חייבים להיות ישירים)</li>
            <li><strong>iBGP</strong> – בין ראוטרים באותו AS. Administrative Distance = 200</li>
          </ul>
          <div class="code-block">! eBGP session
router bgp 65001
 neighbor 192.168.1.2 remote-as 65002

! iBGP session
router bgp 65001
 neighbor 10.0.0.2 remote-as 65001
 neighbor 10.0.0.2 update-source Loopback0</div>
          <h4>BGP Messages</h4>
          <ul>
            <li><strong>OPEN</strong> – יצירת Session (AS Number, BGP Version, Router ID)</li>
            <li><strong>UPDATE</strong> – שיתוף נתיבים חדשים או ביטול ישנים</li>
            <li><strong>KEEPALIVE</strong> – שמירת ה-Session (ברירת מחדל: כל 60 שניות)</li>
            <li><strong>NOTIFICATION</strong> – דיווח שגיאה וסגירת Session</li>
          </ul>
        `
      },
      {
        title: "BGP Attributes & Path Selection",
        content: `
          <h4>BGP Path Selection (סדר עדיפויות)</h4>
          <p>כשיש מספר נתיבים לאותו יעד, BGP בוחר לפי הסדר הבא:</p>
          <ul>
            <li>1. <strong>Weight</strong> – Cisco proprietary, גבוה יותר = עדיף (ברירת מחדל: 0)</li>
            <li>2. <strong>Local Preference</strong> – iBGP, גבוה יותר = עדיף (ברירת מחדל: 100)</li>
            <li>3. <strong>Locally Originated</strong> – network/aggregate commands</li>
            <li>4. <strong>AS Path</strong> – קצר יותר = עדיף</li>
            <li>5. <strong>Origin</strong> – IGP (i) &gt; EGP (e) &gt; Incomplete (?)</li>
            <li>6. <strong>MED</strong> – נמוך יותר = עדיף</li>
            <li>7. <strong>eBGP over iBGP</strong></li>
            <li>8. <strong>IGP Metric to Next-Hop</strong> – נמוך יותר = עדיף</li>
            <li>9. <strong>Router ID</strong> – נמוך יותר = עדיף</li>
          </ul>
          <div class="info-box">💡 כלל עזר: "We Love Oranges AS Oranges Mean Pure Refreshment" – Weight, Local Pref, Originated, AS Path, Origin, MED, Prefer eBGP, Router ID</div>
          <div class="code-block">! Set Local Preference via Route-Map
route-map SET-LOCAL-PREF permit 10
 set local-preference 200
!
router bgp 65001
 neighbor 10.0.0.2 route-map SET-LOCAL-PREF in</div>
        `
      },
      {
        title: "BGP Communities & Route Filtering",
        content: `
          <h4>BGP Communities</h4>
          <p>Communities הם תגיות שניתן לצרף לנתיבים לצורך סינון ומדיניות.</p>
          <ul>
            <li><strong>no-export</strong> (0xFFFFFF01) – אל תעביר לשכני eBGP</li>
            <li><strong>no-advertise</strong> (0xFFFFFF02) – אל תעביר לאף שכן</li>
            <li><strong>local-AS</strong> (0xFFFFFF03) – אל תעביר מחוץ ל-sub-AS</li>
          </ul>
          <div class="code-block">! Set community and send it
router bgp 65001
 neighbor 10.0.0.2 send-community
!
route-map TAG-ROUTE permit 10
 set community 65001:100 no-export</div>
          <h4>Route Filtering</h4>
          <ul>
            <li><strong>Prefix-list</strong> – סינון לפי רשת/mask</li>
            <li><strong>Route-map</strong> – סינון מורכב עם תנאים</li>
            <li><strong>AS-path filter</strong> – סינון לפי AS Path</li>
          </ul>
          <div class="code-block">! Prefix-list filter
ip prefix-list BLOCK-DEFAULT deny 0.0.0.0/0
ip prefix-list BLOCK-DEFAULT permit 0.0.0.0/0 le 32
!
router bgp 65001
 neighbor 192.168.1.2 prefix-list BLOCK-DEFAULT in</div>
        `
      },
      {
        title: "BGP Scalability & Route Reflectors",
        content: `
          <h4>iBGP Full Mesh Problem</h4>
          <p>iBGP מחייב Full Mesh – כל ראוטר חייב להיות connected לכל ראוטר אחר (n*(n-1)/2 sessions). עם 100 ראוטרים = 4,950 sessions!</p>
          <h4>Route Reflectors (RR)</h4>
          <p>ה-RR מקבל routes מ-Clients ומפרסם אותם לכל ה-Clients וה-Non-Clients האחרים.</p>
          <ul>
            <li>RR Clients אינם זקוקים ל-Full Mesh ביניהם</li>
            <li>ה-RR מוסיף ORIGINATOR_ID ו-CLUSTER_LIST למניעת לולאות</li>
            <li>ניתן לשים מספר RRs לצורך Redundancy</li>
          </ul>
          <div class="code-block">! Route Reflector configuration
router bgp 65001
 neighbor 10.0.0.1 remote-as 65001
 neighbor 10.0.0.1 route-reflector-client
 neighbor 10.0.0.2 remote-as 65001
 neighbor 10.0.0.2 route-reflector-client</div>
          <h4>Confederations</h4>
          <p>חלוקת AS אחד לכמה Sub-AS. ה-eBGP מנהל את התקשורת בין Sub-ASes, אבל הם נראים כ-AS אחד מבחוץ.</p>
        `
      }
    ]
  },
  {
    id: "eigrp",
    name: "EIGRP",
    fullName: "Enhanced IGRP",
    icon: "⚡",
    color: "#34a853",
    description: "פרוטוקול Cisco הייברידי עם התכנסות מהירה מאוד",
    tags: ["Layer 3", "IGP", "Hybrid", "DUAL Algorithm"],
    subtopics: [
      {
        title: "יסודות EIGRP",
        content: `
          <h4>מהו EIGRP?</h4>
          <p>EIGRP (Enhanced Interior Gateway Routing Protocol) הוא פרוטוקול ניתוב Hybrid – משלב תכונות של Distance-Vector ו-Link-State. הוא הפרוטוקול המהיר ביותר להתכנסות ב-IGP.</p>
          <h4>מאפיינים עיקריים</h4>
          <ul>
            <li>אלגוריתם DUAL (Diffusing Update Algorithm) למניעת לולאות ו-Fast Convergence</li>
            <li>Partial Updates – שולח עדכונים רק כשיש שינוי (לא periodic)</li>
            <li>תמיכה ב-VLSM, CIDR ו-Summarization</li>
            <li>Multiple Network Layer Protocol support (IP, IPX, AppleTalk)</li>
            <li>Administrative Distance: iBGP=200, eBGP=20, EIGRP Internal=90, External=170</li>
          </ul>
          <div class="code-block">router eigrp 100
 network 10.0.0.0 0.0.0.255
 network 192.168.1.0
 no auto-summary</div>
        `
      },
      {
        title: "EIGRP Metric & Tables",
        content: `
          <h4>Composite Metric</h4>
          <p>EIGRP מחשב Metric לפי: Metric = 256 * [K1*BW + (K2*BW)/(256-Load) + K3*Delay] * [K5/(Reliability+K4)]</p>
          <p>ברירת מחדל: K1=1, K2=0, K3=1, K4=0, K5=0</p>
          <p>כלומר: <strong>Metric = 256 * (10^7/BW + Delay/10)</strong> כשהמטריקה הפשוטה: Bandwidth + Delay</p>
          <div class="info-box">💡 Bandwidth = 10^7 / min_bandwidth_kbps × 256. Delay = sum_of_delays_microseconds / 10 × 256</div>
          <h4>Terminology</h4>
          <ul>
            <li><strong>Feasible Distance (FD)</strong> – המטריקה הטובה ביותר לכל יעד</li>
            <li><strong>Reported Distance (RD) / Advertised Distance</strong> – המטריקה שהשכן מדווח</li>
            <li><strong>Successor</strong> – הנתיב הטוב ביותר (נכנס לטבלת הניתוב)</li>
            <li><strong>Feasible Successor</strong> – גיבוי מוכן, RD &lt; FD של ה-Successor (Feasibility Condition)</li>
          </ul>
          <h4>EIGRP Tables</h4>
          <ul>
            <li><strong>Neighbor Table</strong> – רשימת שכנים פעילים</li>
            <li><strong>Topology Table</strong> – כל הנתיבים שנשמעו</li>
            <li><strong>Routing Table</strong> – הנתיבים הטובים ביותר</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "spanning-tree",
    name: "STP / RSTP",
    fullName: "Spanning Tree Protocol",
    icon: "🌳",
    color: "#fbbc04",
    description: "מניעת לולאות ב-Layer 2 עם חישוב עץ פורשׂ",
    tags: ["Layer 2", "IEEE 802.1D", "802.1W", "Loop Prevention"],
    subtopics: [
      {
        title: "יסודות STP",
        content: `
          <h4>מדוע STP?</h4>
          <p>ברשתות עם Redundancy ב-Layer 2, ייווצרו לולאות שיגרמו ל-Broadcast Storm, MAC Table Instability, ו-Multiple Frame Delivery.</p>
          <p>STP מונע לולאות על ידי חסימת פורטים מסוימים ויצירת עץ פורשׂ (Spanning Tree) ללא לולאות.</p>
          <h4>STP Election Process</h4>
          <ul>
            <li>1. <strong>Root Bridge Election</strong> – הסוויץ' עם ה-Bridge ID הנמוך ביותר (Priority + MAC)</li>
            <li>2. <strong>Root Port</strong> – הפורט הקרוב ביותר ל-Root Bridge בכל סוויץ' (לא Root)</li>
            <li>3. <strong>Designated Port</strong> – הפורט הטוב ביותר בכל Segment</li>
            <li>4. שאר הפורטים עוברים ל-<strong>Blocking</strong></li>
          </ul>
          <div class="code-block">! Set bridge priority (must be multiple of 4096)
spanning-tree vlan 10 priority 4096   ! Become Root
spanning-tree vlan 10 priority 8192   ! Secondary Root

! Or use macro:
spanning-tree vlan 10 root primary
spanning-tree vlan 10 root secondary</div>
        `
      },
      {
        title: "STP Port States & RSTP",
        content: `
          <h4>STP Port States (802.1D)</h4>
          <ul>
            <li><strong>Blocking</strong> (20 שניות Max Age) – לא לומד, לא מעביר</li>
            <li><strong>Listening</strong> (15 שניות) – לא לומד, לא מעביר</li>
            <li><strong>Learning</strong> (15 שניות) – לומד MAC, לא מעביר</li>
            <li><strong>Forwarding</strong> – לומד ומעביר</li>
            <li><strong>Disabled</strong> – כבוי</li>
          </ul>
          <p>זמן כולל ל-Convergence: עד 50 שניות!</p>
          <h4>RSTP (802.1W)</h4>
          <p>RSTP מאיץ את ה-Convergence ל-1-2 שניות:</p>
          <ul>
            <li><strong>Discarding</strong> – מחליף Blocking+Listening</li>
            <li><strong>Learning</strong></li>
            <li><strong>Forwarding</strong></li>
          </ul>
          <p>RSTP Port Roles: Root, Designated, Alternate (גיבוי ל-Root Port), Backup (גיבוי ל-Designated)</p>
          <h4>PortFast & BPDU Guard</h4>
          <div class="code-block">interface Gi0/1
 spanning-tree portfast          ! Skip Listening/Learning
 spanning-tree bpduguard enable  ! Shutdown if BPDU received</div>
        `
      },
      {
        title: "PVST+ & MST",
        content: `
          <h4>PVST+</h4>
          <p>Cisco's Per-VLAN Spanning Tree – STP instance נפרד לכל VLAN. מאפשר Load Balancing על ידי הגדרת Root Bridges שונים לכל VLAN.</p>
          <h4>MST (802.1s)</h4>
          <p>Multiple Spanning Tree – מאגד VLANs למקרים (Instances) של STP, מצמצם overhead:</p>
          <div class="code-block">spanning-tree mode mst
!
spanning-tree mst configuration
 name CCNP-LAB
 revision 1
 instance 1 vlan 1-100
 instance 2 vlan 101-200
!
spanning-tree mst 1 priority 4096
spanning-tree mst 2 priority 8192</div>
          <div class="warning-box">⚠️ בבחינות CCNP: MST Instances שונות עם אותו שם ו-Revision אינן חייבות לחלוק את אותה תצורה אם VLANs שונים!</div>
        `
      }
    ]
  },
  {
    id: "vlan",
    name: "VLANs & Trunking",
    fullName: "Virtual LANs",
    icon: "🔀",
    color: "#9c27b0",
    description: "הפרדה לוגית של רשתות על תשתית פיזית משותפת",
    tags: ["Layer 2", "802.1Q", "VTP", "DTP"],
    subtopics: [
      {
        title: "VLANs בסיסי",
        content: `
          <h4>מהו VLAN?</h4>
          <p>VLAN (Virtual LAN) מאפשר הפרדה לוגית של רשתות ב-Layer 2, ללא צורך בחומרה נפרדת. תנועה בין VLANs דורשת Layer 3 routing.</p>
          <h4>VLAN Ranges</h4>
          <ul>
            <li>VLAN 1 – Default, לא ניתן למחוק</li>
            <li>VLANs 2-1001 – Normal Range</li>
            <li>VLANs 1002-1005 – Token Ring/FDDI legacy</li>
            <li>VLANs 1006-4094 – Extended Range (דורש VTP Transparent/Off)</li>
          </ul>
          <div class="code-block">! Create VLAN and assign ports
vlan 10
 name SALES
!
interface Gi0/1
 switchport mode access
 switchport access vlan 10</div>
        `
      },
      {
        title: "Trunking & 802.1Q",
        content: `
          <h4>Trunk Ports</h4>
          <p>Trunk Ports נושאים תנועה מ-VLANs מרובים. 802.1Q מוסיף Tag של 4 bytes לכל Frame.</p>
          <p><strong>Native VLAN</strong> – ה-VLAN שתנועתו לא מתויגת על ה-Trunk (ברירת מחדל: VLAN 1)</p>
          <div class="code-block">interface Gi0/1
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30</div>
          <h4>DTP (Dynamic Trunking Protocol)</h4>
          <ul>
            <li><strong>dynamic auto</strong> – יהפוך ל-Trunk רק אם השני רוצה (פסיבי)</li>
            <li><strong>dynamic desirable</strong> – מנסה להפוך ל-Trunk (אקטיבי)</li>
            <li><strong>trunk</strong> – תמיד Trunk</li>
            <li><strong>access</strong> – תמיד Access</li>
            <li><strong>nonegotiate</strong> – מכבה DTP</li>
          </ul>
          <div class="info-box">💡 מומלץ לכבות DTP על פורטי End-Device ולהגדיר Mode ידנית: switchport nonegotiate</div>
        `
      },
      {
        title: "VTP",
        content: `
          <h4>VTP (VLAN Trunking Protocol)</h4>
          <p>VTP מסנכרן VLAN database בין סוויץ'ים. שלושה מצבים:</p>
          <ul>
            <li><strong>Server</strong> – יוצר, מוחק ומשנה VLANs, מפרסם שינויים</li>
            <li><strong>Client</strong> – מקבל ומעביר עדכונים, לא יכול לשנות</li>
            <li><strong>Transparent</strong> – לא משתתף, מעביר VTP messages, VLANs מקומיים בלבד</li>
          </ul>
          <div class="warning-box">⚠️ סכנת VTP: חיבור סוויץ' עם Revision Number גבוה יכול למחוק את כל ה-VLANs בדומיין! תמיד אפס Revision לפני חיבור סוויץ' חדש, או השתמש ב-VTP Mode Off.</div>
          <div class="code-block">vtp version 2
vtp domain CCNP-DOMAIN
vtp mode server
vtp password Cisco123</div>
        `
      }
    ]
  },
  {
    id: "qos",
    name: "QoS",
    fullName: "Quality of Service",
    icon: "📶",
    color: "#ff5722",
    description: "ניהול עדיפויות תעבורה בתנאי עומס ורשת עמוסה",
    tags: ["Layer 2-3", "DiffServ", "IntServ", "Traffic Shaping"],
    subtopics: [
      {
        title: "יסודות QoS",
        content: `
          <h4>למה QoS?</h4>
          <p>ברשתות עם עומס, QoS מבטיח שתנועה קריטית (קול, וידאו) תקבל עדיפות על פני תנועה פחות חשובה.</p>
          <h4>QoS Models</h4>
          <ul>
            <li><strong>Best Effort</strong> – ללא QoS, כולם שווים</li>
            <li><strong>IntServ</strong> – Integrated Services, RSVP, הקצאה לכל Flow (לא masclable)</li>
            <li><strong>DiffServ</strong> – Differentiated Services, תיוג Classes, masclable</li>
          </ul>
          <h4>QoS Characteristics</h4>
          <ul>
            <li><strong>Bandwidth</strong> – רוחב הפס המינימלי המובטח</li>
            <li><strong>Delay</strong> – זמן העברה (Propagation + Processing + Queuing)</li>
            <li><strong>Jitter</strong> – שונות ב-Delay (בעייתי לקול)</li>
            <li><strong>Packet Loss</strong> – אחוז אבדן חבילות</li>
          </ul>
        `
      },
      {
        title: "Marking & Classification",
        content: `
          <h4>DSCP (Differentiated Services Code Point)</h4>
          <p>6 ביטים ב-IP Header. ערכים חשובים:</p>
          <ul>
            <li><strong>CS0</strong> (0) – Best Effort</li>
            <li><strong>CS1-CS7</strong> – Class Selectors</li>
            <li><strong>AF11-AF43</strong> – Assured Forwarding (12 ערכים)</li>
            <li><strong>EF (46)</strong> – Expedited Forwarding, לקול</li>
          </ul>
          <h4>CoS (802.1Q)</h4>
          <p>3 ביטים ב-802.1Q Header – לשימוש ב-Layer 2 בלבד</p>
          <div class="code-block">! MQC - Modular QoS CLI
class-map match-all VOICE-TRAFFIC
 match dscp ef
!
policy-map QOS-POLICY
 class VOICE-TRAFFIC
  priority 1000    ! LLQ - Low Latency Queuing
 class class-default
  fair-queue
!
interface Gi0/0
 service-policy output QOS-POLICY</div>
        `
      }
    ]
  },
  {
    id: "mpls",
    name: "MPLS",
    fullName: "Multiprotocol Label Switching",
    icon: "🏷️",
    color: "#00bcd4",
    description: "העברת חבילות לפי תוויות במקום IP Lookup",
    tags: ["Layer 2.5", "VPN", "Traffic Engineering", "LDP"],
    subtopics: [
      {
        title: "יסודות MPLS",
        content: `
          <h4>מהו MPLS?</h4>
          <p>MPLS מוסיף תווית (Label) של 4 bytes בין ה-Layer 2 ו-Layer 3 headers. הראוטרים מחליטים על הנתיב לפי ה-Label בלבד – ללא IP Lookup.</p>
          <h4>מושגי בסיס</h4>
          <ul>
            <li><strong>LSP (Label Switched Path)</strong> – הנתיב שחבילה עוברת</li>
            <li><strong>LER (Label Edge Router)</strong> – ראוטר קצה, מוסיף/מסיר Labels</li>
            <li><strong>LSR (Label Switch Router)</strong> – ראוטר אמצעי, מחליף Labels</li>
            <li><strong>FEC (Forwarding Equivalence Class)</strong> – קבוצת חבילות עם Label זהה</li>
          </ul>
          <h4>Label Structure</h4>
          <ul>
            <li>Label (20 bit) – ערך התווית</li>
            <li>CoS/EXP (3 bit) – QoS bits</li>
            <li>S (1 bit) – Bottom of Stack</li>
            <li>TTL (8 bit) – Time to Live</li>
          </ul>
          <div class="code-block">! Enable MPLS on interface
interface Gi0/0
 mpls ip
!
! LDP configuration
mpls ldp router-id Loopback0 force</div>
        `
      },
      {
        title: "MPLS L3 VPN",
        content: `
          <h4>MPLS L3 VPN Architecture</h4>
          <ul>
            <li><strong>PE (Provider Edge)</strong> – ראוטר ספק בקצה, מחובר ל-CE</li>
            <li><strong>P (Provider)</strong> – ראוטר ספק באמצע, לא מודע ל-VPN</li>
            <li><strong>CE (Customer Edge)</strong> – ראוטר לקוח, לא מודע ל-MPLS</li>
          </ul>
          <h4>VRF (Virtual Routing and Forwarding)</h4>
          <p>הפרדה לוגית של טבלאות ניתוב לכל לקוח על אותו ראוטר PE.</p>
          <div class="code-block">! Create VRF
ip vrf CUSTOMER-A
 rd 65001:100
 route-target export 65001:100
 route-target import 65001:100
!
interface Gi0/1
 ip vrf forwarding CUSTOMER-A
 ip address 10.1.1.1 255.255.255.0
!
! MP-BGP for VPN routes
router bgp 65001
 address-family vpnv4
  neighbor 10.0.0.2 activate
  neighbor 10.0.0.2 send-community both</div>
        `
      }
    ]
  },
  {
    id: "security",
    name: "Network Security",
    fullName: "אבטחת רשתות",
    icon: "🔒",
    color: "#607d8b",
    description: "הגנת רשתות: ACL, AAA, 802.1X, ו-Firewalls",
    tags: ["ACL", "AAA", "802.1X", "CoPP"],
    subtopics: [
      {
        title: "ACLs מתקדמות",
        content: `
          <h4>סוגי ACL</h4>
          <ul>
            <li><strong>Standard ACL</strong> (1-99, 1300-1999) – סינון לפי Source IP בלבד. מיקום: קרוב ל-Destination</li>
            <li><strong>Extended ACL</strong> (100-199, 2000-2699) – Src/Dst IP, Protocol, Port. מיקום: קרוב ל-Source</li>
            <li><strong>Named ACL</strong> – שם במקום מספר, ניתן לערוך שורות</li>
          </ul>
          <div class="code-block">! Extended Named ACL
ip access-list extended BLOCK-TELNET
 deny tcp any any eq 23 log
 permit ip any any
!
interface Gi0/0
 ip access-group BLOCK-TELNET in</div>
          <h4>ACL Best Practices</h4>
          <ul>
            <li>Implicit Deny בסוף כל ACL</li>
            <li>הכנס שורות ספציפיות לפני כלליות</li>
            <li>השתמש ב-log keyword לבדיקה</li>
          </ul>
        `
      },
      {
        title: "AAA & 802.1X",
        content: `
          <h4>AAA</h4>
          <ul>
            <li><strong>Authentication</strong> – מי אתה?</li>
            <li><strong>Authorization</strong> – מה מותר לך?</li>
            <li><strong>Accounting</strong> – מה עשית?</li>
          </ul>
          <h4>RADIUS vs TACACS+</h4>
          <ul>
            <li>RADIUS – UDP 1812/1813, מוצפן Password בלבד, מתאים ל-Network Access</li>
            <li>TACACS+ – TCP 49, מוצפן כל ה-Packet, מתאים ל-Device Administration</li>
          </ul>
          <div class="code-block">aaa new-model
aaa authentication login default group radius local
aaa authorization exec default group radius local
!
radius server RADIUS-SRV
 address ipv4 192.168.1.100 auth-port 1812 acct-port 1813
 key Cisco123</div>
          <h4>802.1X</h4>
          <p>Port-Based Network Access Control. ה-Supplicant (PC) מתחבר ל-Authenticator (Switch) שמדבר עם Authentication Server (RADIUS).</p>
          <div class="code-block">interface Gi0/1
 authentication port-control auto
 dot1x pae authenticator</div>
        `
      }
    ]
  },
  {
    id: "ipv6",
    name: "IPv6",
    fullName: "Internet Protocol Version 6",
    icon: "🔢",
    color: "#3f51b5",
    description: "פרוטוקול הדור הבא עם כתובות 128-bit",
    tags: ["Layer 3", "128-bit", "NDP", "SLAAC"],
    subtopics: [
      {
        title: "יסודות IPv6",
        content: `
          <h4>מבנה כתובת IPv6</h4>
          <p>128 ביטים, מוצגים כ-8 קבוצות של 16 ביט בhex: 2001:0db8:85a3:0000:0000:8a2e:0370:7334</p>
          <p>כללי קיצור: 1) הסר Leading Zeros. 2) :: פעם אחת למחרוזת של אפסים.</p>
          <h4>סוגי כתובות IPv6</h4>
          <ul>
            <li><strong>Global Unicast</strong> – 2000::/3 – כתובות ניתנות לניתוב באינטרנט</li>
            <li><strong>Link-Local</strong> – FE80::/10 – לתקשורת Local מבלי Router</li>
            <li><strong>Loopback</strong> – ::1/128</li>
            <li><strong>Multicast</strong> – FF00::/8</li>
            <li><strong>Unique Local</strong> – FC00::/7 – כמו RFC1918 ב-IPv4</li>
          </ul>
          <h4>NDP (Neighbor Discovery Protocol)</h4>
          <p>מחליף את ARP ב-IPv6. ICMPv6 Messages:</p>
          <ul>
            <li>RS/RA (Router Solicitation/Advertisement) – גילוי Routers</li>
            <li>NS/NA (Neighbor Solicitation/Advertisement) – כמו ARP Request/Reply</li>
          </ul>
          <div class="code-block">interface Gi0/0
 ipv6 address 2001:db8:1::1/64
 ipv6 address FE80::1 link-local
 ipv6 enable</div>
        `
      },
      {
        title: "IPv6 Address Assignment",
        content: `
          <h4>SLAAC (Stateless Address Autoconfiguration)</h4>
          <p>המכשיר מגדיר לעצמו כתובת IPv6 ללא DHCP:</p>
          <ul>
            <li>מקבל Prefix מ-RA (Router Advertisement)</li>
            <li>מייצר Interface ID מה-MAC Address (EUI-64) או רנדומלי</li>
          </ul>
          <h4>DHCPv6</h4>
          <ul>
            <li><strong>Stateful DHCPv6</strong> – כמו DHCPv4, מקצה כתובת ופרמטרים</li>
            <li><strong>Stateless DHCPv6</strong> – המכשיר קובע כתובת ב-SLAAC, DHCPv6 נותן DNS וכו'</li>
          </ul>
          <div class="code-block">! DHCPv6 Pool
ipv6 dhcp pool IPV6-POOL
 dns-server 2001:4860:4860::8888
 domain-name example.com
!
interface Gi0/0
 ipv6 dhcp server IPV6-POOL</div>
          <div class="info-box">💡 M-flag (Managed) ב-RA = השתמש ב-Stateful DHCPv6. O-flag (Other) = השתמש ב-Stateless DHCPv6 לפרמטרים בלבד.</div>
        `
      }
    ]
  }
];

// Calculate total subtopics for stats
const TOTAL_SUBTOPICS = TOPICS.reduce((sum, t) => sum + t.subtopics.length, 0);
