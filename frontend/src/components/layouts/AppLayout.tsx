import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Film,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

export interface AppLayoutProps {
  children?: ReactNode
  activeThreadId?: string | null
  onNewChat?: () => void
  onOpenSettings?: () => void
}

export function AppLayout({
  children,
  onNewChat,
  onOpenSettings
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

        {/* Botão Novo Chat */}
        <div className="p-3 w-full flex justify-center">
          {sidebarOpen ? (
            <Button
              variant="secondary"
              onClick={onNewChat}
              aria-label="Novo Chat"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span>Novo Chat</span>
              </span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="icon"
              onClick={onNewChat}
              aria-label="Novo Chat"
            >
              <Plus className="h-4 w-4 text-primary" />
            </Button>
          )}
        </div>

        {/* Lista de Conversas / Histórico (Placeholder para Slice 4) */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 w-full">
          {sidebarOpen ? (
            <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sessões Recentes
            </div>
          ) : null}
          <div
            className={`flex items-center rounded-lg text-xs text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer transition-colors ${
              sidebarOpen ? 'gap-2 px-2.5 py-2' : 'justify-center p-2.5'
            }`}
            title="Top 10 Bilheterias da História"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            {sidebarOpen ? (
              <span className="truncate">Top 10 Bilheterias da História</span>
            ) : null}
          </div>
          <div
            className={`flex items-center rounded-lg text-xs text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer transition-colors ${
              sidebarOpen ? 'gap-2 px-2.5 py-2' : 'justify-center p-2.5'
            }`}
            title="Lucro Médio por Gênero"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
            {sidebarOpen ? (
              <span className="truncate">Lucro Médio por Gênero</span>
            ) : null}
          </div>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-border space-y-2 w-full flex flex-col items-center">

          {sidebarOpen ? (
            <Button
              variant="ghost"
              onClick={onOpenSettings}
              aria-label="Configurações"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" />
                <span>Configurações</span>
              </span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              aria-label="Configurações"
            >
              <Settings className="h-4 w-4" />
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
              <span className="text-xs font-medium text-foreground">
                CineData Analytics
              </span>

            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              aria-label="Abrir configurações de provedor"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Área de Visualização do Chat / Conteúdo */}
        <main
          data-testid="app-main"
          className="flex-1 overflow-hidden bg-background flex flex-col relative"
        >
          {children || (
            <div className="text-center max-w-md space-y-3">
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
      </div>
    </div>
  )
}
