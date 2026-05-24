import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useTokenUsageStore } from '@/stores/tokenUsageStore'
import type { ModelPricing } from '@/types'

const PRESET_PRICING: ModelPricing[] = [
    { modelId: 'gpt-4o', providerId: 'openai', displayName: 'GPT-4o', inputPricePer1M: 2.50, outputPricePer1M: 10.00 },
    { modelId: 'gpt-4o-mini', providerId: 'openai', displayName: 'GPT-4o Mini', inputPricePer1M: 0.15, outputPricePer1M: 0.60 },
    { modelId: 'gpt-4.1', providerId: 'openai', displayName: 'GPT-4.1', inputPricePer1M: 2.00, outputPricePer1M: 8.00 },
    { modelId: 'gpt-4.1-mini', providerId: 'openai', displayName: 'GPT-4.1 Mini', inputPricePer1M: 0.40, outputPricePer1M: 1.60 },
    { modelId: 'gpt-5', providerId: 'openai', displayName: 'GPT-5', inputPricePer1M: 2.50, outputPricePer1M: 10.00 },
    { modelId: 'claude-sonnet-4-20250514', providerId: 'anthropic', displayName: 'Claude Sonnet 4', inputPricePer1M: 3.00, outputPricePer1M: 15.00 },
    { modelId: 'claude-opus-4-20250514', providerId: 'anthropic', displayName: 'Claude Opus 4', inputPricePer1M: 15.00, outputPricePer1M: 75.00 },
    { modelId: 'claude-3-5-haiku-20241022', providerId: 'anthropic', displayName: 'Claude 3.5 Haiku', inputPricePer1M: 0.80, outputPricePer1M: 4.00 },
    { modelId: 'deepseek-chat', providerId: 'deepseek', displayName: 'DeepSeek V3', inputPricePer1M: 0.27, outputPricePer1M: 1.10 },
    { modelId: 'deepseek-reasoner', providerId: 'deepseek', displayName: 'DeepSeek R1', inputPricePer1M: 0.55, outputPricePer1M: 2.19 },
    { modelId: 'gemini-2.5-pro', providerId: 'google', displayName: 'Gemini 2.5 Pro', inputPricePer1M: 2.50, outputPricePer1M: 10.00 },
    { modelId: 'gemini-2.5-flash', providerId: 'google', displayName: 'Gemini 2.5 Flash', inputPricePer1M: 0.15, outputPricePer1M: 0.60 },
    { modelId: 'qwen-turbo', providerId: 'dashscope', displayName: 'Qwen Turbo', inputPricePer1M: 0.30, outputPricePer1M: 0.60 },
    { modelId: 'qwen-plus', providerId: 'dashscope', displayName: 'Qwen Plus', inputPricePer1M: 0.80, outputPricePer1M: 2.00 },
    { modelId: 'moonshot-v1-8k', providerId: 'moonshot', displayName: 'Moonshot v1', inputPricePer1M: 12.00, outputPricePer1M: 12.00 },
    { modelId: 'glm-4', providerId: 'zhipu', displayName: 'GLM-4', inputPricePer1M: 50.00, outputPricePer1M: 50.00 },
]

function emptyPricing(): ModelPricing {
    return { modelId: '', providerId: 'custom', displayName: '', inputPricePer1M: 0, outputPricePer1M: 0 }
}

export default function PricingConfigModal() {
    const { configModalOpen, setConfigModalOpen, pricingConfig, setPricingConfig, currency, setCurrency } =
        useTokenUsageStore()

    const [editing, setEditing] = useState<ModelPricing[]>(() =>
        pricingConfig.length > 0 ? [...pricingConfig] : []
    )

    useEffect(() => {
        if (configModalOpen) {
            setEditing(pricingConfig.length > 0 ? [...pricingConfig] : [])
        }
    }, [configModalOpen, pricingConfig])

    const handleSave = useCallback(() => {
        const valid = editing.filter(
            (m) => m.displayName.trim() && m.inputPricePer1M >= 0 && m.outputPricePer1M >= 0
        )
        setPricingConfig(valid)
        setConfigModalOpen(false)
    }, [editing, setPricingConfig, setConfigModalOpen])

    const handleAddPreset = useCallback(
        (preset: ModelPricing) => {
            setEditing((prev) => {
                if (prev.some((m) => m.modelId === preset.modelId && m.providerId === preset.providerId)) {
                    return prev
                }
                return [...prev, { ...preset }]
            })
        },
        []
    )

    const handleRemove = useCallback((index: number) => {
        setEditing((prev) => prev.filter((_, i) => i !== index))
    }, [])

    const handleChange = useCallback(
        (index: number, field: keyof ModelPricing, value: string | number) => {
            setEditing((prev) =>
                prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
            )
        },
        []
    )

    const handleAddCustom = useCallback(() => {
        setEditing((prev) => [...prev, emptyPricing()])
    }, [])

    if (!configModalOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setConfigModalOpen(false)}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">模型价格配置</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            配置后可在 Token 面板查看费用估算
                        </p>
                    </div>
                    <button
                        onClick={() => setConfigModalOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Currency selector */}
                <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">币种：</span>
                    {(['CNY', 'USD'] as const).map((c) => (
                        <button
                            key={c}
                            onClick={() => setCurrency(c)}
                            className={`px-3 py-1 rounded-md border transition-colors ${
                                currency === c
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {c === 'CNY' ? '¥ 人民币' : '$ 美元'}
                        </button>
                    ))}
                </div>

                {/* Preset quick-add */}
                <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">快速添加常见模型</p>
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                        {PRESET_PRICING.map((preset) => {
                            const added = editing.some(
                                (m) => m.modelId === preset.modelId && m.providerId === preset.providerId
                            )
                            return (
                                <button
                                    key={`${preset.providerId}:${preset.modelId}`}
                                    onClick={() => !added && handleAddPreset(preset)}
                                    disabled={added}
                                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                        added
                                            ? 'border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600'
                                    }`}
                                >
                                    {preset.displayName}
                                    {added && ' ✓'}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Editing list */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                    {editing.length === 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                            尚未配置模型价格，点击上方预设或下方按钮添加
                        </p>
                    )}
                    {editing.map((model, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700/50"
                        >
                            <input
                                type="text"
                                placeholder="模型名称"
                                value={model.displayName}
                                onChange={(e) => handleChange(index, 'displayName', e.target.value)}
                                className="flex-1 bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50 min-w-0"
                            />
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                                <span>输入</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={model.inputPricePer1M || ''}
                                    onChange={(e) =>
                                        handleChange(index, 'inputPricePer1M', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-16 bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                />
                                <span>/1M</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                                <span>输出</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={model.outputPricePer1M || ''}
                                    onChange={(e) =>
                                        handleChange(index, 'outputPricePer1M', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-16 bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                />
                                <span>/1M</span>
                            </div>
                            <button
                                onClick={() => handleRemove(index)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={handleAddCustom}
                        className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        添加自定义模型
                    </button>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-end gap-2">
                    <button
                        onClick={() => setConfigModalOpen(false)}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white transition-colors"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    )
}
