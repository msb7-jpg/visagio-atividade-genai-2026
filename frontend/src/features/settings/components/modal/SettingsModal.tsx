import { Button } from '@/components/ui/button'
import { ProviderForm } from '@/features/settings/components/form/ProviderForm'
import { useKeyPress } from '@/hooks/useKeyPress'
import { Sliders, X } from 'lucide-react'
import type { JSX } from 'react'

/**
 * Propriedades para exibição do modal de configurações de provedores de IA.
 */
export interface SettingsModalProps {
  /** Indica se o modal está atualmente aberto na tela. */
  isOpen: boolean
  /** Callback para fechar o modal. */
  onClose: () => void
  /**
   * Indica se há streaming ativo bloqueando edições no momento.
   * @defaultValue `false`
   */
  isStreaming?: boolean
}

/**
 * Modal flutuante de configurações de provedor com backdrop, fechamento por tecla Escape e formulário integrado.
 *
 * @param props - Propriedades de controle de abertura e fechamento do modal.
 * @returns Elemento JSX do modal com backdrop ou nulo se fechado.
 */
export function SettingsModal({ isOpen, onClose, isStreaming }: SettingsModalProps): JSX.Element | null {
  useKeyPress('Escape', onClose)

  if (!isOpen) return null

  return (
    <div
      data-testid="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-lg rounded-xl border border-border bg-sidebar p-6 shadow-2xl space-y-4 max-h-screen overflow-y-auto"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Configurações de IA & Modelos
              </h2>
              <p className="text-xs text-muted-foreground">
                Selecione o provedor ativo para responder suas análises
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar modal de configurações"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Corpo do Formulário */}
        <ProviderForm onSuccess={onClose} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
