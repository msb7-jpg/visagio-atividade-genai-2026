import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PROVIDER_METADATA } from '../../constants/providerDefaults'
import type { ProviderConfig, ProviderType } from '../../schemas/settings.schema'

interface ProviderCardGridProps {
  selectedProvider: ProviderType
  initialConfig: ProviderConfig
  savedProviders: string[]
  savedConfigs: Record<string, Partial<ProviderConfig>>
  isStreaming?: boolean
  onSelect: (provider: ProviderType) => void
}

export function ProviderCardGrid({
  selectedProvider,
  initialConfig,
  savedProviders,
  savedConfigs,
  isStreaming,
  onSelect
}: ProviderCardGridProps) {
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
              onClick={() => onSelect(prov)}
              data-testid={`provider-option-${prov}`}
              className={cn('p-3 relative', isStreaming ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className={isSelected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">{info.name}</span>
                    <span className={cn('text-[11px] block truncate max-w-[130px] font-mono', configuredModel ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                      {configuredModel || 'Não configurado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <span data-testid={`active-badge-${prov}`} className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary">
                      Ativo
                    </span>
                  ) : null}
                  {isSaved && !isActive ? (
                    <span data-testid={`saved-badge-${prov}`} className="text-[11px] font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">
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
