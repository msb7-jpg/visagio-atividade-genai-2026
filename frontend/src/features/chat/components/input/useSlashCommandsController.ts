import type { SlashCommandDefinition } from '@/features/chat/types/chat.types'
import { useClickOutside } from '@reactuses/core'
import { BarChart3, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

/**
 * Definição descritiva de cada slash command no menu de sugestão rápida.
 */
export interface SlashCommandItem extends SlashCommandDefinition {
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
 * Propriedades de entrada para o controlador de slash commands do input.
 */
export interface UseSlashCommandsControllerOptions {
  /** Callback para submissão da mensagem montada. */
  onSendMessage: (message: string) => void
  /** Indica se o input está bloqueado para interação. */
  isDisabled: boolean
}

/**
 * Objeto com os estados e manipuladores do controlador headless de slash commands.
 */
export interface UseSlashCommandsControllerResult {
  /** Texto bruto atualmente digitado no campo de input. */
  text: string
  /** Comando de barra atualmente ativo como prefixo (ex: /chart). */
  activeCommand: string | null
  /** Flag indicando se o menu foi explicitamente aberto pelo botão Plus (+). */
  isMenuOpenExplicit: boolean
  /** Índice do comando atualmente focalizado na lista suspensa. */
  selectedIndex: number
  /** Lista filtrada de comandos de acordo com o texto digitado. */
  filteredCommands: SlashCommandItem[]
  /** Flag booleana indicando se o menu suspenso deve ser exibido. */
  showCommandMenu: boolean
  /** Indica se há comando ou texto preenchido elegível para envio. */
  hasContentToSend: boolean
  /** Referência ao elemento container para detecção de clique externo. */
  containerRef: RefObject<HTMLDivElement | null>
  /** Referência ao campo de texto HTML. */
  inputRef: RefObject<HTMLInputElement | null>
  /** Referência aos elementos de botão do menu para auto-scroll. */
  itemRefs: RefObject<(HTMLButtonElement | null)[]>
  /** Registra a referência do elemento do botão no índice especificado. */
  registerItemRef: (index: number, element: HTMLButtonElement | null) => void
  /** Alterna a abertura explícita do menu pelo botão Plus (+). */
  toggleMenu: () => void
  /** Força a alteração do índice focalizado no menu (ex.: onMouseEnter). */
  setSelectedIndex: (index: number) => void
  /** Seleciona um comando pelo nome e move o foco para o input. */
  selectCommand: (commandName: string) => void
  /** Remove o comando ativo da pill. */
  clearActiveCommand: () => void
  /** Manipula a digitação de texto com suporte à conversão automática para pill. */
  handleInputChange: (val: string) => void
  /** Manipula eventos de teclado como atalhos, navegação por setas e Enter. */
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  /** Dispara o envio da mensagem consolidando comando e texto. */
  handleSend: () => void
}

interface MenuNavContext {
  onNavigateDown: () => void
  onNavigateUp: () => void
  onSelect: () => void
  onDismiss: () => void
}

function handleMenuKeyNavigation(
  key: string,
  event: KeyboardEvent<HTMLInputElement>,
  hasSpaceInText: boolean,
  ctx: MenuNavContext
): boolean {
  if (key === 'ArrowDown') {
    event.preventDefault()
    ctx.onNavigateDown()
    return true
  }
  if (key === 'ArrowUp') {
    event.preventDefault()
    ctx.onNavigateUp()
    return true
  }
  if (key === 'Tab' || (key === 'Enter' && !hasSpaceInText)) {
    event.preventDefault()
    ctx.onSelect()
    return true
  }
  if (key === 'Escape') {
    event.preventDefault()
    ctx.onDismiss()
    return true
  }
  return false
}

/**
 * Hook headless especialista que gerencia o ciclo de vida, autocomplete e navegação
 * de comandos de barra (slash commands) no chat input.
 *
 * @param options - Callbacks e flags de desabilitação.
 * @returns Estados reativos e manipuladores de evento de teclado/mouse.
 */
export function useSlashCommandsController({
  onSendMessage,
  isDisabled
}: UseSlashCommandsControllerOptions): UseSlashCommandsControllerResult {
  const [text, setText] = useState('')
  const [activeCommand, setActiveCommand] = useState<string | null>(null)
  const [isMenuOpenExplicit, setIsMenuOpenExplicit] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Fecha o menu de comandos ao clicar fora do container do input via @reactuses/core
  useClickOutside(containerRef, () => {
    setIsMenuOpenExplicit(false)
  })

  const isCommandTriggered = text.startsWith('/') && !text.includes(' ')
  const filteredCommands = isCommandTriggered
    ? AVAILABLE_SLASH_COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(text.toLowerCase()))
    : AVAILABLE_SLASH_COMMANDS

  const showCommandMenu = (isCommandTriggered || isMenuOpenExplicit) && filteredCommands.length > 0 && !isDisabled

  useEffect(() => {
    if (showCommandMenu) {
      const targetElement = itemsRef.current[selectedIndex]
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

  const clearActiveCommand = () => {
    setActiveCommand(null)
  }

  const registerItemRef = (index: number, element: HTMLButtonElement | null) => {
    itemsRef.current[index] = element
  }

  const toggleMenu = () => {
    setIsMenuOpenExplicit((prev) => !prev)
  }

  const handleInputChange = (val: string) => {
    // Se o usuário digitou um comando seguido de espaço (ex: '/chart '), converte para a pill
    if (val.startsWith('/') && val.includes(' ')) {
      const [cmdPart, ...rest] = val.split(' ')
      const matched = AVAILABLE_SLASH_COMMANDS.find(
        (cmd) => cmd.name.toLowerCase() === cmdPart.toLowerCase()
      )
      if (matched) {
        setActiveCommand(matched.name)
        setText(rest.join(' '))
        return
      }
    }
    setText(val)
    setSelectedIndex(0)
  }

  const handleSend = () => {
    const trimmedText = text.trim()
    let fullMessage = trimmedText
    if (activeCommand) {
      fullMessage = trimmedText ? `${activeCommand} ${trimmedText}` : activeCommand
    }

    if (!fullMessage || isDisabled) return
    onSendMessage(fullMessage)
    setText('')
    setActiveCommand(null)
    setIsMenuOpenExplicit(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showCommandMenu) {
      const handled = handleMenuKeyNavigation(
        event.key,
        event,
        text.trim().includes(' '),
        {
          onNavigateDown: () => setSelectedIndex((prev) => (prev + 1) % filteredCommands.length),
          onNavigateUp: () => setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length),
          onSelect: () => {
            const chosen = filteredCommands[selectedIndex] || filteredCommands[0]
            if (chosen) {
              selectCommand(chosen.name)
            }
          },
          onDismiss: () => {
            setIsMenuOpenExplicit(false)
            if (isCommandTriggered) {
              setText('')
            }
          }
        }
      )
      if (handled) return
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

  return {
    text,
    activeCommand,
    isMenuOpenExplicit,
    selectedIndex,
    filteredCommands,
    showCommandMenu,
    hasContentToSend,
    containerRef,
    inputRef,
    itemRefs: itemsRef,
    registerItemRef,
    toggleMenu,
    setSelectedIndex,
    selectCommand,
    clearActiveCommand,
    handleInputChange,
    handleKeyDown,
    handleSend
  }
}
