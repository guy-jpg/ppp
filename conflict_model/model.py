"""
Core conflict-probability model.

Architecture
------------
1. **Weighted logistic aggregation**
   Raw risk score R = Σ (weight_i / W_total) * (score_i / 10)
   Probability     P = sigmoid(k * (R - 0.5))

   k controls steepness; k=8 means R=0.5 → 50 %, R=0.8 → ~86 %

2. **Monte Carlo uncertainty quantification**
   Each factor's score is perturbed by N(0, uncertainty²).
   10 000 samples → empirical distribution → mean + 90 % CI.

3. **Sensitivity analysis**
   Each factor is swept ±delta while others stay fixed.
   Impact = P(score+delta) - P(score-delta).
"""

from __future__ import annotations

import math
import random
from copy import deepcopy
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from conflict_model.factors import DEFAULT_FACTORS, Factor, total_weight


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------

_K = 8.0          # sigmoid steepness
_N_SAMPLES = 10_000
_SEED = 42


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _raw_score(factors: Dict[str, Factor]) -> float:
    """Weighted average of normalised factor scores → [0, 1]."""
    W = total_weight(factors)
    return sum((f.weight / W) * (f.score / 10.0) for f in factors.values())


def _probability(raw: float) -> float:
    """Map raw ∈ [0,1] to probability via logistic curve centred at 0.5."""
    return _sigmoid(_K * (raw - 0.5))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PredictionResult:
    probability: float          # point estimate
    raw_score: float            # weighted average before sigmoid
    ci_low: float               # 5th-percentile (MC)
    ci_high: float              # 95th-percentile (MC)
    mc_std: float               # standard deviation across MC samples
    factor_contributions: Dict[str, float]   # each factor's share of raw score
    label: str                  # human-readable risk level


def _risk_label(p: float) -> str:
    if p < 0.20:
        return "נמוך מאוד"
    if p < 0.35:
        return "נמוך"
    if p < 0.50:
        return "בינוני"
    if p < 0.65:
        return "גבוה"
    if p < 0.80:
        return "גבוה מאוד"
    return "קיצוני"


def predict(
    factors: Optional[Dict[str, Factor]] = None,
    n_samples: int = _N_SAMPLES,
    seed: int = _SEED,
) -> PredictionResult:
    """
    Compute conflict-resumption probability with Monte Carlo confidence interval.

    Parameters
    ----------
    factors:   factor dict (defaults to DEFAULT_FACTORS)
    n_samples: Monte Carlo iterations
    seed:      RNG seed for reproducibility
    """
    if factors is None:
        factors = DEFAULT_FACTORS

    rng = random.Random(seed)

    # ── Point estimate ───────────────────────────────────────────────────────
    raw = _raw_score(factors)
    p_point = _probability(raw)

    # ── Per-factor contributions ─────────────────────────────────────────────
    W = total_weight(factors)
    contributions = {
        k: (f.weight / W) * (f.score / 10.0)
        for k, f in factors.items()
    }

    # ── Monte Carlo ──────────────────────────────────────────────────────────
    mc_probs: List[float] = []
    for _ in range(n_samples):
        perturbed_raw = 0.0
        for f in factors.values():
            noisy_score = f.clamp_score(
                f.score + rng.gauss(0.0, f.uncertainty)
            )
            perturbed_raw += (f.weight / W) * (noisy_score / 10.0)
        mc_probs.append(_probability(perturbed_raw))

    mc_probs.sort()
    lo_idx = int(0.05 * n_samples)
    hi_idx = int(0.95 * n_samples)
    ci_low = mc_probs[lo_idx]
    ci_high = mc_probs[hi_idx]
    mc_mean = sum(mc_probs) / n_samples
    mc_std = math.sqrt(sum((p - mc_mean) ** 2 for p in mc_probs) / n_samples)

    return PredictionResult(
        probability=p_point,
        raw_score=raw,
        ci_low=ci_low,
        ci_high=ci_high,
        mc_std=mc_std,
        factor_contributions=contributions,
        label=_risk_label(p_point),
    )


# ---------------------------------------------------------------------------
# Sensitivity analysis
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SensitivityEntry:
    factor_key: str
    factor_name: str
    impact_low: float    # Δp when score decreases by delta
    impact_high: float   # Δp when score increases by delta
    net_impact: float    # impact_high - impact_low (total swing)


def sensitivity_analysis(
    factors: Optional[Dict[str, Factor]] = None,
    delta: float = 2.0,
) -> List[SensitivityEntry]:
    """
    Tornado analysis: vary each factor ±delta, measure probability swing.
    Returns entries sorted by net_impact descending.
    """
    if factors is None:
        factors = DEFAULT_FACTORS

    baseline = _probability(_raw_score(factors))
    results: List[SensitivityEntry] = []

    for key, factor in factors.items():
        # Score down
        low_factors = deepcopy(factors)
        low_factors[key] = Factor(
            **{**factor.__dict__, "score": factor.clamp_score(factor.score - delta)}
        )
        p_low = _probability(_raw_score(low_factors))

        # Score up
        high_factors = deepcopy(factors)
        high_factors[key] = Factor(
            **{**factor.__dict__, "score": factor.clamp_score(factor.score + delta)}
        )
        p_high = _probability(_raw_score(high_factors))

        results.append(SensitivityEntry(
            factor_key=key,
            factor_name=factor.name,
            impact_low=p_low - baseline,
            impact_high=p_high - baseline,
            net_impact=p_high - p_low,
        ))

    results.sort(key=lambda e: e.net_impact, reverse=True)
    return results
