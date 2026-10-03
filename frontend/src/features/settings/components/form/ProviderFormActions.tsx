import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { BookmarkCheck } from 'lucide-react'

interface ProviderFormActionsProps {
  isTesting: boolean
  isUpdating: boolean
  isClosing?: boolean
  isStreaming?: boolean
  onTestConnection: () => void
}

export function ProviderFormActions({
  isTesting,
  isUpdating,
  isClosing,
  isStreaming,
  onTestConnection
}: ProviderFormActionsProps) {
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
