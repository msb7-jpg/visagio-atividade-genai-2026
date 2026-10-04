import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ArrowUp, Pause, Sparkles } from 'lucide-react'
import { useState, type JSX, type KeyboardEvent } from 'react'

/**
 * Propriedades do campo de entrada de mensagens do chat.
 */
export interface ChatInputProps {
  /** Callback executado ao submeter o texto digitado pelo usuário. */
  onSendMessage: (message: string) => void
  /** Callback executado para interromper e cancelar a transmissão da resposta em andamento. */
  onAbortStream?: () => void
  /** Indica se o assistente está gerando resposta ativamente, bloqueando novos disparos. */
  isStreaming: boolean
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Caixa de texto flutuante com suporte a submissão via teclado (Enter) e botão de envio ou cancelamento.
 *
 * @param props - Propriedades de controle e callbacks de envio e aborto.
 * @returns Elemento JSX do campo de texto com botão de ação contextual.
 */
export function ChatInput({
  onSendMessage,
  onAbortStream,
  isStreaming,
  className
}: ChatInputProps): JSX.Element {
  const [text, setText] = useState('')

  const handleSend = () => {
    if (!text.trim() || isStreaming) return
    onSendMessage(text)
    setText('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border bg-sidebar/80 p-2 shadow-xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="pl-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        <Input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Faça uma pergunta sobre bilheterias, diretores ou filmes..."
          disabled={isStreaming}
          className="border-0 bg-transparent px-2 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={onAbortStream}
            aria-label="Cancelar geração"
            className="transition-transform active:scale-95"
          >
            <Pause className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!text.trim()}
            aria-label="Enviar mensagem"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
