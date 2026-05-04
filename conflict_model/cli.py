"""
Terminal CLI for the Israel-Iran conflict prediction model.

Usage:
  python main.py predict   [--scenario SCENARIO]
  python main.py compare
  python main.py tornado   [--scenario SCENARIO]
  python main.py factors
  python main.py scenarios
  python main.py update    FACTOR_KEY SCORE [--scenario SCENARIO]
  python main.py help
"""

from __future__ import annotations

import argparse
import sys

from conflict_model.display import (
    BOLD, CYAN, DIM, GREEN, MAGENTA, RED, RESET, YELLOW,
    hbar, panel, pct, prob_color, rule, score_color, Table,
)
from conflict_model.factors import DEFAULT_FACTORS, Factor, total_weight
from conflict_model.model import PredictionResult, predict, sensitivity_analysis
from conflict_model.scenarios import SCENARIOS, list_scenarios


# ── Render helpers ────────────────────────────────────────────────────────────

def _risk_banner(p: float, label: str, scenario_name: str,
                 ci_low: float, ci_high: float, mc_std: float) -> None:
    color = prob_color(p)
    lines = [
        "",
        f"{color}{BOLD}  הסתברות לחידוש עימות ישראלי-איראני{RESET}",
        "",
        f"  {color}{BOLD}  {pct(p):>8}  {RESET}",
        "",
        f"  {DIM}CI 90%: [{pct(ci_low)} – {pct(ci_high)}]   σ = {pct(mc_std)}{RESET}",
        f"  רמת סיכון: {color}{BOLD}{label}{RESET}",
        f"  תרחיש: {DIM}{scenario_name}{RESET}",
        "",
    ]
    print(panel(lines, border_color=color, width=60))


def render_result(result: PredictionResult, scenario_name: str = "baseline") -> None:
    print()
    print(rule("תוצאת מודל חיזוי עימות ישראל–איראן"))
    print()

    _risk_banner(
        result.probability, result.label, scenario_name,
        result.ci_low, result.ci_high, result.mc_std,
    )

    # Contributions table
    t = Table(title="תרומת גורמי סיכון", col_widths=[26, 6, 7, 20, 8])
    t.set_headers("גורם", "ציון", "משקל", "עוצמה", "תרומה")

    max_contrib = max(result.factor_contributions.values(), default=1.0)
    for key, contrib in sorted(
        result.factor_contributions.items(), key=lambda x: x[1], reverse=True
    ):
        f = DEFAULT_FACTORS[key]
        sc_col = score_color(f.score)
        bar = hbar(contrib / max_contrib, width=18, color=sc_col)
        t.add_row(
            f.name,
            sc_col + f"{f.score:.1f}" + RESET,
            f"{f.weight:.0%}",
            bar,
            DIM + f"{contrib * 100:.1f}" + RESET,
        )

    print(t.render())
    print()


def render_tornado(factors=None) -> None:
    entries = sensitivity_analysis(factors)
    baseline_p = predict(factors).probability

    print()
    print(rule("ניתוח רגישות (Tornado)"))
    print(f"  {DIM}הסתברות בסיס:{RESET} {BOLD}{pct(baseline_p)}{RESET}  "
          f"{DIM}סטייה ±2 נקודות לכל גורם{RESET}\n")

    t = Table(col_widths=[26, 8, 28, 8, 8])
    t.set_headers("גורם", "▼ ירידה", "תנודה", "▲ עלייה", "השפעה")

    max_impact = entries[0].net_impact if entries else 1.0

    for e in entries:
        rel = e.net_impact / max_impact if max_impact else 0
        L = max(1, int(rel * 12))
        R = max(1, int(rel * 12))
        swing = (
            GREEN + "◄" * L + DIM + "─" * (12 - L) + "│" +
            DIM + "─" * (12 - R) + RED + "►" * R + RESET
        )
        t.add_row(
            e.factor_name,
            GREEN + f"-{pct(abs(e.impact_low))}" + RESET,
            swing,
            RED + f"+{pct(e.impact_high)}" + RESET,
            BOLD + pct(e.net_impact) + RESET,
        )

    print(t.render())
    print()


def render_comparison() -> None:
    print()
    print(rule("השוואת תרחישים"))
    print()

    t = Table(col_widths=[26, 9, 22, 22, 12])
    t.set_headers("תרחיש", "הסתברות", "CI 90%", "עוצמה", "רמת סיכון")

    for scenario in list_scenarios():
        facs = scenario.build_factors()
        res = predict(facs)
        p = res.probability
        color = prob_color(p)
        bar = hbar(p, width=20, color=color)
        t.add_row(
            scenario.name,
            color + BOLD + pct(p) + RESET,
            DIM + f"{pct(res.ci_low)} – {pct(res.ci_high)}" + RESET,
            bar,
            color + res.label + RESET,
        )

    print(t.render())
    print()


