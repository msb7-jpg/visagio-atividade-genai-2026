import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Film,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Settings
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AppLayoutProps {
  children?: ReactNode
  sidebarContent?: ReactNode
  rightSidebarContent?: ReactNode
  headerTitle?: ReactNode
  activeThreadId?: string | null
  isStreaming?: boolean
  onNewChat?: () => void
  onOpenSettings?: () => void
}

export function AppLayout({
  children,
  sidebarContent,
  rightSidebarContent,
  headerTitle,
  isStreaming = false,
  onNewChat,
  onOpenSettings
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar lateral Dark Glassmorphism com modo ícones quando colapsada */}
      <aside
        data-testid="app-sidebar"
        className={`flex flex-col bg-sidebar transition-all duration-300 ease-in-out border-r border-border z-20 ${
          sidebarOpen ? 'w-64 min-w-64' : 'w-16 min-w-16 items-center'
        }`}
      >
        {/* Logo & Marca */}
        <div className={`flex items-center p-4 border-b border-border w-full ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border text-primary shrink-0">
              <Film className="h-4 w-4" />
            </div>
            {sidebarOpen ? (
              <div>
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

        {/* Botão Novo Chat Único e Canônico */}
        <div className="p-3 w-full flex justify-center">
          {sidebarOpen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewChat}
              disabled={isStreaming}
              aria-label="Novo Chat"
              title={isStreaming ? 'Aguarde a resposta em andamento' : undefined}
              className="w-full justify-start border-white/10 bg-[#13171E]/60 hover:bg-[#FF5E2B]/10 hover:border-[#FF5E2B]/30 text-zinc-200"
            >
              <Plus className="size-4 mr-2 text-[#FF5E2B]" />
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
              className="size-9 border-white/10 bg-[#13171E]/60 hover:bg-[#FF5E2B]/10 hover:border-[#FF5E2B]/30 text-zinc-200"
            >
              <Plus className="size-4 text-[#FF5E2B]" />
            </Button>
          )}
        </div>

        {/* Lista de Conversas / Histórico */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 w-full">
          {sidebarOpen ? (
            sidebarContent || (
              <>
                <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Sessões Recentes
                </div>
                <div
                  className="flex items-center rounded-lg text-xs text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer transition-colors gap-2 px-2.5 py-2"
                  title="Top 10 Bilheterias da História"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">Top 10 Bilheterias da História</span>
                </div>
                <div
                  className="flex items-center rounded-lg text-xs text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer transition-colors gap-2 px-2.5 py-2"
                  title="Lucro Médio por Gênero"
                >
                  <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">Lucro Médio por Gênero</span>
                </div>
              </>
            )
          ) : null}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-border space-y-2 w-full flex flex-col items-center">

          {sidebarOpen ? (
            <Button
              variant="ghost"
              onClick={onOpenSettings}
              disabled={isStreaming}
              aria-label={isStreaming ? 'Configurações (bloqueado durante análise)' : 'Configurações'}
              title={isStreaming ? 'Uma análise analítica está em andamento...' : undefined}
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
              aria-label={isStreaming ? 'Configurações (bloqueado durante análise)' : 'Configurações'}
              title={isStreaming ? 'Uma análise analítica está em andamento...' : undefined}
            >
              <Settings className={cn('h-4 w-4', isStreaming && 'animate-spin text-primary')} />
            </Button>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal & Topbar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Superior */}
        <header
          data-testid="app-header"
          className="flex h-14 items-center justify-between px-4 border-b border-border bg-background z-10"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              {headerTitle || (
                <span className="text-xs font-medium text-foreground">
                  CineData Analytics
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              disabled={isStreaming}
              aria-label={isStreaming ? 'Abrir configurações (bloqueado durante análise)' : 'Abrir configurações de provedor'}
              title={isStreaming ? 'Uma análise analítica está em andamento...' : undefined}
            >
              <Settings className={cn('h-4 w-4', isStreaming && 'animate-spin text-primary')} />
            </Button>
            {rightSidebarContent ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightSidebarOpen((prev) => !prev)}
                aria-label={rightSidebarOpen ? 'Recolher turnos da conversa' : 'Expandir turnos da conversa'}
                title={rightSidebarOpen ? 'Recolher histórico de turnos' : 'Expandir histórico de turnos'}
              >
                {rightSidebarOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        </header>

        {/* Área de Visualização com Miolo Central e Sidebar Direita Vertical */}
        <div className="flex flex-1 overflow-hidden relative">
          <main
            data-testid="app-main"
            className="flex-1 overflow-hidden bg-background flex flex-col relative"
          >
            {children || (
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
            )}
          </main>

          {/* Sidebar Direita Canônica: Turnos da Conversa / Mini-mapa */}
          {rightSidebarContent ? (
            <aside
              data-testid="app-right-sidebar"
              className={cn(
                'flex flex-col border-l border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0 z-20 overflow-hidden',
                rightSidebarOpen ? 'w-64 min-w-64' : 'w-0 min-w-0 border-l-0 p-0'
              )}
            >
              {rightSidebarContent}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
