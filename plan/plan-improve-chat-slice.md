Esta é a reestruturação da slice `features/chat` mantendo as pastas `__tests__` próximas, sem criar `index.ts`, e utilizando rigorosamente apenas os componentes já existentes no seu projeto (com uma única extração necessária de suporte apontada explicitamente).

---

## Nova Estrutura de Pastas da Slice `chat`

A ideia central é dividir a pasta plana `components/` em subpastas semânticas:

* **`feed/`**: Tudo que compõe a linha do tempo e estrutura da mensagem.
* **`input/`**: Tudo relacionado à entrada de dados do usuário.
* **`renderers/`**: Componentes especialistas em formatar saídas da IA (markdown, charts, sql, tabelas, raciocínio).

```text
features/chat/
├── ChatContainer.tsx
├── components/
│   ├── feed/
│   │   ├── __tests__/
│   │   │   ├── ChatMessageError.test.tsx
│   │   │   └── NodeStepper.test.tsx
│   │   ├── AgentAvatar.tsx
│   │   ├── ChatMessage.tsx
│   │   └── NodeStepper.tsx
│   │
│   ├── input/
│   │   └── ChatInput.tsx
│   │
│   └── renderers/
│       ├── __tests__/
│       │   ├── ChartRenderer.test.tsx
│       │   ├── MarkdownRenderer.test.tsx
│       │   ├── SqlCodeBlock.test.tsx
│       │   └── TableRenderer.test.tsx
│       ├── charts/
│       │   ├── ChartRenderer.tsx
│       │   └── chart.config.ts        <-- (Novo: extraído do ChartRenderer.tsx existente)
│       ├── MarkdownRenderer.tsx
│       ├── SqlCodeBlock.tsx
│       ├── TableRenderer.tsx
│       └── ThoughtInspector.tsx
│
├── hooks/
│   └── useAgentStream.ts
├── lib/
│   ├── chatMessageReducer.ts
│   └── sseStreamParser.ts
└── types/
    └── chat.types.ts

```

---

## 2. Extração Necessária: Isolando a Configuração do ChartJS

Hoje, `ChartRenderer.tsx` mistura renderização visual com ~100 linhas de registro singleton do ChartJS, paleta de cores e `options` complexas.

### Novo Arquivo de Suporte: `chart.config.ts`

*(Origem: extraído puramente de dentro de `features/chat/components/ChartRenderer.tsx`)*

```ts
// features/chat/components/renderers/charts/chart.config.ts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export const CHART_PALETTE = [
  '#FF5E2B',
  '#00D2FF',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6'
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getChartOptions(type: string): ChartOptions<any> {
  const isRadial = type === 'pie' || type === 'doughnut'

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9CA3AF',
          font: { family: 'Inter, sans-serif', size: 11 },
          boxWidth: 12,
          boxHeight: 12,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: '#1B202B',
        titleColor: '#F3F4F6',
        bodyColor: '#9CA3AF',
        borderColor: '#282F3D',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8
      }
    },
    scales: isRadial
      ? undefined
      : {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#9CA3AF',
              font: { family: 'Inter, sans-serif', size: 11 },
              maxRotation: 45
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#9CA3AF',
              font: { family: 'Inter, sans-serif', size: 11 }
            }
          }
        }
  }
}

```

### Versão Concisa de `ChartRenderer.tsx`

