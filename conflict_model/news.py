"""
Real-time news fetcher + keyword sentiment analyzer.

Sources: BBC Middle East, Reuters, Al Jazeera, Times of Israel (all free RSS).
No API key required – uses stdlib urllib + xml.etree only.

Pipeline:
  1. Fetch RSS feeds
  2. Filter headlines relevant to Israel/Iran
  3. Score each headline against per-factor keyword dictionaries
  4. Aggregate into factor score deltas
  5. Return updated factor dict
"""

from __future__ import annotations

import re
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from conflict_model.factors import DEFAULT_FACTORS, Factor

# ── RSS sources ───────────────────────────────────────────────────────────────

RSS_FEEDS = [
    ("BBC Middle East",      "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml"),
    ("Al Jazeera",           "https://www.aljazeera.com/xml/rss/all.xml"),
    ("Times of Israel",      "https://www.timesofisrael.com/feed/"),
    ("Reuters World",        "https://feeds.reuters.com/reuters/worldNews"),
    ("Jerusalem Post",       "https://www.jpost.com/rss/rssfeedsfrontpage.aspx"),
]

# ── Relevance filter ──────────────────────────────────────────────────────────

RELEVANCE_KEYWORDS = [
    "iran", "israel", "israeli", "iranian", "tehran", "jerusalem",
    "idf", "irgc", "hezbollah", "houthi", "nuclear", "uranium",
    "enrichment", "missile", "strike", "attack", "mossad",
    "netanyahu", "khamenei", "iaea", "jcpoa",
    "איראן", "ישראל", "גרעין", "טיל", "מתקפה",
]

# ── Per-factor keyword dictionaries ──────────────────────────────────────────
# Each entry: (factor_key, escalation_keywords, de_escalation_keywords)

FACTOR_SIGNALS: List[Tuple[str, List[str], List[str]]] = [
    (
        "nuclear_advancement",
        ["enrich", "uranium", "centrifuge", "breakout", "nuclear weapon",
         "bomb", "warhead", "iaea violation", "60%", "90%", "fordow", "natanz"],
        ["nuclear deal", "agreement", "freeze", "jcpoa", "inspectors",
         "monitoring", "dismantle", "reduce enrichment"],
    ),
    (
        "proxy_activity",
        ["hezbollah", "houthi", "rocket", "drone attack", "militia",
         "proxy", "kataib", "pmu", "attack on israel", "red sea", "blockade"],
        ["ceasefire", "withdrawal", "disarm", "calm", "quiet border"],
    ),
    (
        "direct_strike_history",
        ["direct strike", "israel attack iran", "iran attack israel",
         "ballistic missile", "air strike", "bombing", "retaliation",
         "idf strike", "iran launch"],
        ["no retaliation", "restrained", "de-escalate", "held fire"],
    ),
    (
        "idf_readiness",
        ["idf deploy", "mobilize", "reserve", "alert", "war cabinet",
         "idf ready", "military option", "preemptive"],
        ["idf stand down", "troops return", "demobilize"],
    ),
    (
        "diplomatic_channels",
        ["no talks", "broke off", "expelled ambassador", "sanctions",
         "no contact", "severed ties"],
        ["talks", "negotiation", "mediation", "diplomat", "meeting",
         "channel", "envoy", "back-channel", "qatar mediat", "swiss"],
    ),
    (
        "international_pressure",
        ["us warn", "sanction", "biden", "trump warn", "europe condemn",
         "un resolution", "security council"],
        ["us support", "green light", "us back", "support israel",
         "allow strike"],
    ),
    (
        "nuclear_deal_status",
        ["deal collapse", "jcpoa dead", "no agreement", "talks fail",
         "iran reject", "walkout", "breakdown"],
        ["deal signed", "agreement reached", "jcpoa revive",
         "nuclear accord", "framework", "interim deal"],
    ),
    (
        "iran_domestic_stability",
        ["protest", "unrest", "riot", "economic crisis", "sanction",
         "inflation", "unemployment", "uprising", "crackdown"],
        ["stability", "recovery", "growth", "calm", "reform"],
    ),
    (
        "israel_domestic_pressure",
        ["far-right", "ben gvir", "smotrich", "pressure netanyahu",
         "strike iran", "demand action", "coalition crisis"],
        ["coalition stable", "moderate", "restraint", "oppose strike"],
    ),
]

# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class Headline:
    source: str
    title: str
    summary: str
    url: str
    pub_date: str

    @property
    def text(self) -> str:
        return (self.title + " " + self.summary).lower()


