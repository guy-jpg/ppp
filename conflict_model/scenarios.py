"""
Predefined geopolitical scenarios for what-if analysis.

Each scenario is a dict of factor-key → override score.
Factors not listed keep their DEFAULT_FACTORS value.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Dict, List, Optional

from conflict_model.factors import DEFAULT_FACTORS, Factor


@dataclass
class Scenario:
    key: str
    name: str
    description: str
    overrides: Dict[str, float]   # factor_key → score override

    def build_factors(self) -> Dict[str, Factor]:
        factors = deepcopy(DEFAULT_FACTORS)
        for fkey, new_score in self.overrides.items():
            if fkey not in factors:
                raise KeyError(f"Unknown factor key: '{fkey}'")
            f = factors[fkey]
            factors[fkey] = Factor(
                **{**f.__dict__, "score": f.clamp_score(new_score)}
            )
        return factors


SCENARIOS: Dict[str, Scenario] = {
    "baseline": Scenario(
        key="baseline",
        name="מצב נוכחי (ברירת מחדל)",
        description="ציוני הגורמים כפי שהם מוגדרים ב-DEFAULT_FACTORS (מאי 2026)",
        overrides={},
    ),

    "nuclear_breakout": Scenario(
        key="nuclear_breakout",
        name="פריצה גרעינית איראנית",
        description="איראן מגיעה לסף נשק גרעיני; הסכם גרעין קורס לחלוטין",
        overrides={
            "nuclear_advancement": 10.0,
            "nuclear_deal_status": 10.0,
            "idf_readiness": 8.5,
            "international_pressure": 3.0,
        },
    ),

    "diplomatic_breakthrough": Scenario(
        key="diplomatic_breakthrough",
        name="פריצת דרך דיפלומטית",
        description="הסכם גרעין חדש נחתם; ערוצי גישור נפתחים; הפסקת אש כוללת",
        overrides={
            "nuclear_advancement": 4.0,
            "nuclear_deal_status": 2.0,
            "diplomatic_channels": 2.0,
            "proxy_activity": 2.0,
            "international_pressure": 2.0,
        },
    ),

    "proxy_escalation": Scenario(
        key="proxy_escalation",
        name="הסלמת פרוקסי",
        description="חיזבאלה מתאושש ומגביר מתקפות; חות'ים חוסמים מסלולים מרכזיים",
        overrides={
            "proxy_activity": 8.5,
            "direct_strike_history": 7.5,
            "idf_readiness": 7.0,
        },
    ),

    "us_disengagement": Scenario(
        key="us_disengagement",
        name="נסיגה אמריקאית מהאזור",
        description="ארה\"ב מפחיתה נוכחות; לחץ ריסון נחלש; ישראל פועלת עצמאית",
        overrides={
            "international_pressure": 8.5,
            "idf_readiness": 7.5,
            "diplomatic_channels": 8.0,
        },
    ),

    "full_escalation": Scenario(
        key="full_escalation",
        name="הסלמה מלאה",
        description="כל הגורמים ברמת סיכון מרבית – תרחיש קיצון",
        overrides={k: 9.5 for k in DEFAULT_FACTORS},
    ),

    "calm": Scenario(
        key="calm",
        name="הרגעה מלאה",
        description="כל הגורמים ברמת סיכון מינימלית – תרחיש אופטימי",
        overrides={k: 1.0 for k in DEFAULT_FACTORS},
    ),
}


def get_scenario(key: str) -> Scenario:
    if key not in SCENARIOS:
        available = ", ".join(SCENARIOS.keys())
        raise KeyError(f"Scenario '{key}' not found. Available: {available}")
    return SCENARIOS[key]


def list_scenarios() -> List[Scenario]:
    return list(SCENARIOS.values())
