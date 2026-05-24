from unittest.mock import MagicMock
from tradingagents.graph.intent_parser import parse_intent, build_horizon_context


def test_parse_intent_returns_defaults():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(
        content='{"ticker": "600519", "horizons": ["short", "medium"], "focus_areas": [], "specific_questions": []}'
    )
    result = parse_intent("分析600519", mock_llm)
    assert result["ticker"] == "600519"
    assert result["horizons"] == ["short", "medium"]
    assert result["focus_areas"] == []


def test_parse_intent_fallback_on_invalid_json():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="这不是JSON")
    result = parse_intent("600519", mock_llm, fallback_ticker="600519")
    assert result["ticker"] == "600519"
    assert result["horizons"] == ["short"]
    assert result["focus_areas"] == []


def test_build_horizon_context_short_contains_label():
    ctx = build_horizon_context("short", ["量价关系"], ["能否突破"])
    assert "短线" in ctx
    assert "量价关系" in ctx
    assert "能否突破" in ctx


def test_build_horizon_context_medium_has_label():
    ctx = build_horizon_context("medium", [], [], agent_type="fundamentals")
    assert "中线" in ctx


def test_build_horizon_context_short_fundamentals_has_downweight_hint():
    ctx = build_horizon_context("short", [], [], agent_type="fundamentals")
    assert "短线" in ctx  # short horizon label is present


def test_parse_intent_respects_parsed_horizon():
    """If LLM returns horizons=['medium'], the output should preserve it."""
    from unittest.mock import MagicMock
    from tradingagents.graph.intent_parser import parse_intent

    class FakeLLM:
        def invoke(self, messages):
            class FakeResult:
                content = '{"ticker": "600519.SH", "horizons": ["medium"], "focus_areas": ["基本面"]}'
            return FakeResult()

    result = parse_intent("分析茅台中线", FakeLLM(), fallback_ticker="600519.SH")
    assert result["horizons"] == ["medium"]
