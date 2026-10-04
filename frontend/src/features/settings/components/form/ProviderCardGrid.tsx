import { SlidingIndicator } from '@/components/animations'
import { Card } from '@/components/ui/card'
import { PROVIDER_METADATA } from '@/features/settings/constants/providerDefaults'
import type { ProviderConfig, ProviderType } from '@/features/settings/schemas/settings.schema'
import { cn } from '@/lib/utils'
import type { JSX } from 'react'

/**
 * Propriedades para a grade de cards de seleção de provedores de LLM.
 */
export interface ProviderCardGridProps {
  /** Provedor atualmente selecionado. */
  selectedProvider: ProviderType
  /** Configuração inicial de provedor. */
  initialConfig: ProviderConfig
  /** Lista de provedores com credenciais já cadastradas no SQLite. */
  savedProviders: string[]
  /** Mapa com configurações salvas por provedor. */
  savedConfigs: Record<string, Partial<ProviderConfig>>
  /** Indica se há geração ativa no momento. */
  isStreaming?: boolean
  /** Callback executado ao clicar em um card de provedor. */
  onSelect: (provider: ProviderType) => void
}

/**
 * Grade visual responsiva de seleção de provedores (Groq, LM Studio/Local, OpenRouter, Google Gemini).
 *
 * @param props - Propriedades contendo o provedor selecionado, configurações e callback de seleção.
 * @returns Elemento JSX com os cards interativos de provedores.
 */
export function ProviderCardGrid({
  selectedProvider,
  initialConfig,
  savedProviders,
  savedConfigs,
  isStreaming,
  onSelect
}: ProviderCardGridProps): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Selecione o Provedor de IA
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(Object.keys(PROVIDER_METADATA) as ProviderType[]).map((prov) => {
          const info = PROVIDER_METADATA[prov]
          const Icon = info.icon
          const isSelected = selectedProvider === prov
          const isSaved = savedProviders.includes(prov)
          const isActive = initialConfig.provider === prov
          const configuredModel = isActive ? initialConfig.model : savedConfigs[prov]?.model

          return (
            <Card
              key={prov}
              selected={isSelected}
              disabled={isStreaming}
              onClick={() => onSelect(prov)}
              data-testid={`provider-option-${prov}`}
              className="p-3 relative overflow-hidden"
            >
              {isSelected ? (
                <SlidingIndicator
                  layoutId="activeProviderIndicator"
                  className="border border-primary/50 bg-primary/5 rounded-xl"
                />
              ) : null}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className={isSelected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">{info.name}</span>
                    <span className={cn('text-xs block truncate max-w-32 font-mono', configuredModel ? 'text-muted-foreground' : 'text-subtle-foreground')}>
                      {configuredModel || 'Não configurado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <span data-testid={`active-badge-${prov}`} className="text-xs font-medium px-2 py-0.5 rounded bg-primary/15 text-primary">
                      Ativo
                    </span>
                  ) : null}
                  {isSaved && !isActive ? (
                    <span data-testid={`saved-badge-${prov}`} className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      Salvo
                    </span>
                  ) : null}
                  {isActive && isSaved ? <span data-testid={`saved-badge-${prov}`} className="sr-only">Salvo</span> : null}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