def render_factors() -> None:
    print()
    print(rule("גורמי סיכון – מצב נוכחי"))
    print()

    t = Table(col_widths=[24, 26, 10, 6, 7, 20, 38])
    t.set_headers("מפתח", "שם", "קטגוריה", "ציון", "משקל", "ויזואלי", "רציונל")

    for f in DEFAULT_FACTORS.values():
        color = score_color(f.score)
        t.add_row(
            DIM + f.key + RESET,
            f.name,
            f.category,
            color + BOLD + f"{f.score:.1f}" + RESET,
            f"{f.weight:.0%}",
            hbar(f.score / 10.0, width=18, color=color),
            DIM + f.rationale + RESET,
        )

    print(t.render())
    print()


def render_scenarios() -> None:
    print()
    print(rule("תרחישים זמינים"))
    print()

    t = Table(col_widths=[22, 28, 52])
    t.set_headers("מפתח", "שם", "תיאור")

    for sc in list_scenarios():
        t.add_row(
            BOLD + sc.key + RESET,
            sc.name,
            DIM + sc.description + RESET,
        )

    print(t.render())
    print()


# ── CLI dispatcher ────────────────────────────────────────────────────────────

HELP_TEXT = f"""
{BOLD}{CYAN}מודל חיזוי עימות ישראל–איראן{RESET}  v1.0

{BOLD}פקודות:{RESET}
  predict   [--scenario S]         הרץ מודל על תרחיש
  compare                           השווה את כל התרחישים
  tornado   [--scenario S]         ניתוח רגישות
  factors                           הצג גורמי סיכון
  scenarios                         הצג תרחישים זמינים
  update    FACTOR SCORE [--scenario S]   עדכן ציון גורם

{BOLD}תרחישים זמינים:{RESET}
  {DIM}baseline, nuclear_breakout, diplomatic_breakthrough,
  proxy_escalation, us_disengagement, full_escalation, calm{RESET}

{BOLD}דוגמאות:{RESET}
  python main.py predict
  python main.py predict --scenario nuclear_breakout
  python main.py compare
  python main.py tornado --scenario proxy_escalation
  python main.py update nuclear_advancement 9.5
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="conflict-model",
        description="Israel-Iran Conflict Prediction Model",
        add_help=False,
    )
    sub = parser.add_subparsers(dest="command")

    # predict
    p_predict = sub.add_parser("predict")
    p_predict.add_argument("--scenario", "-s", default="baseline")
    p_predict.add_argument("--days", "-d", type=int, default=365,
                           help="אופק זמן בימים (ברירת מחדל: 365)")

    # compare
    sub.add_parser("compare")

    # tornado
    p_tornado = sub.add_parser("tornado")
    p_tornado.add_argument("--scenario", "-s", default="baseline")

    # factors
    sub.add_parser("factors")

    # scenarios
    sub.add_parser("scenarios")

    # update
    p_update = sub.add_parser("update")
    p_update.add_argument("factor_key")
    p_update.add_argument("score", type=float)
    p_update.add_argument("--scenario", "-s", default="baseline")

    # help
    sub.add_parser("help")

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command is None or args.command == "help":
        print(HELP_TEXT)
        return

    if args.command == "predict":
        sc = SCENARIOS.get(args.scenario)
        if sc is None:
            print(f"{RED}תרחיש לא קיים: '{args.scenario}'{RESET}")
            sys.exit(1)
        days = getattr(args, "days", 365)
        horizon = f"{days} יום" if days != 365 else "12 חודשים"
        result = predict(sc.build_factors(), days=days)
        render_result(result, scenario_name=f"{sc.name} │ אופק: {horizon}")

    elif args.command == "compare":
        render_comparison()

    elif args.command == "tornado":
        sc = SCENARIOS.get(args.scenario)
        if sc is None:
            print(f"{RED}תרחיש לא קיים: '{args.scenario}'{RESET}")
            sys.exit(1)
        render_tornado(sc.build_factors())

    elif args.command == "factors":
        render_factors()

    elif args.command == "scenarios":
        render_scenarios()

    elif args.command == "update":
        if args.factor_key not in DEFAULT_FACTORS:
            print(f"{RED}גורם לא קיים: '{args.factor_key}'{RESET}")
            print("גורמים: " + ", ".join(DEFAULT_FACTORS.keys()))
            sys.exit(1)
        if not (0.0 <= args.score <= 10.0):
            print(f"{RED}ציון חייב להיות בין 0 ל-10{RESET}")
            sys.exit(1)

        sc = SCENARIOS.get(args.scenario)
        if sc is None:
            print(f"{RED}תרחיש לא קיים: '{args.scenario}'{RESET}")
            sys.exit(1)

        factors = sc.build_factors()
        old_score = factors[args.factor_key].score
        f = factors[args.factor_key]
        factors[args.factor_key] = Factor(**{**f.__dict__, "score": args.score})

        print(f"\n{DIM}עדכון:{RESET} {BOLD}{f.name}{RESET}  "
              f"{old_score:.1f} → {BOLD}{args.score:.1f}{RESET}")

        result = predict(factors)
        render_result(result, scenario_name=f"{sc.name} (מותאם)")
        render_tornado(factors)
