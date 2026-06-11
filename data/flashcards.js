// CCNP Flashcards - Hebrew
// Each card: id, deck (category), front, back

window.CCNP_FLASHCARDS = [
  // Routing
  { id: "f-r-1",  deck: "routing", front: "מהו AD של iBGP?", back: "200" },
  { id: "f-r-2",  deck: "routing", front: "מהו AD של eBGP?", back: "20" },
  { id: "f-r-3",  deck: "routing", front: "באיזו מולטיקאסט OSPF משתמש לשכנים על Broadcast?", back: "224.0.0.5 (AllSPFRouters) ו-224.0.0.6 (AllDRouters)" },
  { id: "f-r-4",  deck: "routing", front: "מהו ה-Wildcard mask של 255.255.255.0?", back: "0.0.0.255" },
  { id: "f-r-5",  deck: "routing", front: "מה ההבדל בין Successor ל-Feasible Successor ב-EIGRP?", back: "Successor = המסלול הטוב ביותר ב-RIB; FS = גיבוי שעומד ב-Feasibility (AD<FD) ומוכן מיידית" },
  { id: "f-r-6",  deck: "routing", front: "מה Default-Information Originate ב-OSPF?", back: "פקודה ב-ASBR להזריק 0.0.0.0/0 ל-OSPF (נדרש 'always' אם אין default ב-RIB)" },
  { id: "f-r-7",  deck: "routing", front: "מה כוללת מטריקת EIGRP Wide?", back: "BW, Delay (פיקו-שניות), Reliability, Load, MTU — multiplier 65536" },
  { id: "f-r-8",  deck: "routing", front: "סדר Path-Selection ב-BGP (3 הראשונים)", back: "Weight ↑, Local-Preference ↑, Local origin (network/aggregate)" },
  { id: "f-r-9",  deck: "routing", front: "מתי נשתמש ב-eBGP multihop?", back: "כאשר ה-peers eBGP מחוברים דרך יותר מ-hop אחד (למשל בין Loopbacks)" },
  { id: "f-r-10", deck: "routing", front: "מהי המשמעות של פקודת next-hop-self?", back: "שינוי next-hop ל-IP של הנתב עצמו לפני פרסום ל-iBGP peers" },

  // Switching
  { id: "f-s-1", deck: "switching", front: "מהו מספר ה-VLAN המקסימלי ב-802.1Q?", back: "4094 (VLAN ID = 12 ביט; 0 ו-4095 שמורים)" },
  { id: "f-s-2", deck: "switching", front: "Default Bridge Priority של STP", back: "32768 (+ VLAN ID במצב PVST/Rapid-PVST)" },
  { id: "f-s-3", deck: "switching", front: "מה הופך פורט ל-PortFast", back: "spanning-tree portfast — דילוג על Listening/Learning. רק לפורטי קצה!" },
  { id: "f-s-4", deck: "switching", front: "מהי המשמעות של err-disabled?", back: "מצב סגירה אוטומטית של פורט בעקבות הפרת מדיניות (BPDU-Guard, port-security וכו')" },
  { id: "f-s-5", deck: "switching", front: "מהי המשמעות של 'switchport nonegotiate'", back: "מבטל DTP על הפורט — אין משא ומתן על trunking" },
  { id: "f-s-6", deck: "switching", front: "מה ההבדל בין Access ל-Trunk Port?", back: "Access משייך לפורט VLAN יחיד ללא תיוג; Trunk נושא ריבוי VLANs עם תיוג 802.1Q" },
  { id: "f-s-7", deck: "switching", front: "מהי כתובת multicast של PVST+ BPDU?", back: "0100.0CCC.CCCD" },

  // Services
  { id: "f-sv-1", deck: "services", front: "מהי DSCP של EF?", back: "46 (Voice)" },
  { id: "f-sv-2", deck: "services", front: "באיזה פורט פועל NTP?", back: "UDP/123" },
  { id: "f-sv-3", deck: "services", front: "מה התפקיד של ip helper-address?", back: "מתרגם broadcast DHCP מ-VLAN ללקוח unicast לכתובת השרת" },
  { id: "f-sv-4", deck: "services", front: "מתי נשתמש ב-Policing במקום Shaping?", back: "כשנדרשת תגובה מיידית (drop/remark) ולא ניתן להחזיק תור — בד\"כ ב-Ingress" },
  { id: "f-sv-5", deck: "services", front: "מהו LLQ?", back: "Low-Latency Queue — תור priority בתוך CBWFQ עבור voice/real-time" },

  // Security
  { id: "f-sec-1", deck: "security", front: "מה ההבדל בין authentication ל-authorization?", back: "Authentication = מי אתה. Authorization = מה מותר לך לעשות." },
  { id: "f-sec-2", deck: "security", front: "מה PIN של no shutdown על interface במצב err-disable?", back: "errdisable recovery cause … + interval, או shut/no shut ידני" },
  { id: "f-sec-3", deck: "security", front: "מהי uRPF?", back: "Unicast Reverse Path Forwarding — מוודא שכתובת המקור מגיעה מאותו interface של ה-route חזרה" },
  { id: "f-sec-4", deck: "security", front: "מתי משתמשים ב-Loose mode של uRPF?", back: "בסביבת ISP/Asymmetric routing — מספיק שיש route כלשהו ל-source" },

  // Wireless
  { id: "f-w-1", deck: "wireless", front: "באיזה DHCP option ה-AP מקבל כתובת WLC?", back: "Option 43 (Vendor Specific)" },
  { id: "f-w-2", deck: "wireless", front: "מה ההבדל בין Local mode ל-FlexConnect?", back: "Local מעביר כל תעבורה ל-WLC; FlexConnect שומר data-plane מקומי בסניף" },
  { id: "f-w-3", deck: "wireless", front: "מה מטרת RRM?", back: "Radio Resource Management — DCA לערוצים ו-TPC להספק, אוטומטי" },
  { id: "f-w-4", deck: "wireless", front: "מתי נעדיף 5GHz על 2.4GHz?", back: "כשרוצים יותר ערוצים non-overlapping, פחות הפרעות וקצב גבוה — חיסרון: טווח קטן יותר" },

  // VPN
  { id: "f-v-1", deck: "vpn", front: "מה Route-Distinguisher?", back: "64 ביט המודבקים ל-prefix כדי ליצור VPNv4 ייחודי (per VRF)" },
  { id: "f-v-2", deck: "vpn", front: "מה Route-Target?", back: "Extended community שקובע אילו VRFs ייבאו/ייצאו את ה-prefix" },
  { id: "f-v-3", deck: "vpn", front: "באיזה פורט פועל IKEv2?", back: "UDP/500, ו-UDP/4500 ב-NAT-T" },
  { id: "f-v-4", deck: "vpn", front: "מה ההבדל בין mGRE ל-GRE?", back: "mGRE מאפשר אינטרפייס יחיד להחזיק מספר מנהרות נקודה-לנקודה — בסיס ל-DMVPN" },

  // Automation
  { id: "f-a-1", deck: "automation", front: "באיזה Encoding נשתמש ב-NETCONF?", back: "XML" },
  { id: "f-a-2", deck: "automation", front: "באיזה פורט פועל NETCONF?", back: "TCP/830 (SSH subsystem)" },
  { id: "f-a-3", deck: "automation", front: "מה Idempotency באוטומציה?", back: "אותה הפעלה חוזרת תניב תוצאה זהה — תכונה של Ansible/Puppet מודולים" },
  { id: "f-a-4", deck: "automation", front: "מה כוללת Postman Collection?", back: "אוסף בקשות API, סביבות וסקריפטים — שימושי לבדיקות RESTCONF" },

  // Assurance
  { id: "f-an-1", deck: "assurance", front: "מהי NetFlow Top Talkers?", back: "פקודה מקצרת לזיהוי כתובות עם נפח תעבורה גבוה" },
  { id: "f-an-2", deck: "assurance", front: "מהן 3 הרמות של SNMPv3?", back: "noAuthNoPriv, authNoPriv, authPriv" },
  { id: "f-an-3", deck: "assurance", front: "מה היתרון של ERSPAN על RSPAN?", back: "ERSPAN משתמש ב-GRE על L3, RSPAN דורש VLAN ייעודי לאורך L2" },

  // Architecture
  { id: "f-ar-1", deck: "architecture", front: "מה ההבדל בין Underlay ל-Overlay?", back: "Underlay = רשת פיזית/IP אמיתית; Overlay = רשת לוגית (VXLAN/GRE/LISP) שרצה מעליה" },
  { id: "f-ar-2", deck: "architecture", front: "באיזה protocol משתמש SD-Access ל-control plane?", back: "LISP (מיפוי EID→RLOC)" },
  { id: "f-ar-3", deck: "architecture", front: "מה ההבדל בין FF02::1 ל-FF02::2?", back: "FF02::1 = All-Nodes על הקישור; FF02::2 = All-Routers" },
  { id: "f-ar-4", deck: "architecture", front: "מה תכלית StackWise/VSS?", back: "איחוד פיזי של כמה סוויצ'ים ל-logical device אחד — control plane יחיד, ניהול נוח, פחות STP" }
];
