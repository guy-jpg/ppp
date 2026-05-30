// ===== CCNP Quiz Questions =====
const QUESTIONS = [
  // ===== OSPF =====
  {
    id: 1, topic: "ospf", topicName: "OSPF",
    question: "מהו ה-Administrative Distance של OSPF?",
    answers: ["90", "100", "110", "120"],
    correct: 2,
    explanation: "OSPF משתמש ב-AD של 110. להשוואה: EIGRP Internal = 90, RIP = 120, iBGP = 200."
  },
  {
    id: 2, topic: "ospf", topicName: "OSPF",
    question: "מהו ה-Multicast Address שבו OSPF DR/BDR שולחים עדכונים?",
    answers: ["224.0.0.5", "224.0.0.6", "224.0.0.9", "224.0.0.10"],
    correct: 1,
    explanation: "DR ו-BDR שולחים עדכונים ל-224.0.0.6 (AllDRouters). כל ראוטרי OSPF מקשיבים ל-224.0.0.5 (AllSPFRouters)."
  },
  {
    id: 3, topic: "ospf", topicName: "OSPF",
    question: "באיזה מצב שכנות OSPF מתבצעת בחירת DR/BDR?",
    answers: ["ExStart", "Exchange", "2-Way", "Loading"],
    correct: 2,
    explanation: "בחירת DR/BDR מתבצעת כאשר שני ראוטרים מגיעים למצב 2-Way, לפני המעבר ל-ExStart."
  },
  {
    id: 4, topic: "ospf", topicName: "OSPF",
    question: "איזה סוג LSA מייצר ABR ב-OSPF Multi-Area?",
    answers: ["Type 1 - Router LSA", "Type 2 - Network LSA", "Type 3 - Summary LSA", "Type 5 - External LSA"],
    correct: 2,
    explanation: "ABR (Area Border Router) מייצר Type 3 Summary LSA כדי לפרסם routes בין אזורים שונים."
  },
  {
    id: 5, topic: "ospf", topicName: "OSPF",
    question: "מה הוא ה-Hello Interval ברירת המחדל ב-OSPF על Broadcast network?",
    answers: ["5 שניות", "10 שניות", "30 שניות", "60 שניות"],
    correct: 1,
    explanation: "ב-Broadcast/Point-to-Point: Hello = 10 שניות, Dead = 40 שניות. ב-NBMA: Hello = 30 שניות, Dead = 120 שניות."
  },
  {
    id: 6, topic: "ospf", topicName: "OSPF",
    question: "מה ה-Feasibility Condition ב-OSPF לבחירת Totally Stubby Area?",
    answers: ["האזור חוסם Type 3 ו-Type 5 LSA", "האזור חוסם Type 5 LSA בלבד", "האזור חוסם Type 1 LSA", "האזור לא חוסם שום LSA"],
    correct: 0,
    explanation: "Totally Stubby Area חוסמת הן Type 3 (Summary) והן Type 5 (External) LSAs. ה-ABR שולח Default Route אחד (0.0.0.0/0)."
  },
  {
    id: 7, topic: "ospf", topicName: "OSPF",
    question: "על פי ברירת מחדל, מה הוא ה-OSPF Cost עבור FastEthernet (100 Mbps)?",
    answers: ["1", "10", "100", "1000"],
    correct: 0,
    explanation: "Cost = 10^8 / 10^8 = 1. Reference Bandwidth ברירת מחדל הוא 100 Mbps. לכן גם Gigabit Ethernet יקבל Cost=1 ללא שינוי!"
  },
  {
    id: 8, topic: "ospf", topicName: "OSPF",
    question: "מה ה-OSPF Router ID אם יש Loopback0 עם 1.1.1.1, Gi0/0 עם 192.168.1.1, ו-router-id מוגדר ל-10.10.10.10?",
    answers: ["1.1.1.1", "192.168.1.1", "10.10.10.10", "0.0.0.0"],
    correct: 2,
    explanation: "עדיפות: 1) router-id מוגדר ידנית (10.10.10.10) 2) Loopback הגבוה ביותר 3) Interface IP הגבוה ביותר. ה-router-id המוגדר ידנית תמיד ינצח."
  },

  // ===== BGP =====
  {
    id: 9, topic: "bgp", topicName: "BGP",
    question: "מהו ה-Administrative Distance של eBGP?",
    answers: ["20", "90", "110", "200"],
    correct: 0,
    explanation: "eBGP AD = 20, iBGP AD = 200. לכן eBGP routes יועדפו על פני OSPF (110) ו-EIGRP (90)."
  },
  {
    id: 10, topic: "bgp", topicName: "BGP",
    question: "מהו ה-BGP Attribute הראשון שנבדק בתהליך Path Selection?",
    answers: ["Local Preference", "AS Path Length", "Weight", "MED"],
    correct: 2,
    explanation: "Weight הוא Cisco proprietary attribute ונבדק ראשון. הוא Local לראוטר ואינו מועבר לשכנים. ברירת מחדל: 0, גבוה יותר = עדיף."
  },
  {
    id: 11, topic: "bgp", topicName: "BGP",
    question: "מהו הפרוטוקול שבו BGP משתמש לתקשורת?",
    answers: ["UDP Port 179", "TCP Port 179", "UDP Port 520", "TCP Port 389"],
    correct: 1,
    explanation: "BGP משתמש ב-TCP Port 179 לכל תקשורת. TCP מספק אמינות ומנגנון Flow Control."
  },
  {
    id: 12, topic: "bgp", topicName: "BGP",
    question: "מה תפקיד ה-Route Reflector ב-iBGP?",
    answers: ["מסנן routes לפי policy", "מחליף את ה-Full Mesh ב-iBGP", "מתרגם AS Numbers", "מבצע Load Balancing"],
    correct: 1,
    explanation: "Route Reflector מאפשר ל-iBGP לעבוד ללא Full Mesh. ה-RR מקבל routes מ-Clients ומפרסם אותם לכל שאר ה-Clients, חוסך n*(n-1)/2 sessions."
  },
  {
    id: 13, topic: "bgp", topicName: "BGP",
    question: "מה Community no-export עושה ב-BGP?",
    answers: ["מונע הפצת ה-route לכל שכן", "מונע הפצת ה-route לשכני eBGP", "מוחק את ה-route", "מגביל את ה-route ל-Local AS בלבד"],
    correct: 1,
    explanation: "no-export (0xFFFFFF01) מונע מהראוטר לפרסם את ה-route לשכני eBGP. ה-route עדיין מופץ בין שכני iBGP."
  },
  {
    id: 14, topic: "bgp", topicName: "BGP",
    question: "מה קורה ל-TTL כאשר eBGP שולח packet לשכן?",
    answers: ["TTL=255", "TTL=128", "TTL=64", "TTL=1"],
    correct: 3,
    explanation: "eBGP sessions מוגדרים כברירת מחדל עם TTL=1, כלומר שכני eBGP חייבים להיות directly connected. ניתן לשנות עם 'neighbor x.x.x.x ebgp-multihop'."
  },

  // ===== EIGRP =====
  {
    id: 15, topic: "eigrp", topicName: "EIGRP",
    question: "מה הוא ה-Administrative Distance של EIGRP Internal?",
    answers: ["90", "100", "110", "170"],
    correct: 0,
    explanation: "EIGRP Internal = 90, EIGRP External = 170. ה-AD 90 הוא הנמוך ביותר בין IGPs והוא מתחת ל-OSPF (110) ו-RIP (120)."
  },
  {
    id: 16, topic: "eigrp", topicName: "EIGRP",
    question: "מהי Feasibility Condition ב-EIGRP?",
    answers: [
      "Reported Distance > Feasible Distance",
      "Reported Distance < Feasible Distance",
      "Reported Distance = Feasible Distance",
      "Reported Distance > 0"
    ],
    correct: 1,
    explanation: "Feasibility Condition: RD (Reported Distance) של ה-Feasible Successor חייב להיות קטן מה-FD (Feasible Distance) של ה-Successor הנוכחי. זה מבטיח Loop-Free path."
  },
  {
    id: 17, topic: "eigrp", topicName: "EIGRP",
    question: "מה EIGRP שולח כ-Multicast Address?",
    answers: ["224.0.0.5", "224.0.0.6", "224.0.0.9", "224.0.0.10"],
    correct: 3,
    explanation: "EIGRP משתמש ב-224.0.0.10 לשליחת Hello Packets ועדכוני ניתוב. OSPF משתמש ב-224.0.0.5/6, RIP ב-224.0.0.9."
  },

  // ===== STP =====
  {
    id: 18, topic: "spanning-tree", topicName: "STP",
    question: "כמה זמן לוקח Convergence ב-STP (802.1D) במצב רגיל?",
    answers: ["5 שניות", "15 שניות", "30 שניות", "50 שניות"],
    correct: 3,
    explanation: "STP Convergence: Max Age (20s) + Listening (15s) + Learning (15s) = 50 שניות. RSTP מצמצם זאת ל-1-2 שניות."
  },
  {
    id: 19, topic: "spanning-tree", topicName: "STP",
    question: "איזה STP Port Role הוא הגיבוי ל-Root Port ב-RSTP?",
    answers: ["Backup Port", "Alternate Port", "Disabled Port", "Designated Port"],
    correct: 1,
    explanation: "ב-RSTP: Alternate Port הוא הגיבוי ל-Root Port (חסום, אבל מוכן לפעולה מיידית). Backup Port הוא גיבוי ל-Designated Port."
  },
  {
    id: 20, topic: "spanning-tree", topicName: "STP",
    question: "מה Priority ברירת המחדל של STP Bridge?",
    answers: ["1", "4096", "32768", "65535"],
    correct: 2,
    explanation: "STP Bridge Priority ברירת מחדל = 32768. Priority חייב להיות מכפלה של 4096. לבחירה כ-Root Bridge הגדר Priority נמוך יותר."
  },
  {
    id: 21, topic: "spanning-tree", topicName: "STP",
    question: "מה PortFast עושה?",
    answers: [
      "מאיץ את STP Convergence בכל הפורטים",
      "מאפשר לפורט לעבור ישירות ל-Forwarding ללא Listening/Learning",
      "חוסם BPDU Packets",
      "מגדיר את הפורט כ-Root Port"
    ],
    correct: 1,
    explanation: "PortFast מאפשר לפורט Access (המחובר ל-End Device) לעבור ישירות למצב Forwarding, תוך עקיפת Listening ו-Learning States (חוסך 30 שניות)."
  },

  // ===== VLAN =====
  {
    id: 22, topic: "vlan", topicName: "VLANs",
    question: "מה הוא ה-Native VLAN ברירת המחדל ב-Cisco Switches?",
    answers: ["VLAN 0", "VLAN 1", "VLAN 99", "VLAN 4094"],
    correct: 1,
    explanation: "Native VLAN ברירת המחדל הוא VLAN 1. תנועת Native VLAN עוברת ללא 802.1Q Tag. מומלץ לשנות ל-VLAN שאינו בשימוש."
  },
  {
    id: 23, topic: "vlan", topicName: "VLANs",
    question: "מה קורה כאשר VTP Client מקבל VTP Advertisement עם Revision Number גבוה יותר?",
    answers: [
      "מתעלם מה-Advertisement",
      "שולח Request לקבלת המידע החדש",
      "מעדכן את ה-VLAN Database שלו לפי ה-Advertisement",
      "נכנס ל-VTP Transparent Mode"
    ],
    correct: 2,
    explanation: "VTP Client מעדכן את ה-VLAN Database שלו כאשר הוא מקבל Advertisement עם Revision Number גבוה יותר. זה מסוכן – סוויץ' חדש עם Revision גבוה יכול למחוק כל ה-VLANs!"
  },
  {
    id: 24, topic: "vlan", topicName: "VLANs",
    question: "מה ה-DTP Mode שגורם לפורט לנסות להפוך ל-Trunk באופן אקטיבי?",
    answers: ["dynamic auto", "dynamic desirable", "trunk", "access"],
    correct: 1,
    explanation: "'dynamic desirable' שולח DTP Frames ומנסה לנהל משא ומתן להפיכה ל-Trunk. 'dynamic auto' פסיבי – יהפוך ל-Trunk רק אם הצד השני ביקש."
  },

  // ===== QoS =====
  {
    id: 25, topic: "qos", topicName: "QoS",
    question: "מה הוא DSCP EF (Expedited Forwarding)?",
    answers: ["DSCP 0", "DSCP 10", "DSCP 32", "DSCP 46"],
    correct: 3,
    explanation: "DSCP EF = 46 (101110 binary). משמש לתנועת Voice ו-Real-Time שדורשת עדיפות מקסימלית ו-Low Latency."
  },
  {
    id: 26, topic: "qos", topicName: "QoS",
    question: "מה ה-QoS Model שמשתמש ב-RSVP?",
    answers: ["Best Effort", "DiffServ", "IntServ", "MPLS QoS"],
    correct: 2,
    explanation: "IntServ (Integrated Services) משתמש ב-RSVP (Resource Reservation Protocol) להקצאת רוחב פס לכל Flow. הוא לא Scalable לרשתות גדולות."
  },
  {
    id: 27, topic: "qos", topicName: "QoS",
    question: "כמה ביטים ב-DSCP Field?",
    answers: ["3", "6", "8", "16"],
    correct: 1,
    explanation: "DSCP (Differentiated Services Code Point) הוא 6 ביטים (64 ערכים אפשריים) ב-IP Header. 2 הביטים הנמוכים של Byte ה-TOS/DSCP אינם חלק מ-DSCP."
  },

  // ===== MPLS =====
  {
    id: 28, topic: "mpls", topicName: "MPLS",
    question: "כמה bytes גדולה MPLS Label?",
    answers: ["2 bytes", "4 bytes", "8 bytes", "16 bytes"],
    correct: 1,
    explanation: "MPLS Label הוא 4 bytes (32 ביטים): Label (20 bit) + CoS/EXP (3 bit) + S/Bottom of Stack (1 bit) + TTL (8 bit)."
  },
  {
    id: 29, topic: "mpls", topicName: "MPLS",
    question: "מה ה-Protocol שבו MPLS משתמש לחלוקת Labels?",
    answers: ["OSPF", "BGP", "LDP", "RSVP"],
    correct: 2,
    explanation: "LDP (Label Distribution Protocol) הוא הפרוטוקול הסטנדרטי לחלוקת Labels ב-MPLS. RSVP-TE משמש ל-Traffic Engineering."
  },
  {
    id: 30, topic: "mpls", topicName: "MPLS",
    question: "מה תפקיד ה-VRF ב-MPLS L3 VPN?",
    answers: [
      "הצפנת התנועה בין Sites",
      "הפרדת טבלאות ניתוב לכל לקוח",
      "ביצוע NAT לכתובות פרטיות",
      "ניהול Labels בין PEs"
    ],
    correct: 1,
    explanation: "VRF (Virtual Routing and Forwarding) יוצר טבלאות ניתוב נפרדות לכל לקוח על אותו PE Router, מאפשר overlap ב-IP Addresses ו-isolation מלא."
  },

  // ===== Security =====
  {
    id: 31, topic: "security", topicName: "Security",
    question: "מה ה-Port של TACACS+?",
    answers: ["UDP 1812", "UDP 1813", "TCP 49", "TCP 389"],
    correct: 2,
    explanation: "TACACS+ משתמש ב-TCP Port 49 ומצפין את כל ה-Packet. RADIUS משתמש ב-UDP 1812 (Authentication) ו-1813 (Accounting) ומצפין רק ה-Password."
  },
  {
    id: 32, topic: "security", topicName: "Security",
    question: "היכן כדאי למקם Standard ACL?",
    answers: ["קרוב ל-Source", "קרוב ל-Destination", "בדיוק באמצע", "על כל הממשקים"],
    correct: 1,
    explanation: "Standard ACL מסנן לפי Source IP בלבד. יש למקם אותו קרוב ל-Destination כדי לא לחסום תנועה לגיטימית לנקודות אחרות. Extended ACL – קרוב ל-Source."
  },
  {
    id: 33, topic: "security", topicName: "Security",
    question: "מה 802.1X Supplicant?",
    answers: [
      "ה-Switch שמבצע Authentication",
      "ה-RADIUS Server",
      "ה-Client/Device שמנסה להתחבר",
      "ה-Gateway Router"
    ],
    correct: 2,
    explanation: "ב-802.1X: Supplicant = Client/Device, Authenticator = Switch, Authentication Server = RADIUS. ה-Supplicant שולח Credentials ל-Authenticator שמעביר ל-RADIUS Server."
  },

  // ===== IPv6 =====
  {
    id: 34, topic: "ipv6", topicName: "IPv6",
    question: "מה הוא IPv6 Link-Local Prefix?",
    answers: ["FC00::/7", "FE80::/10", "FF00::/8", "2000::/3"],
    correct: 1,
    explanation: "Link-Local addresses מתחילים ב-FE80::/10. הן נוצרות אוטומטית ותקפות רק בתוך ה-Link המקומי. לא ניתן לנתב אותן."
  },
  {
    id: 35, topic: "ipv6", topicName: "IPv6",
    question: "מה מחליף ARP ב-IPv6?",
    answers: ["DHCP", "ICMPv6 NDP", "BGP", "OSPF"],
    correct: 1,
    explanation: "NDP (Neighbor Discovery Protocol) מחליף את ARP ב-IPv6, משתמש ב-ICMPv6 Neighbor Solicitation/Advertisement Messages ב-Multicast."
  },
  {
    id: 36, topic: "ipv6", topicName: "IPv6",
    question: "מה הוא SLAAC?",
    answers: [
      "Stateful Address Configuration עם DHCP",
      "Stateless Address Autoconfiguration",
      "Static Address Assignment",
      "Secure Link-Layer Authentication"
    ],
    correct: 1,
    explanation: "SLAAC (Stateless Address Autoconfiguration) מאפשר למכשיר לקבוע כתובת IPv6 עצמאית: Prefix מ-Router Advertisement + Interface ID מ-MAC Address (EUI-64)."
  },
  {
    id: 37, topic: "ipv6", topicName: "IPv6",
    question: "כמה ביטים בכתובת IPv6?",
    answers: ["32", "64", "128", "256"],
    correct: 2,
    explanation: "IPv6 כתובת = 128 ביטים (לעומת 32 ביטים ב-IPv4). זה מספק 2^128 כתובות אפשריות = ~340 undecillion כתובות."
  },

  // ===== Mixed Advanced =====
  {
    id: 38, topic: "ospf", topicName: "OSPF",
    question: "מה ה-LSA Type שנוצר ב-NSSA על ידי ה-ASBR?",
    answers: ["Type 5", "Type 7", "Type 3", "Type 4"],
    correct: 1,
    explanation: "ב-NSSA, ה-ASBR מייצר Type 7 LSA (NSSA External LSA) במקום Type 5. ה-ABR ממיר Type 7 ל-Type 5 כאשר מפרסם מחוץ ל-NSSA."
  },
  {
    id: 39, topic: "bgp", topicName: "BGP",
    question: "מה ה-BGP Attribute שמשמש להשפעה על ניתוב Inbound מ-AS אחר?",
    answers: ["Local Preference", "Weight", "MED", "AS Path Prepending"],
    correct: 3,
    explanation: "AS Path Prepending מוסיף את ה-AS שלך מספר פעמים ל-AS Path, גורם ל-AS האחר לראות נתיב ארוך יותר ולבחור את הנתיב האחר. MED גם משפיע על Inbound אבל רק כאשר יש מספר Links לאותו AS."
  },
  {
    id: 40, topic: "spanning-tree", topicName: "STP",
    question: "מה BPDU Guard עושה כאשר מקבל BPDU על פורט PortFast?",
    answers: [
      "שולח BPDU חזרה",
      "מבטל PortFast ועובר לנהל STP רגיל",
      "מכניס את הפורט ל-err-disabled",
      "מתעלם מה-BPDU"
    ],
    correct: 2,
    explanation: "BPDU Guard מכניס את הפורט ל-err-disabled state כאשר מקבל BPDU. זה מונע התחברות Switch זדוני לפורט שאמור להיות מחובר ל-End Device."
  }
];

// Group questions by topic
const QUESTIONS_BY_TOPIC = QUESTIONS.reduce((acc, q) => {
  if (!acc[q.topic]) acc[q.topic] = [];
  acc[q.topic].push(q);
  return acc;
}, {});
