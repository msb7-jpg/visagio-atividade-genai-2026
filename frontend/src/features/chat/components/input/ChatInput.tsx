import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { SlashCommandDefinition } from '@/features/chat/types/chat.types'
import {
  ArrowUp,
  BarChart3,
  Pause,
  Plus,
  Trash2,
  X,
  type LucideIcon
} from 'lucide-react'
import { useState, useEffect, useRef, type JSX, type KeyboardEvent } from 'react'

/**
 * Definição descritiva de cada slash command no menu de sugestão rápida.
 */
interface SlashCommandItem extends SlashCommandDefinition {
  icon: LucideIcon
}

const AVAILABLE_SLASH_COMMANDS: SlashCommandItem[] = [
  {
    name: '/chart',
    label: '/chart',
    description: 'Força geração de gráfico visual (ex: /chart bar, /chart line)',
    icon: BarChart3
  },
  {
    name: '/clear',
    label: '/clear',
    description: 'Limpa a conversa e inicia uma nova thread',
    icon: Trash2
  }
]

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
 * e botões de ação contextual.
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
  const [text, setText] = useState('')
  const [activeCommand, setActiveCommand] = useState<string | null>(null)
  const [isMenuOpenExplicit, setIsMenuOpenExplicit] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const isInputDisabled = disabled || isStreaming

  const isCommandTriggered = text.startsWith('/') && !text.includes(' ')
  const filteredCommands = isCommandTriggered
    ? AVAILABLE_SLASH_COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(text.toLowerCase()))
    : AVAILABLE_SLASH_COMMANDS

  const showCommandMenu = (isCommandTriggered || isMenuOpenExplicit) && filteredCommands.length > 0 && !isInputDisabled

  useEffect(() => {
    if (showCommandMenu) {
      const targetElement = itemRefs.current[selectedIndex]
      if (targetElement && typeof targetElement.scrollIntoView === 'function') {
        targetElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex, showCommandMenu])

  const selectCommand = (commandName: string) => {
    setActiveCommand(commandName)
    setText('')
    setIsMenuOpenExplicit(false)
    inputRef.current?.focus()
  }

  const handleSend = () => {
    const trimmedText = text.trim()
    let fullMessage = trimmedText
    if (activeCommand) {
      fullMessage = trimmedText ? `${activeCommand} ${trimmedText}` : activeCommand
    }

    if (!fullMessage || isInputDisabled) return
    onSendMessage(fullMessage)
    setText('')
    setActiveCommand(null)
    setIsMenuOpenExplicit(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showCommandMenu) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
        return
      }
      if (event.key === 'Tab' || (event.key === 'Enter' && !text.trim().includes(' '))) {
        event.preventDefault()
        const chosen = filteredCommands[selectedIndex] || filteredCommands[0]
        if (chosen) {
          selectCommand(chosen.name)
        }
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMenuOpenExplicit(false)
        if (isCommandTriggered) {
          setText('')
        }
        return
      }
    }

    if (event.key === 'Backspace' && !text && activeCommand) {
      event.preventDefault()
      setActiveCommand(null)
      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const hasContentToSend = Boolean(activeCommand || text.trim())

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border bg-sidebar/80 p-2 shadow-xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50',
        className
      )}
    >
      {/* Menu flutuante de Slash Commands */}
      {showCommandMenu ? (
        <div
          data-testid="slash-command-menu"
          className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 z-50"
        >
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            Comandos Rápidos
          </div>
          <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
            {filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon
              const isSelected = idx === selectedIndex
              return (
                <Button
                  key={cmd.name}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectCommand(cmd.name)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex w-full items-center justify-start gap-2.5 h-auto rounded-lg px-2.5 py-2 text-left text-xs font-normal whitespace-normal transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-foreground hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border',
                      isSelected
                        ? 'border-primary/30 bg-primary/20 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono font-semibold">{cmd.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {cmd.description}
                    </span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {/* Botão interativo Plus (+) para abrir comandos */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isInputDisabled}
          onClick={() => setIsMenuOpenExplicit((prev) => !prev)}
          aria-label="Abrir comandos rápidos"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className={cn('h-4 w-4 transition-transform duration-200', isMenuOpenExplicit && 'rotate-45 text-primary')} />
        </Button>

        {/* Pill destacada com primary bem vivo quando um comando estiver ativo */}
        {activeCommand ? (
          <div
            data-testid="input-command-pill"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/20 px-3 py-1 text-xs font-mono font-semibold text-primary shrink-0 select-none shadow-xs animate-in fade-in zoom-in-95"
          >
            <span>{activeCommand}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActiveCommand(null)}
              aria-label={`Remover comando ${activeCommand}`}
              className="h-4 w-4 rounded-full p-0 text-primary/70 hover:text-primary hover:bg-primary/30 transition-colors"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : null}

        <Input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => {
            const val = event.target.value
            // Se o usuário digitou um comando seguido de espaço (ex: '/chart '), converte para a pill
            if (val.startsWith('/') && val.includes(' ')) {
              const [cmdPart, ...rest] = val.split(' ')
              const matched = AVAILABLE_SLASH_COMMANDS.find((cmd) => cmd.name.toLowerCase() === cmdPart.toLowerCase())
              if (matched) {
                setActiveCommand(matched.name)
                setText(rest.join(' '))
                return
              }
            }
            setText(val)
            setSelectedIndex(0)
          }}
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
