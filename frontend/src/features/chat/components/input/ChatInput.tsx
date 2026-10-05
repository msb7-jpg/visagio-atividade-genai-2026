import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CommandPill } from '@/features/chat/components/input/CommandPill'
import { SlashCommandMenu } from '@/features/chat/components/input/SlashCommandMenu'
import { useSlashCommandsController } from '@/features/chat/components/input/useSlashCommandsController'
import { cn } from '@/lib/utils'
import { ArrowUp, Pause, Plus } from 'lucide-react'
import type { JSX } from 'react'

/**
 * Propriedades do campo de entrada de mensagens do chat.
 */
export interface ChatInputProps {
  /** Callback executado ao submeter o texto digitado pelo usuário. */
  onSendMessage: (message: string) => void
  /** Callback executado para interromper e cancelar a transmissão da resposta em andamento. */
  onAbortStream?: () => void
  /** Indica se o assistente está gerando resposta ativamente, bloqueando novos disparos e exibindo botão de pausa. */
  isStreaming: boolean
  /** Bloqueia o input de texto e envio mesmo que não haja streaming local ativo (ex: lock de outra conversa). */
  disabled?: boolean
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Caixa de texto flutuante com suporte a submissão via teclado (Enter), menu popover de slash commands
 * e botões contextuais de ação.
 *
 * @param props - Propriedades de controle e callbacks de envio e aborto.
 * @returns Elemento JSX do campo de texto com autocomplete de comandos.
 */
export function ChatInput({
  onSendMessage,
  onAbortStream,
  isStreaming,
  disabled = false,
  className
}: ChatInputProps): JSX.Element {
  const isInputDisabled = disabled || isStreaming

  const {
    text,
    activeCommand,
    isMenuOpenExplicit,
    selectedIndex,
    filteredCommands,
    showCommandMenu,
    hasContentToSend,
    containerRef,
    inputRef,
    registerItemRef,
    toggleMenu,
    setSelectedIndex,
    selectCommand,
    clearActiveCommand,
    handleInputChange,
    handleKeyDown,
    handleSend
  } = useSlashCommandsController({
    onSendMessage,
    isDisabled: isInputDisabled
  })

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-2xl border border-border bg-sidebar/80 p-2 shadow-xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50',
        className
      )}
    >
      {/* Menu flutuante de Slash Commands */}
      {showCommandMenu ? (
        <SlashCommandMenu
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          onRegisterItemRef={registerItemRef}
          onSelectCommand={selectCommand}
          onHoverIndex={setSelectedIndex}
        />
      ) : null}

      <div className="flex items-center gap-2">
        {/* Botão interativo Plus (+) para abrir comandos */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isInputDisabled}
          onClick={toggleMenu}
          aria-label="Abrir comandos rápidos"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isMenuOpenExplicit && 'rotate-45 text-primary'
            )}
          />
        </Button>

        {/* Pill destacada quando um comando estiver ativo */}
        {activeCommand ? (
          <CommandPill
            command={activeCommand}
            onRemove={clearActiveCommand}
          />
        ) : null}

        <Input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeCommand
              ? 'Digite a pergunta ou parâmetros do comando...'
              : 'Faça uma pergunta ou clique em + para comandos...'
          }
          disabled={isInputDisabled}
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
            disabled={!hasContentToSend || isInputDisabled}
            aria-label="Enviar mensagem"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
