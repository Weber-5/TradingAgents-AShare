# TradingAgents/graph/signal_processing.py

import re
import json

from langchain_openai import ChatOpenAI
from tradingagents.dataflows.config import get_config
from tradingagents.prompts import get_prompt


class SignalProcessor:
    """Processes trading signals to extract actionable decisions."""

    def __init__(self, quick_thinking_llm: ChatOpenAI):
        """Initialize with an LLM for processing."""
        self.quick_thinking_llm = quick_thinking_llm

    def process_signal(self, full_signal: str) -> str:
        """
        Process a full trading signal to extract the core decision.

        Args:
            full_signal: Complete trading signal text

        Returns:
            Extracted decision (BUY, SELL, or HOLD)
        """
        if not full_signal:
            return "HOLD"

        decision = _extract_decision_keyword(full_signal)
        if decision and decision != "UNKNOWN":
            return decision

        messages = [
            (
                "system",
                get_prompt("signal_extractor_system", config=get_config()),
            ),
            ("human", full_signal),
        ]

        response = str(self.quick_thinking_llm.invoke(messages).content).strip().upper()
        if response in {"BUY", "SELL", "HOLD"}:
            return response
        return "HOLD"


def _extract_decision_keyword(text: str) -> str | None:
    """Rule-based decision extraction to keep UI consistent with final decision text."""
    upper = text.upper()

    def parse_verdict_direction(raw_text: str) -> str | None:
        match = re.search(r"<!--\s*VERDICT:\s*(\{.*?\})\s*-->", raw_text, re.IGNORECASE | re.DOTALL)
        if not match:
            return None
        try:
            payload = json.loads(match.group(1))
        except Exception:
            return None
        direction = str(payload.get("direction", "")).strip().upper()
        direction_map = {
            "看多": "BUY",
            "偏多": "BUY",
            "BULLISH": "BUY",
            "BUY": "BUY",
            "看空": "SELL",
            "偏空": "SELL",
            "BEARISH": "SELL",
            "SELL": "SELL",
            "中性": "HOLD",
            "NEUTRAL": "HOLD",
            "HOLD": "HOLD",
            "谨慎": "HOLD",
            "CAUTIOUS": "HOLD",
        }
        return direction_map.get(direction)

    def classify(snippet: str) -> str | None:
        snippet_upper = snippet.upper()

        # Detect buy-side negation: "不建议买入", "建议不要买入", "不宜建仓", etc.
        buy_neg_pattern = re.compile(
            r'(?:不|暂不|不宜|切勿|不要|别|勿|不可)\s{0,2}'
            r'(?:建议|推荐|适合|应该|能)?\s{0,2}'
            r'(?:买入|建仓|增持|做多)'
            r'|'
            r'(?:建议|推荐)\s{0,2}.{0,4}'
            r'(?:不要|不宜|别|勿|不可)\s{0,2}'
            r'(?:买入|建仓|增持|做多)'
        )
        # Detect sell-side negation: "不建议卖出", "建议不要减持", etc.
        sell_neg_pattern = re.compile(
            r'(?:不|暂不|不宜|切勿|不要|别|勿)\s{0,2}'
            r'(?:建议|推荐)?\s{0,2}'
            r'(?:卖出|减持|清仓)'
            r'|'
            r'(?:建议|推荐)\s{0,2}.{0,4}'
            r'(?:不要|不宜|别|勿)\s{0,2}'
            r'(?:卖出|减持|清仓)'
        )
        buy_negated = bool(buy_neg_pattern.search(snippet))
        sell_negated = bool(sell_neg_pattern.search(snippet))

        # Use phrase-based patterns for higher precision.
        # Only skip a side if that specific side is negated.
        # Use .{0,6} (not \s{0,2}) because Chinese adverbs like 适量/分批/逢低
        # are not whitespace and commonly appear between advice verbs and action verbs.
        buy_phrases = [
            r'(?:建议|推荐|可|可以|宜|考虑)\s{0,2}.{0,6}(?:买入|建仓|增持|做多)',
            r'最终(?:裁决|建议)[：:]\s*.{0,6}(?:买入|BUY|做多|增持)',
            r'方向[：:]\s*.{0,6}(?:买入|BUY|做多|增持)',
        ]
        if not buy_negated:
            for pat in buy_phrases:
                if re.search(pat, snippet):
                    return "BUY"

        sell_phrases = [
            r'(?:建议|推荐|可|可以|宜|考虑)\s{0,2}.{0,6}(?:卖出|减持|清仓|空仓)',
            r'最终(?:裁决|建议)[：:]\s*.{0,6}(?:卖出|SELL|减持|空仓)',
            r'方向[：:]\s*.{0,6}(?:卖出|SELL|减持)',
        ]
        if not sell_negated:
            for pat in sell_phrases:
                if re.search(pat, snippet):
                    return "SELL"

        # Fall back to simple keyword match.
        # Exclude descriptive terms ("看多"/"看空"/"偏多"/"偏空") —
        # they describe market conditions, not trading decisions.
        buy_keywords = ["BUY", "谨慎看多"]
        sell_keywords = ["SELL", "清仓", "空仓"]
        hold_keywords = ["HOLD", "观望", "持有", "中性"]

        if any(k in snippet_upper for k in buy_keywords):
            return "BUY"
        if any(k in snippet_upper for k in sell_keywords):
            return "SELL"
        if any(k in snippet_upper for k in hold_keywords):
            return "HOLD"
        return None

    verdict_decision = parse_verdict_direction(text)
    if verdict_decision:
        return verdict_decision

    explicit_patterns = [
        r"最终裁决[:：]\s*(.+?)(?:\n|$)",
        r"风控委员会最终裁决[:：]\s*(.+?)(?:\n|$)",
        r"最终建议[:：]\s*(.+?)(?:\n|$)",
        r"方向[:：]\s*(.+?)(?:\n|$)",
        r"核心定性[:：]\s*(.+?)(?:\n|$)",
    ]
    for pattern in explicit_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            decision = classify(match.group(1).strip())
            if decision:
                return decision

    headline = "\n".join(text.splitlines()[:20])
    decision = classify(headline)
    if decision:
        return decision

    decision = classify(upper)
    if decision:
        return decision

    return "UNKNOWN"
