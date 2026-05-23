import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AgentUsage, AgentUsageEvent, ModelPricing } from '@/types'

interface TokenUsageState {
    // Session token counts (transient, not persisted)
    agents: Record<string, AgentUsage>
    grandTotalInputTokens: number
    grandTotalOutputTokens: number
    grandTotalTokens: number
    lastUpdated: string | null

    // Panel UI
    isPanelExpanded: boolean
    isPanelVisible: boolean

    // Pricing config (persisted)
    pricingConfig: ModelPricing[]
    currency: string

    // Actions
    addUsage: (event: AgentUsageEvent) => void
    resetSession: () => void
    togglePanel: () => void
    hidePanel: () => void
    showPanel: () => void
    setPricingConfig: (models: ModelPricing[]) => void
    setCurrency: (currency: string) => void
    getTotalCost: () => number

    // Config modal
    configModalOpen: boolean
    setConfigModalOpen: (open: boolean) => void
}

export const useTokenUsageStore = create<TokenUsageState>()(
    persist(
        (set, get) => ({
            // Session state (transient)
            agents: {},
            grandTotalInputTokens: 0,
            grandTotalOutputTokens: 0,
            grandTotalTokens: 0,
            lastUpdated: null,

            // Panel UI state
            isPanelExpanded: false,
            isPanelVisible: true,

            // Pricing config (persisted)
            pricingConfig: [],
            currency: 'CNY',

            // Config modal
            configModalOpen: false,
            setConfigModalOpen: (open) => set({ configModalOpen: open }),

            addUsage: (event) =>
                set((state) => {
                    const existing = state.agents[event.agent]
                    const entry: AgentUsage = existing
                        ? {
                              ...existing,
                              inputTokens: existing.inputTokens + event.input_tokens,
                              outputTokens: existing.outputTokens + event.output_tokens,
                              totalTokens: existing.totalTokens + event.total_tokens,
                              calls: existing.calls + 1,
                          }
                        : {
                              agentName: event.agent,
                              inputTokens: event.input_tokens,
                              outputTokens: event.output_tokens,
                              totalTokens: event.total_tokens,
                              calls: 1,
                          }
                    return {
                        agents: { ...state.agents, [event.agent]: entry },
                        grandTotalInputTokens: state.grandTotalInputTokens + event.input_tokens,
                        grandTotalOutputTokens: state.grandTotalOutputTokens + event.output_tokens,
                        grandTotalTokens: state.grandTotalTokens + event.total_tokens,
                        lastUpdated: new Date().toISOString(),
                    }
                }),

            resetSession: () =>
                set({
                    agents: {},
                    grandTotalInputTokens: 0,
                    grandTotalOutputTokens: 0,
                    grandTotalTokens: 0,
                    lastUpdated: null,
                }),

            togglePanel: () => set((s) => ({ isPanelExpanded: !s.isPanelExpanded })),
            hidePanel: () => set({ isPanelVisible: false, isPanelExpanded: false }),
            showPanel: () => set({ isPanelVisible: true }),

            setPricingConfig: (models) => set({ pricingConfig: models }),
            setCurrency: (currency) => set({ currency }),

            getTotalCost: () => {
                const state = get()
                if (state.pricingConfig.length === 0) return 0
                let totalCost = 0
                const pricing = state.pricingConfig[0]
                for (const agent of Object.values(state.agents)) {
                    totalCost += (agent.inputTokens / 1_000_000) * pricing.inputPricePer1M
                    totalCost += (agent.outputTokens / 1_000_000) * pricing.outputPricePer1M
                }
                return totalCost
            },
        }),
        {
            name: 'tradingagents-token-usage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                pricingConfig: state.pricingConfig,
                currency: state.currency,
                isPanelVisible: state.isPanelVisible,
            }),
            merge: (persisted, current) => ({
                ...current,
                ...(persisted as Partial<TokenUsageState>),
                // Session data always fresh
                agents: {},
                grandTotalInputTokens: 0,
                grandTotalOutputTokens: 0,
                grandTotalTokens: 0,
                lastUpdated: null,
            }),
        }
    )
)
