"""
Terminal rendering utilities using only colorama + stdlib.
Provides coloured tables, bars, and panel-style boxes.
"""

from __future__ import annotations

from colorama import Fore, Back, Style, init as colorama_init

colorama_init(autoreset=True)

# ── ANSI shortcuts ────────────────────────────────────────────────────────────

RESET  = Style.RESET_ALL
BOLD   = Style.BRIGHT
DIM    = Style.DIM

RED    = Fore.RED
YELLOW = Fore.YELLOW
GREEN  = Fore.GREEN
CYAN   = Fore.CYAN
WHITE  = Fore.WHITE
MAGENTA = Fore.MAGENTA

BG_DEFAULT = Back.RESET


def prob_color(p: float) -> str:
    if p < 0.25:
        return GREEN
    if p < 0.45:
        return YELLOW
    if p < 0.65:
        return Fore.LIGHTYELLOW_EX
    return RED


def score_color(s: float) -> str:
    if s <= 3.0:
        return GREEN
    if s <= 6.0:
        return YELLOW
    if s <= 8.0:
        return Fore.LIGHTYELLOW_EX
    return RED


def pct(p: float) -> str:
    return f"{p * 100:.1f}%"


def hbar(value: float, width: int = 20, color: str = "") -> str:
    filled = max(0, min(width, int(round(value * width))))
    return color + "█" * filled + DIM + "░" * (width - filled) + RESET


def rule(title: str = "", width: int = 72, char: str = "─") -> str:
    if not title:
        return DIM + char * width + RESET
    pad = (width - len(title) - 2) // 2
    return DIM + char * pad + RESET + f" {BOLD}{title}{RESET} " + DIM + char * pad + RESET


def panel(lines: list[str], border_color: str = WHITE, width: int = 70) -> str:
    top    = border_color + "╔" + "═" * (width - 2) + "╗" + RESET
    bottom = border_color + "╚" + "═" * (width - 2) + "╝" + RESET
    rows   = [top]
    for line in lines:
        # Strip ANSI for length calculation
        import re
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        visible_len = len(ansi_escape.sub("", line))
        pad = max(0, width - 4 - visible_len)
        rows.append(border_color + "║" + RESET + "  " + line + " " * pad + "  " + border_color + "║" + RESET)
    rows.append(bottom)
    return "\n".join(rows)


# ── Table builder ─────────────────────────────────────────────────────────────

class Table:
    """Minimal fixed-width table renderer."""

    def __init__(self, title: str = "", col_widths: list[int] | None = None) -> None:
        self.title = title
        self.col_widths: list[int] = col_widths or []
        self._headers: list[str] = []
        self._rows: list[list[str]] = []

    def set_headers(self, *headers: str) -> None:
        self._headers = list(headers)
        if not self.col_widths:
            self.col_widths = [len(h) + 2 for h in headers]

    def add_row(self, *cells: str) -> None:
        self._rows.append(list(cells))

    def _cell(self, text: str, width: int, align: str = "<") -> str:
        import re
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        visible = ansi_escape.sub("", text)
        pad = max(0, width - len(visible))
        if align == ">":
            return " " * pad + text
        return text + " " * pad

    def render(self) -> str:
        sep = DIM + "  " + "  ".join("─" * w for w in self.col_widths) + RESET
        lines: list[str] = []

        if self.title:
            lines.append(f"\n{BOLD}{CYAN}{self.title}{RESET}")

        # Headers
        header_cells = [
            BOLD + self._cell(h, self.col_widths[i]) + RESET
            for i, h in enumerate(self._headers)
        ]
        lines.append("  " + "  ".join(header_cells))
        lines.append(sep)

        for row in self._rows:
            cells = [
                self._cell(row[i] if i < len(row) else "", self.col_widths[i])
                for i in range(len(self.col_widths))
            ]
            lines.append("  " + "  ".join(cells))

        lines.append(sep)
        return "\n".join(lines)
