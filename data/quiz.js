// CCNP Quiz Questions - Hebrew
// Each question: id, topicId (links to topic), category, q, options[], correct (index), explain

window.CCNP_QUESTIONS = [
  // ---------- OSPF ----------
  {
    id: "q-ospf-1",
    topicId: "ospf-fundamentals",
    category: "routing",
    q: "באיזה מצב במכונת המצב של OSPF שני נתבים מחליפים DBD (Database Description)?",
    options: ["Init", "2-Way", "Exchange", "Full"],
    correct: 2,
    explain: "ב-Exchange נשלחים DBD בין השכנים אחרי מעבר ל-ExStart וקביעת Master/Slave."
  },
  {
    id: "q-ospf-2",
    topicId: "ospf-fundamentals",
    category: "routing",
    q: "אילו סוגי LSA אסור שיופיעו ב-Stub Area רגיל?",
    options: ["Type 1, 2", "Type 3", "Type 4 ו-Type 5", "Type 7"],
    correct: 2,
    explain: "Stub חוסם External (Type 5) ולכן גם את ה-ASBR Summary (Type 4)."
  },
  {
    id: "q-ospf-3",
    topicId: "ospf-fundamentals",
    category: "routing",
    q: "איזו פקודה תבטיח שנתב לעולם לא ייבחר כ-DR בסגמנט Broadcast?",
    options: [
      "ip ospf priority 255",
      "ip ospf priority 0",
      "ip ospf network point-to-point",
      "ip ospf passive-interface"
    ],
    correct: 1,
    explain: "Priority 0 פוסל את הנתב מהתחרות על DR/BDR."
  },
  {
    id: "q-ospf-4",
    topicId: "ospf-advanced",
    category: "routing",
    q: "היכן ניתן לבצע summarization ב-OSPF?",
    options: ["בכל נתב", "רק ב-ABR", "רק ב-ASBR", "ב-ABR ו-ASBR בלבד"],
    correct: 3,
    explain: "Inter-area ב-ABR (area range), חיצוני ב-ASBR (summary-address)."
  },
  {
    id: "q-ospf-5",
    topicId: "ospf-advanced",
    category: "routing",
    q: "מה היתרון העיקרי של BFD על פני Fast-Hello של OSPF?",
    options: [
      "צריך פחות זיכרון ב-control-plane",
      "מזהה כשל בזמן תת-שנייתי וללא תלות בפרוטוקול",
      "תמיד פועל עם MD5",
      "מאחד כמה פרוטוקולים לתהליך אחד"
    ],
    correct: 1,
    explain: "BFD מספק זיהוי תקלה מהיר מאוד ומשרת מספר פרוטוקולים במקביל."
  },

  // ---------- EIGRP ----------
  {
    id: "q-eigrp-1",
    topicId: "eigrp",
    category: "routing",
    q: "מה תנאי ה-Feasibility ב-EIGRP?",
    options: [
      "AD של השכן קטן מה-FD המקומי",
      "FD של השכן גדול מה-AD המקומי",
      "המטריקה של השכן זהה לזו של הנתב",
      "K-values זהים"
    ],
    correct: 0,
    explain: "Feasible Successor הוא שכן עם AD < FD הנוכחי — מה שמבטיח שאין דרכו לולאה."
  },
  {
    id: "q-eigrp-2",
    topicId: "eigrp",
    category: "routing",
    q: "מהי המשמעות של הגדרת נתב כ-Stub ב-EIGRP?",
    options: [
      "הנתב לא מפרסם כלל מסלולים",
      "הנתב לא מקבל Queries וגם לא יקבל מסלולי transit",
      "הנתב הופך ל-Route Reflector",
      "הנתב משדר רק redistribution מ-OSPF"
    ],
    correct: 1,
    explain: "Stub מצמצם Queries וקובע אילו מסלולים הנתב מוכן להעביר (לרוב connected+summary)."
  },
  {
    id: "q-eigrp-3",
    topicId: "eigrp",
    category: "routing",
    q: "מהו ה-AD של מסלול EIGRP חיצוני (External)?",
    options: ["90", "110", "120", "170"],
    correct: 3,
    explain: "Internal EIGRP = 90, External EIGRP = 170."
  },

  // ---------- BGP ----------
  {
    id: "q-bgp-1",
    topicId: "bgp-fundamentals",
    category: "routing",
    q: "מהו ה-Path Attribute הראשון שנבחן בבחירת מסלול BGP?",
    options: ["Local Preference", "AS_PATH", "Weight", "MED"],
    correct: 2,
    explain: "Weight (Cisco-only, מקומי לנתב) נבדק ראשון, אחר כך Local-Pref."
  },
  {
    id: "q-bgp-2",
    topicId: "bgp-fundamentals",
    category: "routing",
    q: "באיזה Address Family משתמשים בהעברת מסלולי MPLS L3VPN?",
    options: ["ipv4 unicast", "vpnv4", "l2vpn evpn", "ipv6 labeled-unicast"],
    correct: 1,
    explain: "vpnv4 הוא ה-AF להעברת prefixes עם RD בין PEs."
  },
  {
    id: "q-bgp-3",
    topicId: "bgp-policy",
    category: "routing",
    q: "מה Cluster-List משמש?",
    options: [
      "סינון VLANs ב-iBGP",
      "מניעת לולאות בין Route Reflectors",
      "הגדרת BGP Confederation",
      "סיכום מסלולים"
    ],
    correct: 1,
    explain: "Cluster-List ו-Originator-ID מונעים לולאות כאשר משתמשים ב-RR בתוך AS."
  },
  {
    id: "q-bgp-4",
    topicId: "bgp-policy",
    category: "routing",
    q: "איזו Community ידועה מונעת יצוא של מסלול ל-eBGP peer?",
    options: ["no-advertise", "no-export", "local-as", "internet"],
    correct: 1,
    explain: "no-export מונע יצוא ל-eBGP אך עדיין מאפשר העברה בתוך ה-AS."
  },

  // ---------- Redistribution ----------
  {
    id: "q-redist-1",
    topicId: "redistribution",
    category: "routing",
    q: "מה הדרך הטובה ביותר למנוע לולאות בעת Mutual Redistribution בין OSPF ל-EIGRP?",
    options: [
      "הגדלת ה-metric",
      "שימוש ב-passive-interface",
      "סימון מסלולים ב-tag וסינון בכיוון ההפוך",
      "החלפת AD"
    ],
    correct: 2,
    explain: "סימון tag במהלך הזרמה ראשונה וסינון מסלולים מתויגים בכיוון השני זה ה-best practice."
  },

  // ---------- STP ----------
  {
    id: "q-stp-1",
    topicId: "stp-rapid",
    category: "switching",
    q: "מה התפקיד של פורט במצב Alternate ב-RSTP?",
    options: [
      "מעביר תעבורה אקטיבית",
      "ממתין כגיבוי ל-Designated באותו סגמנט",
      "ממתין כגיבוי ל-Root Port (סגמנט שונה)",
      "מבוטל לחלוטין"
    ],
    correct: 2,
    explain: "Alternate מתחבר לסגמנט אחר ומספק מסלול חלופי ל-Root."
  },
  {
    id: "q-stp-2",
    topicId: "stp-rapid",
    category: "switching",
    q: "באיזה פיצ'ר נשתמש כדי למנוע ממכשיר משתמש לגרום לבחירה מחדש של Root?",
    options: ["BPDU Filter", "Root Guard", "BPDU Guard", "UDLD"],
    correct: 2,
    explain: "BPDU Guard מכבה מיד פורט עם PortFast שמקבל BPDU — מתאים לפורטי משתמש."
  },
  {
    id: "q-stp-3",
    topicId: "stp-rapid",
    category: "switching",
    q: "באיזה מצב Loop Guard ממקם פורט כאשר BPDU מפסיק להגיע?",
    options: ["err-disabled", "Forwarding", "Inconsistent (Loop)", "Blocking בלבד"],
    correct: 2,
    explain: "הפורט נכנס למצב Loop-Inconsistent עד שיחזרו BPDU."
  },

  // ---------- EtherChannel ----------
  {
    id: "q-pc-1",
    topicId: "etherchannel",
    category: "switching",
    q: "אילו שני מצבים יקימו LACP EtherChannel תקין?",
    options: ["on / desirable", "active / passive", "passive / passive", "auto / on"],
    correct: 1,
    explain: "active/active או active/passive — לפחות צד אחד חייב להיות active."
  },

  // ---------- VLAN ----------
  {
    id: "q-vlan-1",
    topicId: "vlans-trunks",
    category: "switching",
    q: "פריים שמגיע ב-Native VLAN על trunk 802.1Q —",
    options: ["נשלח ללא תיוג", "תויג כ-VLAN 1 בלבד", "נזרק", "תויג ב-Priority 0 בלבד"],
    correct: 0,
    explain: "Native VLAN עובר ללא תג. מומלץ להגדיר native VLAN ייעודי שונה מ-1."
  },

  // ---------- FHRP ----------
  {
    id: "q-fhrp-1",
    topicId: "fhrp",
    category: "switching",
    q: "מהי כתובת MAC של HSRPv2 group 10?",
    options: ["0000.0C07.AC0A", "0000.5E00.010A", "0000.0C9F.F00A", "0007.B400.000A"],
    correct: 2,
    explain: "HSRPv2 משתמש ב-0000.0C9F.Fxxx כאשר xxx = group ב-hex (10 → 00A)."
  },
  {
    id: "q-fhrp-2",
    topicId: "fhrp",
    category: "switching",
    q: "מה ההבדל המרכזי בין GLBP ל-HSRP?",
    options: [
      "GLBP מבוסס תקן IEEE",
      "GLBP מאפשר איזון עומסים מובנה בין כמה נתבים פעילים",
      "GLBP פועל רק על IPv6",
      "ל-GLBP אין preemption"
    ],
    correct: 1,
    explain: "GLBP מקצה Virtual MAC שונה לכל AVF, מה שמאזן עומסים אמיתי בין נתבים."
  },

  // ---------- NAT ----------
  {
    id: "q-nat-1",
    topicId: "nat",
    category: "services",
    q: "באיזה סדר IOS מבצע NAT inside-to-outside ביחס ל-routing?",
    options: [
      "NAT לפני routing",
      "NAT אחרי routing",
      "NAT במקום routing",
      "תלוי בסוג ה-ACL"
    ],
    correct: 1,
    explain: "Inside-to-Outside: routing קודם ל-NAT. Outside-to-Inside: NAT קודם ל-routing."
  },

  // ---------- QoS ----------
  {
    id: "q-qos-1",
    topicId: "qos",
    category: "services",
    q: "באיזה PHB נשתמש לתעבורת קול (Voice RTP)?",
    options: ["AF11", "EF (DSCP 46)", "CS6", "BE"],
    correct: 1,
    explain: "EF (Expedited Forwarding) הוא הסטנדרט עבור voice; LLQ priority queue."
  },
  {
    id: "q-qos-2",
    topicId: "qos",
    category: "services",
    q: "ההבדל המרכזי בין Shaping ל-Policing הוא:",
    options: [
      "Shaping יכול לסמן מחדש, Policing לא",
      "Policing מאחסן בתור; Shaping זורק",
      "Shaping מאחסן בתור (buffer); Policing זורק/מסמן מיד",
      "אין הבדל מעשי"
    ],
    correct: 2,
    explain: "Shaping מחליק בעזרת תורים; Policing נוקט פעולה מיידית על חבילות מעבר."
  },

  // ---------- Multicast ----------
  {
    id: "q-mc-1",
    topicId: "multicast",
    category: "services",
    q: "איזה טווח כתובות multicast מוקצה ל-SSM?",
    options: ["224.0.0.0/24", "232.0.0.0/8", "239.0.0.0/8", "233.0.0.0/8"],
    correct: 1,
    explain: "232.0.0.0/8 שמור ל-Source-Specific Multicast."
  },

  // ---------- ACL/ZBF ----------
  {
    id: "q-acl-1",
    topicId: "acl-zbf",
    category: "security",
    q: "איפה לרוב ממקמים Extended ACL?",
    options: ["קרוב ליעד", "קרוב למקור", "תמיד על Loopback", "בכל ABR"],
    correct: 1,
    explain: "Extended ACL ממקמים קרוב למקור כדי לזרוק תעבורה מוקדם בנתיב."
  },
  {
    id: "q-acl-2",
    topicId: "acl-zbf",
    category: "security",
    q: "מה קורה בתעבורה בין שני zones ב-ZBFW כאשר אין zone-pair מוגדר ביניהם?",
    options: ["נופלת ל-class-default", "מותרת כברירת מחדל", "נדחית", "נוסעת ב-control-plane"],
    correct: 2,
    explain: "ZBFW: ברירת המחדל היא drop כאשר אין zone-pair מתאים."
  },

  // ---------- AAA ----------
  {
    id: "q-aaa-1",
    topicId: "aaa",
    category: "security",
    q: "מהו פורט ה-TCP שמשמש את TACACS+?",
    options: ["49", "1812", "1645", "636"],
    correct: 0,
    explain: "TACACS+ פועל על TCP/49 ומצפין את כל ה-payload."
  },
  {
    id: "q-aaa-2",
    topicId: "aaa",
    category: "security",
    q: "מתי נעדיף RADIUS על TACACS+?",
    options: [
      "כשרוצים ניהול גרנולרי של פקודות ניהוליות",
      "לגישת רשת ו-802.1X",
      "להחלפת SNMPv2",
      "לבקרה על SSH בלבד"
    ],
    correct: 1,
    explain: "RADIUS נפוץ ב-NAC/802.1X; TACACS+ עדיף לניהול ציוד."
  },

  // ---------- CoPP ----------
  {
    id: "q-copp-1",
    topicId: "copp",
    category: "security",
    q: "מה המטרה העיקרית של CoPP?",
    options: [
      "להאיץ MPLS forwarding",
      "להגן על ה-CPU של הנתב מ-DoS על control-plane",
      "להוסיף QoS לתעבורת data",
      "להפעיל NetFlow"
    ],
    correct: 1,
    explain: "CoPP משתמש ב-MQC כדי לסנן/לתת קצב לתעבורה שמגיעה ל-CPU."
  },

  // ---------- Wireless ----------
  {
    id: "q-wifi-1",
    topicId: "wireless-arch",
    category: "wireless",
    q: "באילו פורטי UDP משתמש CAPWAP?",
    options: ["UDP 1812 ו-1813", "UDP 5246 ו-5247", "TCP 443 ו-22", "UDP 67 ו-68"],
    correct: 1,
    explain: "5246 — control (DTLS), 5247 — data."
  },
  {
    id: "q-wifi-2",
    topicId: "wireless-security",
    category: "wireless",
    q: "מה מגן WPA3-Personal יותר טוב מ-WPA2-Personal?",
    options: [
      "מצפין רק את כותרת ה-802.11",
      "משתמש ב-SAE כדי למנוע התקפת מילון אופליין",
      "אינו דורש PSK",
      "תמיד דורש EAP-TLS"
    ],
    correct: 1,
    explain: "SAE מספק forward secrecy ומונע התקפות מילון אופליין על PSK."
  },

  // ---------- VPN ----------
  {
    id: "q-mpls-1",
    topicId: "mpls-l3vpn",
    category: "vpn",
    q: "מה מבדיל בין שתי כתובות 10.1.1.0/24 של לקוחות שונים בתוך אותו backbone?",
    options: ["MED", "Route-Target", "Route-Distinguisher", "Originator-ID"],
    correct: 2,
    explain: "RD הופך את ה-prefix ל-vpnv4 ייחודי. RT שולט בייצוא/יבוא בין VRFs."
  },
  {
    id: "q-dmvpn-1",
    topicId: "dmvpn",
    category: "vpn",
    q: "באיזה שלב של DMVPN ה-Spokes יכולים לבנות מנהרה ישירה ביניהם בעזרת NHRP shortcut?",
    options: ["Phase 1", "Phase 2", "Phase 3", "אף שלב"],
    correct: 2,
    explain: "Phase 3 משתמש ב-NHRP redirect + shortcut כדי לבנות מנהרת spoke-to-spoke ולעדכן את הניתוב."
  },
  {
    id: "q-vxlan-1",
    topicId: "vxlan-evpn",
    category: "vpn",
    q: "באיזה פורט UDP פועל VXLAN בברירת מחדל?",
    options: ["4500", "4789", "8472", "1701"],
    correct: 1,
    explain: "VXLAN הסטנדרטי משתמש ב-UDP 4789 (Linux ישן השתמש ב-8472)."
  },

  // ---------- Automation ----------
  {
    id: "q-auto-1",
    topicId: "rest-yang",
    category: "automation",
    q: "באיזה Transport משתמש NETCONF?",
    options: ["HTTPS", "SSH (834? 830)", "gRPC", "SNMP"],
    correct: 1,
    explain: "NETCONF פועל מעל SSH על פורט 830."
  },
  {
    id: "q-auto-2",
    topicId: "rest-yang",
    category: "automation",
    q: "איזה Data Modeling Language משמש את NETCONF, RESTCONF ו-gNMI?",
    options: ["XSD", "YANG", "JSON Schema", "Protobuf3"],
    correct: 1,
    explain: "YANG הוא ה-data model; ה-Encoding משתנה (XML/JSON/Protobuf)."
  },
  {
    id: "q-auto-3",
    topicId: "sdn-sdwan",
    category: "automation",
    q: "איזה רכיב ב-SD-WAN של סיסקו אחראי על Control-Plane וניהול OMP?",
    options: ["vManage", "vBond", "vSmart", "cEdge"],
    correct: 2,
    explain: "vSmart הוא ה-Controller המפיץ OMP בדומה ל-Route Reflector ב-BGP."
  },

  // ---------- Assurance ----------
  {
    id: "q-assure-1",
    topicId: "monitoring",
    category: "assurance",
    q: "איזו רמת אבטחה ב-SNMPv3 מספקת גם authentication וגם encryption?",
    options: ["noAuthNoPriv", "authNoPriv", "authPriv", "privNoAuth"],
    correct: 2,
    explain: "authPriv מספק שילוב של HMAC + AES/DES."
  },
  {
    id: "q-assure-2",
    topicId: "span-erspan",
    category: "assurance",
    q: "מה היתרון של ERSPAN על SPAN?",
    options: [
      "תופס פחות זיכרון",
      "יכול לשלוח את התעבורה דרך L3 בעזרת GRE",
      "מצריך פחות BW",
      "מצפין את ה-mirror"
    ],
    correct: 1,
    explain: "ERSPAN עוטף ב-GRE כדי לאפשר העברת mirror על פני L3."
  },
  {
    id: "q-assure-3",
    topicId: "ip-sla",
    category: "assurance",
    q: "אילו שני אובייקטים תכננת לקשר כדי לבצע Floating-Static עם IP SLA?",
    options: [
      "ip sla + route-map",
      "ip sla + track + ip route … track",
      "ip sla + class-map",
      "ip sla + access-list"
    ],
    correct: 1,
    explain: "מגדירים IP SLA, מקשרים track אליו, ובמסלול הסטטי משתמשים ב-track."
  },

  // ---------- Architecture ----------
  {
    id: "q-arch-1",
    topicId: "campus-design",
    category: "architecture",
    q: "מה היתרון של Routed Access על פני סוויצ'ינג בלבד בשכבת הגישה?",
    options: [
      "מבטל את הצורך ב-DHCP",
      "מאיץ התכנסות ומבטל בעיות STP",
      "מאפשר ריבוי native VLANs",
      "מאפשר שימוש ב-VTP v3 בלבד"
    ],
    correct: 1,
    explain: "L3 עד הגישה מבטל STP בין שכבות, מאפשר ECMP והתכנסות מהירה."
  },
  {
    id: "q-arch-2",
    topicId: "ipv6-basics",
    category: "architecture",
    q: "איזו כתובת רב-שידור של IPv6 פונה לכל הנתבים בקישור?",
    options: ["FF02::1", "FF02::2", "FF02::5", "FF02::A"],
    correct: 1,
    explain: "FF02::1 — All Nodes, FF02::2 — All Routers, FF02::5 — OSPFv3, FF02::A — EIGRP."
  },
  {
    id: "q-arch-3",
    topicId: "ipv6-basics",
    category: "architecture",
    q: "מה הדגלים ב-RA שמשפיעים על בחירת SLAAC מול DHCPv6?",
    options: ["A, P", "M, O", "U, L", "S, M"],
    correct: 1,
    explain: "M=Managed (stateful DHCPv6), O=Other (stateless DHCPv6). A הוא דגל בכל prefix."
  }
];
