import { useMemo } from 'react'
import { Coins, ChevronRight, ChevronLeft, X, Settings } from 'lucide-react'
import { useTokenUsageStore } from '@/stores/tokenUsageStore'

function fmtTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toLocaleString()
}

function fmtCost(n: number, currency: string): string {
    const sym = currency === 'CNY' ? '¥' : '$'
    if (n === 0) return '--'
    if (n < 0.001) return sym + n.toFixed(6)
    if (n < 0.01) return sym + n.toFixed(4)
    return sym + n.toFixed(3)
}

export default function TokenUsagePanel() {
    const {
        agents,
        grandTotalTokens,
        grandTotalInputTokens,
        grandTotalOutputTokens,
        pricingConfig,
        currency,
        isPanelExpanded,
        isPanelVisible,
        togglePanel,
        hidePanel,
        showPanel,
        setConfigModalOpen,
        getTotalCost,
    } = useTokenUsageStore()

    const agentList = useMemo(
        () =>
            Object.values(agents).sort(
                (a, b) => b.totalTokens - a.totalTokens
            ),
        [agents]
    )

    const totalCost = useMemo(() => getTotalCost(), [getTotalCost, agents, pricingConfig])
    const hasData = agentList.length > 0
    const hasPricing = pricingConfig.length > 0

    // Hidden state: show tiny edge tab to restore
    if (!isPanelVisible) {
        return (
            <button
                onClick={showPanel}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-30
                           dark bg-slate-900/90 backdrop-blur-md
                           border border-r-0 border-slate-700 rounded-l-lg
                           shadow-lg shadow-black/30
                           px-2 py-3
                           cursor-pointer hover:bg-slate-800 transition-colors
                           flex items-center gap-1"
                title="显示Token用量面板"
            >
                <Coins className="w-4 h-4 text-slate-400" />
                <ChevronLeft className="w-3 h-3 text-slate-500" />
            </button>
        )
    }

    // Collapsed pill
    if (!isPanelExpanded) {
        return (
            <button
                onClick={togglePanel}
                className="fixed bottom-5 right-5 z-30
                           dark bg-slate-900/95 backdrop-blur-md
                           border border-slate-700 rounded-full
                           shadow-lg shadow-black/30
                           px-4 py-2.5
                           flex items-center gap-3
                           cursor-pointer hover:bg-slate-800 transition-colors
                           animate-in slide-in-from-bottom duration-200"
            >
                <Coins className="w-4 h-4 text-blue-400" />
                {hasData ? (
                    <>
                        <span className="text-sm font-mono text-white tabular-nums">
                            {fmtTokens(grandTotalTokens)}
                        </span>
                        {hasPricing && totalCost > 0 && (
                            <span className="text-xs font-mono text-amber-400 tabular-nums">
                                {fmtCost(totalCost, currency)}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-xs text-slate-400">Token 用量</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
        )
    }

    // Expanded card
    return (
        <div
            className="fixed bottom-5 right-5 z-30
                       dark bg-slate-900 border border-slate-700
                       rounded-xl shadow-2xl shadow-black/50
                       w-[360px] max-h-[520px]
                       flex flex-col
                       animate-in slide-in-from-bottom duration-200"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Token 用量</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setConfigModalOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                        title="配置模型价格"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={hidePanel}
                        className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                        title="隐藏面板"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Summary bar */}
            <div className="px-4 py-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                        总计 <span className="font-mono text-white tabular-nums">{fmtTokens(grandTotalTokens)}</span> tokens
                    </span>
                    {hasPricing && (
                        <span className="font-mono text-amber-400 tabular-nums">
                            {fmtCost(totalCost, currency)}
                        </span>
                    )}
                </div>
                <div className="mt-1.5 flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-800">
                    {grandTotalTokens > 0 && (
                        <>
                            <div
                                className="bg-blue-500/70 h-full transition-all"
                                style={{ width: `${Math.max(2, (grandTotalInputTokens / grandTotalTokens) * 100)}%` }}
                            />
                            <div
                                className="bg-emerald-500/70 h-full transition-all"
                                style={{ width: `${Math.max(2, (grandTotalOutputTokens / grandTotalTokens) * 100)}%` }}
                            />
                        </>
                    )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500/70 inline-block" /> 输入
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block" /> 输出
                    </span>
                </div>
            </div>

            {/* Agent list */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                {agentList.map((agent) => {
                    const pctInput =
                        grandTotalTokens > 0
                            ? (agent.inputTokens / agent.totalTokens) * 100
                            : 0
                    const pctOutput =
                        grandTotalTokens > 0
                            ? (agent.outputTokens / agent.totalTokens) * 100
                            : 0
                    return (
                        <div key={agent.agentName} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 truncate max-w-[160px]">
                                    {agent.agentName}
                                </span>
                                <span className="font-mono text-slate-400 tabular-nums">
                                    {fmtTokens(agent.totalTokens)}
                                </span>
                            </div>
                            <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-slate-800">
                                {agent.totalTokens > 0 && (
                                    <>
                                        <div
                                            className="bg-blue-500/60 h-full transition-all"
                                            style={{ width: `${Math.max(2, pctInput)}%` }}
                                        />
                                        <div
                                            className="bg-emerald-500/60 h-full transition-all"
                                            style={{ width: `${Math.max(2, pctOutput)}%` }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
                {!hasData && (
                    <div className="text-xs text-slate-500 text-center py-6">
                        暂无 Token 数据
                        <br />
                        <span className="text-slate-600">启动一次分析后将在此显示用量</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!hasPricing && hasData && (
                <div className="px-4 py-2 border-t border-slate-800 shrink-0">
                    <button
                        onClick={() => setConfigModalOpen(true)}
                        className="w-full text-xs text-slate-400 hover:text-blue-400 transition-colors py-1"
                    >
                        配置模型价格以显示费用估算 →
                    </button>
                </div>
            )}
            {hasPricing && hasData && (
                <div className="px-4 py-2 border-t border-slate-800 shrink-0 flex items-center justify-between text-[10px] text-slate-500">
                    <span>费用基于 {pricingConfig[0]?.displayName || 'custom'} 定价估算</span>
                    <span>1M tokens = {currency === 'CNY' ? '¥' : '$'}{pricingConfig[0]?.inputPricePer1M}/{pricingConfig[0]?.outputPricePer1M}</span>
                </div>
            )}
        </div>
    )
}
