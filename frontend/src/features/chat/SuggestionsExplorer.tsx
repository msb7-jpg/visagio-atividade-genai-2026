import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowUpRight, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { PROMPT_CATEGORIES } from './constants/promptCategories'

interface SuggestionExplorerProps {
  onSelectPrompt: (prompt: string) => void
}

export function SuggestionExplorer({ onSelectPrompt }: SuggestionExplorerProps) {
  const [activeTab, setActiveTab] = useState(PROMPT_CATEGORIES[0].id)
  const currentCategory = PROMPT_CATEGORIES.find((c) => c.id === activeTab) || PROMPT_CATEGORIES[0]

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 flex flex-col items-center">
      {/* Abas Superiores */}
      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-sidebar/80 p-1 backdrop-blur-md">
        {PROMPT_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = activeTab === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Grid com apenas 3 cards da aba ativa */}
      <div className="mt-4 grid w-full grid-cols-1 sm:grid-cols-3 gap-2.5">
        {currentCategory.prompts.slice(0, 3).map((item, idx) => {
          const ItemIcon = item.icon || currentCategory.icon
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group relative flex flex-col justify-between text-left rounded-xl border border-white/10 bg-sidebar/50 p-3.5 hover:border-primary/40 hover:bg-sidebar transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                    <ItemIcon className="size-3 text-primary" />
                    {item.subCategory}
                  </span>
                  <ArrowUpRight className="size-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <p className="text-xs font-medium text-zinc-200 line-clamp-2">
                  {item.title}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Gatilho para abrir a biblioteca completa sem poluir o chat */}
      <div className="mt-3">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition-colors"
            >
              <HelpCircle className="size-3.5" />
              Ver catálogo completo de exemplos
            </button>
          </DialogTrigger>
          <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl bg-background rounded-lg border-white/10 text-zinc-100 max-h-[85vh] overflow-y-auto p-6 sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">Catálogo de Perguntas do Agente</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {PROMPT_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <category.icon className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-zinc-200">{category.label}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                      {category.badge}
                    </span>
                  </div>

                  {/* Agora com largura de sobra, você pode manter 2 colunas bem espaçosas ou até 3 colunas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.prompts.map((example, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => onSelectPrompt(example.prompt)}
                        className="p-4 text-left rounded-xl border border-white/5 bg-sidebar hover:border-primary/50 hover:bg-[#181D26] transition-all flex flex-col gap-1.5"
                      >
                        <span className="text-xs font-semibold text-zinc-100">{example.title}</span>
                        <span className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {example.prompt}
                        </span>
                      </button>
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