```tsx
// features/chat/components/renderers/charts/ChartRenderer.tsx
import { useMemo } from 'react'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import { BarChart3, LineChart, PieChart } from 'lucide-react'
import type { ChartJsConfigDTO } from '@/features/chat/types/chat.types'
import { CHART_PALETTE, getChartOptions } from './chart.config'

interface ChartRendererProps {
  config: ChartJsConfigDTO
}

export function ChartRenderer({ config }: ChartRendererProps) {
  const chartData = useMemo(() => {
    const isMultiColor = config.type === 'pie' || config.type === 'doughnut'

    const styledDatasets = config.datasets.map((dataset, dsIndex) => {
      if (isMultiColor) {
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: config.labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
          borderColor: '#13171E',
          borderWidth: 2
        }
      }

      const baseColor = CHART_PALETTE[dsIndex % CHART_PALETTE.length]
      return {
        label: dataset.label,
        data: dataset.data,
        backgroundColor: `${baseColor}CC`,
        borderColor: baseColor,
        borderWidth: 1.5,
        borderRadius: config.type === 'bar' ? 4 : 0,
        tension: config.type === 'line' ? 0.35 : 0,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#0E1217',
        pointHoverRadius: 6
      }
    })

    return { labels: config.labels, datasets: styledDatasets }
  }, [config])

  const options = useMemo(() => getChartOptions(config.type), [config.type])

  const ChartIcon = useMemo(() => {
    if (config.type === 'line') return LineChart
    if (config.type === 'pie' || config.type === 'doughnut') return PieChart
    return BarChart3
  }, [config.type])

  const renderContent = () => {
    switch (config.type) {
      case 'bar': return <Bar data={chartData} options={options} />
      case 'line': return <Line data={chartData} options={options} />
      case 'doughnut': return <Doughnut data={chartData} options={options} />
      default: return <Pie data={chartData} options={options} />
    }
  }

  return (
    <div
      data-testid="chart-renderer-container"
      className="overflow-hidden rounded-xl border border-white/10 bg-[#13171E]/60 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/5 bg-[#171C25] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <ChartIcon className="size-3.5 text-[#FF5E2B]" />
          <h4 className="text-xs font-semibold text-zinc-300 tracking-wide">{config.title}</h4>
        </div>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-400">
          {config.type}
        </span>
      </div>
      <div className="p-4 pt-3 h-64 sm:h-72 w-full">{renderContent()}</div>
    </div>
  )
}

```

---

## Como os Imports se Conectam

Com essa separação, o fluxo de dependência fica claro e evita imports cruzados desorganizados:

* **Em `ChatContainer.tsx`:**
* Importa `ChatMessage` e `NodeStepper` de `./components/feed/...`
* Importa `ChatInput` de `./components/input/ChatInput`


* **Em `ChatMessage.tsx`:**
* Importa `AgentAvatar` de `./AgentAvatar` (mesma pasta `feed`)
* Importa os visualizadores especializados de `../renderers/MarkdownRenderer`, `../renderers/charts/ChartRenderer`, `../renderers/SqlCodeBlock`, `../renderers/TableRenderer` e `../renderers/ThoughtInspector`


* **Nos testes (`__tests__/`):**
* Mantêm-se no topo de cada subpasta, testando diretamente o arquivo irmão em `../` sem misturar testes de lógica de stream/chat com testes de renderização gráfica.

---

## Padrão Registry/Polimórfico para Mensagens

Quando `ChatMessage.tsx` conhece `ChartRenderer`, `TableRenderer`, `SqlCodeBlock` e `ThoughtInspector` diretamente, ele vira um monólito com excesso de imports e acoplamento.

Isole a decisão em um dispatcher (`ContentRenderer` ou `registry`):

```tsx
// features/chat/components/renderers/ContentRenderer.tsx
import { lazy, Suspense } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Loader } from '@/components/ui/loader'

const ChartRenderer = lazy(() => import('./charts/ChartRenderer'))
const SqlCodeBlock = lazy(() => import('./SqlCodeBlock'))
const TableRenderer = lazy(() => import('./TableRenderer'))

const RENDERERS = {
  text: MarkdownRenderer,
  chart: ChartRenderer,
  sql: SqlCodeBlock,
  table: TableRenderer,
} as const

export function ContentRenderer({ block }: { block: ChatContentBlock }) {
  const Component = RENDERERS[block.type] ?? MarkdownRenderer

  return (
    <Suspense fallback={<Loader className="h-24 w-full" />}>
      <Component data={block.payload} />
    </Suspense>
  )
}

```

* **Benefício:** Permite code-splitting automático (ex: Chart.js só carrega se houver um gráfico na tela).

---

---

## Regras Gerais de Manutenibilidade para Slices

* **Headless Hooks para Estado de UI Complexo:** Se o `ChatContainer` lida com scroll automático ao receber SSE, foco de input e histórico, extraia isso em hooks de suporte.
