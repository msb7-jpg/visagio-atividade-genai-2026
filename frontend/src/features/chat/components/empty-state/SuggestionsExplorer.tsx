import { DirectionalSlide, SlidingIndicator } from '@/components/animations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/tooltip-card'
import { MarkdownRenderer } from '@/features/chat/components/renderers/MarkdownRenderer'
import { PROMPT_CATEGORIES } from '@/features/chat/constants/promptCategories'
import { cn } from '@/lib/utils'
import { ArrowUpRight, HelpCircle } from 'lucide-react'
import { useState } from 'react'

/**
 * Propriedades para o seletor de sugestões de perguntas analíticas.
 */
export interface SuggestionExplorerProps {
  /** Callback disparado quando o usuário clica em um card de pergunta sugerida. */
  onSelectPrompt: (prompt: string) => void
}

/**
 * Painel explorador de sugestões temáticas (Finanças, Desempenho, Pessoas) para o estado inicial vazio.
 *
 * @param props - Propriedades contendo o manipulador de seleção de prompt.
 * @returns Elemento JSX com abas de categorias e catálogo modal de perguntas.
 */
export function SuggestionExplorer({ onSelectPrompt }: SuggestionExplorerProps) {
  const [activeTab, setActiveTab] = useState(PROMPT_CATEGORIES[0].id)
  const currentCategory = PROMPT_CATEGORIES.find((category) => category.id === activeTab) || PROMPT_CATEGORIES[0]

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 flex flex-col items-center">
      {/* Abas Superiores */}
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-sidebar/80 p-1 backdrop-blur-md">
        {PROMPT_CATEGORIES.map((category) => {
          const Icon = category.icon
          const isActive = activeTab === category.id
          return (
            <Button
              key={category.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(category.id)}
              className={cn(
                'relative rounded-full px-3 text-xs transition-colors',
                isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive ? (
                <SlidingIndicator
                  layoutId="activeCategoryPill"
                  className="rounded-full bg-primary/15 border border-primary/30"
                />
              ) : null}
              <span className="relative z-10 flex items-center">
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                <span>{category.label}</span>
              </span>
            </Button>
          )
        })}
      </div>

      {/* Grid com apenas 3 cards da aba ativa com transição direcional suave */}
      <DirectionalSlide activeKey={activeTab} direction="horizontal" className="mt-4">
        <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2.5">
          {currentCategory.prompts.slice(0, 3).map((item, index) => {
            const ItemIcon = item.icon || currentCategory.icon
            return (
              <Tooltip
                key={index}
                content={(
                  <div className="p-3 text-xs text-muted-foreground leading-relaxed">
                    {item.prompt}
                  </div>
                )}
                containerClassName="h-full"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onSelectPrompt(item.prompt)}
                  className="group relative flex flex-col items-start justify-center text-left h-full w-full rounded-xl border border-border bg-sidebar/50 p-4 hover:border-primary/40 hover:bg-sidebar transition-all whitespace-normal"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <ItemIcon className="h-4 w-4 text-primary" />
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground mt-2 line-clamp-2">
                    <MarkdownRenderer
                      content={item.title}
                      className="text-sm font-semibold prose-p:my-0 prose-p:leading-tight prose-a:font-semibold text-foreground"
                    />
                  </span>
                </Button>
              </Tooltip>
            )
          })}
        </div>
      </DirectionalSlide>

      {/* Gatilho para abrir a biblioteca completa sem poluir o chat */}
      <div className="mt-3">
        <Dialog>
          <DialogTrigger className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Ver catálogo completo de exemplos</span>
          </DialogTrigger>
          <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl bg-background rounded-lg border-border text-foreground max-h-screen overflow-y-auto p-6 sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">Catálogo de Perguntas do Agente</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {PROMPT_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <category.icon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{category.label}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
                      {category.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.prompts.map((example, exampleIndex) => (
                      <Button
                        key={exampleIndex}
                        type="button"
                        variant="outline"
                        onClick={() => onSelectPrompt(example.prompt)}
                        className="p-4 text-left h-auto rounded-xl border border-border bg-sidebar hover:border-primary/50 hover:bg-card-hover transition-all flex flex-col items-start gap-1.5 whitespace-normal"
                      >
                        <span className="text-xs font-semibold text-foreground">
                          <MarkdownRenderer
                            content={example.title}
                            className="text-xs font-semibold prose-p:my-0 prose-a:font-semibold text-foreground"
                          />
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          <MarkdownRenderer
                            content={example.prompt}
                            className="text-xs text-muted-foreground prose-p:my-0 prose-a:font-medium"
                          />
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
