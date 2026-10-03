import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { BookmarkCheck } from 'lucide-react'
import type { JSX } from 'react'

/**
 * Propriedades para a barra de ações do formulário de provedores.
 */
export interface ProviderFormActionsProps {
  /** Indica se o teste de conexão está em andamento. */
  isTesting: boolean
  /** Indica se a mutação de salvamento está em andamento. */
  isUpdating: boolean
  /** Indica se o modal está em animação de fechamento após salvar. */
  isClosing?: boolean
  /** Indica se há geração ativa em streaming bloqueando alterações. */
  isStreaming?: boolean
  /** Callback para disparo manual do teste de conexão. */
  onTestConnection: () => void
}

/**
 * Rodapé do formulário de configurações com botões para testar conexão e salvar preferências.
 *
 * @param props - Propriedades de controle e estado de submissão do formulário.
 * @returns Elemento JSX com os botões de ação e spinners de carregamento.
 */
export function ProviderFormActions({
  isTesting,
  isUpdating,
  isClosing,
  isStreaming,
  onTestConnection
}: ProviderFormActionsProps): JSX.Element {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onTestConnection}
        disabled={isTesting || isUpdating || isStreaming || isClosing}
      >
        {isTesting ? (
          <>
            <Spinner data-icon="inline-start" className="mr-1.5" />
            <span>Testando conexão...</span>
          </>
        ) : (
          <span>Testar Conexão</span>
        )}
      </Button>

      <Button
        type="submit"
        variant="default"
        size="sm"
        disabled={isUpdating || isTesting || isStreaming || isClosing}
      >
        {isUpdating ? (
          <>
            <Spinner data-icon="inline-start" className="mr-1.5" />
            <span>Salvando...</span>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <BookmarkCheck className="h-3.5 w-3.5" />
            <span>Salvar Configuração</span>
          </span>
        )}
      </Button>
    </div>
  )
}