@dataclass
class NewsSignal:
    factor_key: str
    factor_name: str
    delta: float          # adjustment to apply to current score
    matched_headlines: List[str]
    direction: str        # "escalation" | "de-escalation" | "neutral"


@dataclass
class NewsFeedResult:
    headlines: List[Headline]
    signals: List[NewsSignal]
    updated_factors: Dict[str, Factor]
    fetch_time: str
    headlines_analyzed: int
    relevant_count: int


# ── Fetcher ───────────────────────────────────────────────────────────────────

def _fetch_feed(name: str, url: str, timeout: int = 8) -> List[Headline]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ConflictModel/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
        root = ET.fromstring(raw)
    except Exception:
        return []

    headlines = []
    ns = {"atom": "http://www.w3.org/2005/Atom"}

    # RSS 2.0
    for item in root.iter("item"):
        title   = (item.findtext("title") or "").strip()
        summary = (item.findtext("description") or "").strip()
        link    = (item.findtext("link") or "").strip()
        pubdate = (item.findtext("pubDate") or "").strip()
        if title:
            headlines.append(Headline(name, title, summary, link, pubdate))

    # Atom
    for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
        title   = (entry.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
        summary = (entry.findtext("{http://www.w3.org/2005/Atom}summary") or "").strip()
        link_el = entry.find("{http://www.w3.org/2005/Atom}link")
        link    = (link_el.get("href") if link_el is not None else "") or ""
        updated = (entry.findtext("{http://www.w3.org/2005/Atom}updated") or "").strip()
        if title:
            headlines.append(Headline(name, title, summary, link, updated))

    return headlines


def fetch_all_headlines() -> List[Headline]:
    all_headlines: List[Headline] = []
    for name, url in RSS_FEEDS:
        all_headlines.extend(_fetch_feed(name, url))
    return all_headlines


def _is_relevant(h: Headline) -> bool:
    text = h.text
    return any(kw in text for kw in RELEVANCE_KEYWORDS)


# ── Sentiment scorer ──────────────────────────────────────────────────────────

def _score_headline(text: str, esc_kws: List[str], desc_kws: List[str]) -> float:
    """Return +1 per escalation match, -1 per de-escalation match."""
    score = 0.0
    for kw in esc_kws:
        if kw in text:
            score += 1.0
    for kw in desc_kws:
        if kw in text:
            score -= 1.0
    return score


def analyze_headlines(headlines: List[Headline]) -> List[NewsSignal]:
    relevant = [h for h in headlines if _is_relevant(h)]
    signals: List[NewsSignal] = []

    for factor_key, esc_kws, desc_kws in FACTOR_SIGNALS:
        total_score = 0.0
        matched: List[str] = []

        for h in relevant:
            s = _score_headline(h.text, esc_kws, desc_kws)
            if s != 0.0:
                total_score += s
                matched.append(h.title[:90])

        # Normalise: clamp raw sum to ±3, map to delta of ±1.5
        clamped = max(-3.0, min(3.0, total_score))
        delta = clamped * 0.5   # each "strong signal" shifts score by up to 1.5

        direction = "neutral"
        if delta > 0.2:
            direction = "escalation"
        elif delta < -0.2:
            direction = "de-escalation"

        signals.append(NewsSignal(
            factor_key=factor_key,
            factor_name=DEFAULT_FACTORS[factor_key].name,
            delta=delta,
            matched_headlines=matched[:5],
            direction=direction,
        ))

    return signals


# ── Main public function ──────────────────────────────────────────────────────

def fetch_and_update(
    base_factors: Dict[str, Factor] | None = None,
) -> NewsFeedResult:
    """
    Fetch latest news, analyze sentiment, return adjusted factor dict.
    """
    from copy import deepcopy

    if base_factors is None:
        base_factors = DEFAULT_FACTORS

    headlines = fetch_all_headlines()
    relevant  = [h for h in headlines if _is_relevant(h)]
    signals   = analyze_headlines(headlines)

    updated = deepcopy(base_factors)
    for sig in signals:
        if sig.factor_key in updated and sig.delta != 0.0:
            f = updated[sig.factor_key]
            new_score = f.clamp_score(f.score + sig.delta)
            updated[sig.factor_key] = Factor(**{**f.__dict__, "score": new_score})

    return NewsFeedResult(
        headlines=headlines,
        signals=signals,
        updated_factors=updated,
        fetch_time=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        headlines_analyzed=len(headlines),
        relevant_count=len(relevant),
    )
