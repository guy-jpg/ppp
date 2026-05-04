"""
Geopolitical risk factors for Israel-Iran conflict prediction.

Each Factor encodes domain knowledge as a structured risk signal:
  - score:  current intensity (0 = minimal risk, 10 = maximum risk)
  - weight: relative importance in the model (unnormalized)
  - uncertainty: ±std dev used in Monte Carlo simulation
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Factor:
    key: str
    name: str
    description: str
    score: float          # [0, 10]
    weight: float         # unnormalized importance
    uncertainty: float    # std dev for Monte Carlo (default ±1.5)
    category: str = "general"
    rationale: str = ""

    def __post_init__(self) -> None:
        if not (0.0 <= self.score <= 10.0):
            raise ValueError(f"Factor '{self.key}' score must be in [0, 10], got {self.score}")
        if self.weight <= 0:
            raise ValueError(f"Factor '{self.key}' weight must be positive")
        if self.uncertainty < 0:
            raise ValueError(f"Factor '{self.key}' uncertainty must be non-negative")

    def clamp_score(self, s: float) -> float:
        return max(0.0, min(10.0, s))


# ---------------------------------------------------------------------------
# Default factor set – calibrated to May 2026 geopolitical state
# ---------------------------------------------------------------------------

DEFAULT_FACTORS: Dict[str, Factor] = {
    # ── Military / Kinetic ──────────────────────────────────────────────────
    "nuclear_advancement": Factor(
        key="nuclear_advancement",
        name="התקדמות גרעינית איראנית",
        description="קרבת איראן לסף נשק גרעיני (העשרה, כמות חומר, זמן פריצה)",
        score=7.5,
        weight=0.22,
        uncertainty=1.0,
        category="military",
        rationale="העשרה ל-60 %+; פחות מ-2 שבועות לכמות נשק תיאורטית",
    ),
    "proxy_activity": Factor(
        key="proxy_activity",
        name="פעילות פרוקסי",
        description="עוצמת מתקפות חיזבאלה, חות'ים ומיליציות גג-3 ב-30 יום אחרונים",
        score=4.5,
        weight=0.14,
        uncertainty=1.5,
        category="military",
        rationale="חיזבאלה מוחלש; חות'ים ממשיכים להפריע לנתיבי ים",
    ),
    "direct_strike_history": Factor(
        key="direct_strike_history",
        name="היסטוריית מתקפות ישירות",
        description="תקדים של חילופי אש ישירים בין ישראל לאיראן (מחצית השנה האחרונה)",
        score=6.0,
        weight=0.13,
        uncertainty=1.2,
        category="military",
        rationale="מתקפות ישירות הדדיות ב-2024 שברו טאבו היסטורי",
    ),
    "idf_readiness": Factor(
        key="idf_readiness",
        name="כוננות צבאית ישראלית",
        description="מידת הגיוס, הכוננות והלחץ הציבורי-צבאי לפעולה",
        score=5.5,
        weight=0.09,
        uncertainty=1.5,
        category="military",
        rationale="צה\"ל מיומן אך מותש מחזית עזה-לבנון",
    ),

    # ── Diplomatic / Political ──────────────────────────────────────────────
    "diplomatic_channels": Factor(
        key="diplomatic_channels",
        name="ערוצים דיפלומטיים",
        description="קיום ופעילות ערוצי גישור ישירים/עקיפים",
        score=7.5,
        weight=0.11,
        uncertainty=1.2,
        category="diplomatic",
        rationale="כמעט אין ערוצים ישירים; תיווך שוויצרי/קטרי חלש",
    ),
    "international_pressure": Factor(
        key="international_pressure",
        name="לחץ בינלאומי לריסון",
        description="עוצמת הלחץ האמריקאי, אירופאי וסעודי להימנע מהסלמה",
        score=4.0,
        weight=0.10,
        uncertainty=1.5,
        category="diplomatic",
        rationale="ארה\"ב מרסנת, אך ממשל 2025 פחות התערבותי",
    ),
    "nuclear_deal_status": Factor(
        key="nuclear_deal_status",
        name="מצב הסכם גרעין (JCPOA/נגזרות)",
        description="האם קיים הסכם פעיל המגביל את התוכנית הגרעינית",
        score=8.0,
        weight=0.09,
        uncertainty=1.0,
        category="diplomatic",
        rationale="JCPOA קרוס; מגעים חדשים ב-2025 ללא הסכם מחייב",
    ),

    # ── Domestic ────────────────────────────────────────────────────────────
    "iran_domestic_stability": Factor(
        key="iran_domestic_stability",
        name="יציבות פנים איראנית",
        description="מידת חוסר היציבות הכלכלית-פוליטית שמניעה הסחת דעת חיצונית",
        score=6.5,
        weight=0.07,
        uncertainty=1.5,
        category="domestic",
        rationale="סנקציות כלכליות קשות; מחאות מחזוריות",
    ),
    "israel_domestic_pressure": Factor(
        key="israel_domestic_pressure",
        name="לחץ פנים ישראלי לפעולה",
        description="לחץ ציבורי-פוליטי לפגיעה בתוכנית הגרעין האיראנית",
        score=5.5,
        weight=0.05,
        uncertainty=1.8,
        category="domestic",
        rationale="קואליציה לא יציבה; לחץ יימין לפעולה צבאית",
    ),
}


def factor_list() -> List[Factor]:
    return list(DEFAULT_FACTORS.values())


def total_weight(factors: Dict[str, Factor]) -> float:
    return sum(f.weight for f in factors.values())
