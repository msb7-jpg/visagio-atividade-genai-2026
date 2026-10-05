import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Clapperboard,
  Film,
  PanelLeftClose,
  PanelRightOpen,
  Plus,
  Settings,
  SquareArrowOutUpRight
} from 'lucide-react'
import { cloneElement, isValidElement, useState, type ReactNode } from 'react'

/**
 * Propriedades para a estrutura de layout principal da aplicação CineData.
 */
export interface AppLayoutProps {
  /** Conteúdo central da área de trabalho (feed de chat e input). */
  children?: ReactNode
  /** Conteúdo da barra lateral esquerda (histórico de conversas). */
  sidebarContent?: ReactNode
  /** Conteúdo da barra lateral direita (linha do tempo e sumário). */
  rightSidebarContent?: ReactNode
  /** Título animado exibido no cabeçalho superior. */
  headerTitle?: ReactNode
  /** Identificador da thread ativa. */
  activeThreadId?: string | null
  /**
   * Indica se há transmissão de streaming ativa.
   * @defaultValue `false`
   */
  isStreaming?: boolean
  /** Callback para iniciar uma nova conversa vazia. */
  onNewChat?: () => void
  /** Callback para abrir o modal de configurações de IA. */
  onOpenSettings?: () => void
}

interface SidebarBrandProps {
  sidebarOpen: boolean
  onToggle: () => void
}

function SidebarBrand({ sidebarOpen, onToggle }: SidebarBrandProps) {
  return (
    <div
      className={cn(
        'flex items-center px-4 h-14 border-b border-border w-full shrink-0',
        sidebarOpen ? 'justify-between' : 'justify-center'
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggle}
          aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
          title={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4 text-primary" />
          ) : (
            <Clapperboard className="h-4 w-4 text-primary" />
          )}
        </Button>
        {sidebarOpen ? (
          <div
            onClick={onToggle}
            className="cursor-pointer select-none truncate"
            title="Recolher menu lateral"
          >
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              CineData
            </h1>
            <p className="text-xs text-muted-foreground">
              Analytics Agent
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface SidebarNewChatButtonProps {
  sidebarOpen: boolean
  isStreaming: boolean
  onNewChat?: () => void
}

function SidebarNewChatButton({
  sidebarOpen,
  isStreaming,
  onNewChat
}: SidebarNewChatButtonProps) {
  return (
    <div className="p-3 w-full flex justify-center [&>button]:w-full">
      {sidebarOpen ? (
        <Button
          variant="outline"
          size="default"
          onClick={onNewChat}
          disabled={isStreaming}
          aria-label="Novo Chat"
          title={isStreaming ? 'Aguarde a resposta em andamento' : undefined}
          className="justify-start"
        >
          <SquareArrowOutUpRight className="h-4 w-4 mr-2 text-primary" />
          <span>Novo Chat</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={onNewChat}
          disabled={isStreaming}
          aria-label="Novo Chat"
          title={isStreaming ? 'Aguarde a resposta em andamento' : 'Novo Chat'}
        >
          <Plus className="h-4 w-4 text-primary" />
        </Button>
      )}
    </div>
  )
}

interface SidebarSettingsButtonProps {
  sidebarOpen: boolean
  isStreaming: boolean
  onOpenSettings?: () => void
}

function SidebarSettingsButton({
  sidebarOpen,
  isStreaming,
  onOpenSettings
}: SidebarSettingsButtonProps) {
  const label = isStreaming ? 'Configurações (bloqueado durante análise)' : 'Configurações'
  const title = isStreaming ? 'Uma análise analítica está em andamento...' : undefined

  return (
    <div className="p-3 border-t border-border space-y-2 w-full flex flex-col items-center">
      {sidebarOpen ? (
        <Button
          variant="ghost"
          onClick={onOpenSettings}
          disabled={isStreaming}
          aria-label={label}
          title={title}
        >
          <span className="flex items-center gap-2">
            <Settings className={cn('h-3.5 w-3.5', isStreaming && 'animate-spin text-primary')} />
            <span>{isStreaming ? 'Analisando...' : 'Configurações'}</span>
          </span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          disabled={isStreaming}
          aria-label={label}
          title={title}
        >
          <Settings className={cn('h-4 w-4', isStreaming && 'animate-spin text-primary')} />
        </Button>
      )}
    </div>
  )
}

function EmptyLayoutFallback() {
  return (
    <div className="text-center max-w-md space-y-3 m-auto">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border text-primary mb-2">
        <Film className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-medium text-foreground">
        O que você gostaria de analisar hoje?
      </h2>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Explore faturamento, orçamentos, dados de elenco e sinopses do catálogo CineData com inteligência artificial analítica.
      </p>
    </div>
  )
}

interface RightSidebarPanelProps {
  content: ReactNode
  isOpen: boolean
  onClose: () => void
}

function RightSidebarPanel({ content, isOpen, onClose }: RightSidebarPanelProps) {
  if (!content) return null

  return (
    <aside
      data-testid="app-right-sidebar"
      className={cn(
        'flex flex-col border-l border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0 z-20 overflow-hidden',
        isOpen ? 'w-64 min-w-64' : 'w-0 min-w-0 border-l-0 p-0'
      )}
    >
      {isValidElement(content)
        ? cloneElement(content as React.ReactElement<{ onCollapse?: () => void }>, {
          onCollapse: onClose
        })
        : content}
    </aside>
  )
}

/**
 * Layout principal em tela cheia com barra lateral retrátil e timeline lateral.
 *
 * @param props - Propriedades contendo áreas de conteúdo, estado de streaming e callbacks de navegação.
 * @returns Elemento JSX do layout com painéis retráteis responsivos.
 */
export function AppLayout({
  children,
  sidebarContent,
  rightSidebarContent,
  isStreaming = false,
  onNewChat,
  onOpenSettings
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside
        data-testid="app-sidebar"
        className={cn(
          'flex flex-col bg-sidebar transition-all duration-300 ease-in-out border-r border-border z-20',
          sidebarOpen ? 'w-64 min-w-64' : 'w-16 min-w-16 items-center'
        )}
      >
        <SidebarBrand
          sidebarOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <SidebarNewChatButton
          sidebarOpen={sidebarOpen}
          isStreaming={isStreaming}
          onNewChat={onNewChat}
        />
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 w-full">
          {sidebarOpen ? sidebarContent : null}
        </div>
        <SidebarSettingsButton
          sidebarOpen={sidebarOpen}
          isStreaming={isStreaming}
          onOpenSettings={onOpenSettings}
        />
      </aside>

      <div className="flex flex-1 overflow-hidden relative">
        {rightSidebarContent && !rightSidebarOpen ? (
          <div className="absolute top-3 right-3 z-30">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setRightSidebarOpen(true)}
              aria-label="Expandir turnos da conversa"
              title="Expandir histórico de turnos"
            >
              <PanelRightOpen className="h-4 w-4 text-primary" />
            </Button>
          </div>
        ) : null}

        <main
          data-testid="app-main"
          className="flex-1 overflow-hidden bg-background flex flex-col relative"
        >
          {children || <EmptyLayoutFallback />}
        </main>

        <RightSidebarPanel
          content={rightSidebarContent}
          isOpen={rightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
        />
      </div>
    </div>
  )
}
