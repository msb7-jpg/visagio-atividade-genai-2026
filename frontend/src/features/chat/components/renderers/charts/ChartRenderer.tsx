import { Button } from '@/components/ui/button'
import { copyChartToClipboard, downloadChartAsPng } from '@/features/chat/lib/chartExportUtils'
import { CHART_TYPE, type ChartJsConfigDTO } from '@/features/chat/types/chat.types'
import { BarChart3, Check, Copy, Download, LineChart, PieChart } from 'lucide-react'
import { useMemo, useRef, useState, type JSX } from 'react'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import { CHART_PALETTE, getChartOptions } from './chart.config'

/**
 * Propriedades para renderização do componente visual de gráfico.
 */
export interface ChartRendererProps {
  /** Configuração declarativa estruturada contendo datasets, labels e tipo de gráfico. */
  config: ChartJsConfigDTO
}

/**
 * Renderizador reativo de gráficos Chart.js com temas escuros e paleta cinematográfica.
 *
 * @param props - Propriedades contendo a especificação do gráfico.
 * @returns Elemento JSX do gráfico encapsulado em um card estruturado.
 */
export function ChartRenderer({ config }: ChartRendererProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) {
      downloadChartAsPng(canvas, config.title)
    }
  }

  const handleCopy = async () => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return

    const success = await copyChartToClipboard(canvas)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const chartData = useMemo(() => {
    const isMultiColorType =
      config.type === CHART_TYPE.PIE || config.type === CHART_TYPE.DOUGHNUT

    const cleanString = (str: string) =>
      str
        .replace(/\[([^\]]+)\]\(movie:[^)]+\)/g, '$1')
        .replace(/\(([^)]+)\)\[[a-zA-Z0-9_-]+\]/g, '$1')

    const cleanLabels = config.labels.map((label) =>
      typeof label === 'string' ? cleanString(label) : label
    )

    const styledDatasets = config.datasets.map((dataset, dsIndex) => {
      const cleanDatasetLabel = dataset.label ? cleanString(dataset.label) : dataset.label

      if (isMultiColorType) {
        return {
          label: cleanDatasetLabel,
          data: dataset.data,
          backgroundColor: cleanLabels.map(
            (_, labelIndex) => CHART_PALETTE[labelIndex % CHART_PALETTE.length]
          ),
          borderColor: '#13171E',
          borderWidth: 2
        }
      }

      const baseColor = CHART_PALETTE[dsIndex % CHART_PALETTE.length]
      return {
        label: cleanDatasetLabel,
        data: dataset.data,
        backgroundColor: `${baseColor}CC`, // ~80% opacidade
        borderColor: baseColor,
        borderWidth: 1.5,
        borderRadius: config.type === CHART_TYPE.BAR ? 4 : 0,
        tension: config.type === CHART_TYPE.LINE ? 0.35 : 0,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#0E1217',
        pointHoverRadius: 6
      }
    })

    return {
      labels: cleanLabels,
      datasets: styledDatasets
    }
  }, [config])

  const options = useMemo(() => getChartOptions(config.type), [config.type])

  const ChartIcon = useMemo(() => {
    if (config.type === CHART_TYPE.LINE) return LineChart
    if (config.type === CHART_TYPE.PIE || config.type === CHART_TYPE.DOUGHNUT) return PieChart
    return BarChart3
  }, [config.type])

  const renderChartContent = () => {
    if (config.type === CHART_TYPE.BAR) {
      return <Bar data={chartData} options={options} />
    }
    if (config.type === CHART_TYPE.LINE) {
      return <Line data={chartData} options={options} />
    }
    if (config.type === CHART_TYPE.DOUGHNUT) {
      return <Doughnut data={chartData} options={options} />
    }
    return <Pie data={chartData} options={options} />
  }

  return (
    <div
      ref={containerRef}
      data-testid="chart-renderer-container"
      data-chart-container="true"
      data-chart-title={config.title}
      className="overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-border bg-sidebar px-3 py-2">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-xs font-semibold text-foreground tracking-wide">
            {config.title}
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            title="Copiar gráfico como imagem"
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-accent-emerald" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">{copied ? 'Gráfico copiado' : 'Copiar gráfico'}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDownload}
            title="Baixar gráfico em PNG"
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Baixar PNG</span>
          </Button>
          <span className="rounded border border-border bg-card px-2 py-0.5 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
            {config.type}
          </span>
        </div>
      </div>

      <div className="p-4 pt-3 h-64 sm:h-72 w-full">
        {renderChartContent()}
      </div>
    </div>
  )
}

export default ChartRenderer
