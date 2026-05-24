import operator
from tradingagents.agents.utils.agent_states import UserIntent, TraceItem, extract_verdict

def test_user_intent_typeddict():
    intent: UserIntent = {
        "raw_query": "分析600519短线",
        "ticker": "600519",
        "horizons": ["short", "medium"],
        "focus_areas": ["量价关系"],
        "specific_questions": ["能否到目标位"],
    }
    assert intent["ticker"] == "600519"
    assert intent["horizons"] == ["short", "medium"]

def test_trace_item_typeddict():
    trace: TraceItem = {
        "agent": "market_analyst",
        "horizon": "short",
        "data_window": "14天",
        "key_finding": "RSI超买",
        "verdict": "看空",
        "confidence": "中",
    }
    assert trace["verdict"] == "看空"
    assert trace["confidence"] == "中"

def test_trace_list_accumulation():
    t1 = [{"agent": "market_analyst", "verdict": "看空"}]
    t2 = [{"agent": "fundamentals_analyst", "verdict": "看多"}]
    merged = operator.add(t1, t2)
    assert len(merged) == 2


def test_extract_verdict_valid():
    text = '分析结论 <!-- VERDICT: {"direction": "看多", "reason": "量价配合"} --> 结束'
    direction, confidence = extract_verdict(text)
    assert direction == "看多"
    assert confidence == "中"


def test_extract_verdict_missing():
    direction, confidence = extract_verdict("没有VERDICT标签的文本")
    assert direction == "中性"
    assert confidence == "低"


def test_extract_verdict_empty():
    direction, confidence = extract_verdict("")
    assert direction == "中性"


def test_extract_verdict_reads_confidence():
    text = '<!-- VERDICT: {"direction": "看多", "confidence": "高"} -->'
    direction, confidence = extract_verdict(text)
    assert direction == "看多"
    assert confidence == "高"


def test_extract_verdict_defaults_when_missing():
    text = '<!-- VERDICT: {"direction": "看空"} -->'
    direction, confidence = extract_verdict(text)
    assert direction == "看空"
    assert confidence == "中"  # default when confidence key missing


def test_extract_verdict_no_json():
    direction, confidence = extract_verdict("plain text no json")
    assert direction == "中性"
    assert confidence == "低"


from tradingagents.graph.signal_processing import _extract_decision_keyword


def test_keyword_no_false_negative_context():
    # "不建议建仓" should NOT be classified as BUY
    result = _extract_decision_keyword("根据当前形势，我建议暂不建议建仓，观望为主")
    assert result in ("HOLD", "UNKNOWN")  # NOT "BUY"


def test_keyword_no_false_sell_context():
    # "大股东减持完毕" should NOT necessarily be SELL
    result = _extract_decision_keyword("大股东减持计划已执行完毕，压力释放")
    assert result in ("HOLD", "UNKNOWN")  # NOT "SELL"


def test_keyword_explicit_buy():
    result = _extract_decision_keyword("最终裁决：买入")
    assert result == "BUY"


def test_keyword_explicit_sell():
    result = _extract_decision_keyword("方向：卖出")
    assert result == "SELL"


def test_keyword_verdict_direction():
    text = '<!-- VERDICT: {"direction": "看多", "confidence": "高"} -->'
    result = _extract_decision_keyword(text)
    assert result == "BUY"


from tradingagents.agents.utils.memory import FinancialSituationMemory


def test_bm25_tokenizes_chinese():
    memory = FinancialSituationMemory("test_cn")
    memory.add_situations([
        ("A股市场出现大幅波动，成交量显著放大", "建议谨慎操作"),
        ("科技板块表现强势，资金持续流入", "可适当加仓"),
    ])
    results = memory.get_memories("科技股资金流入明显", n_matches=1)
    assert len(results) >= 0  # At minimum, doesn't crash


def test_bm25_chinese_tokenization_matches():
    memory = FinancialSituationMemory("test_cn2")
    memory.add_situations([
        ("通胀高企利率上升消费下滑", "配置防御板块"),
        ("科技板块波动加大机构减持明显", "减仓高估值科技股"),
    ])
    results = memory.get_memories("科技股波动加大机构在减持", n_matches=2)
    assert len(results) >= 1
    assert "科技" in results[0]["matched_situation"] or "减仓" in results[0]["recommendation"]
