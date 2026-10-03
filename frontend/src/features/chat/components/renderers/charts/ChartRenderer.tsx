import type { ChartJsConfigDTO } from '@/features/chat/types/chat.types'
import { BarChart3, LineChart, PieChart } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import { CHART_PALETTE, getChartOptions } from './chart.config'

interface ChartRendererProps {
  config: ChartJsConfigDTO
}

export function ChartRenderer({ config }: ChartRendererProps) {
  const chartData = useMemo(() => {
    const isMultiColorType = config.type === 'pie' || config.type === 'doughnut'

    const styledDatasets = config.datasets.map((dataset, dsIndex) => {
      if (isMultiColorType) {
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: config.labels.map(
            (_, labelIndex) => CHART_PALETTE[labelIndex % CHART_PALETTE.length]
          ),
          borderColor: '#13171E',
          borderWidth: 2
        }
      }

      const baseColor = CHART_PALETTE[dsIndex % CHART_PALETTE.length]
      return {
        label: dataset.label,
        data: dataset.data,
        backgroundColor: `${baseColor}CC`, // ~80% opacidade
        borderColor: baseColor,
        borderWidth: 1.5,
        borderRadius: config.type === 'bar' ? 4 : 0,
        tension: config.type === 'line' ? 0.35 : 0,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#0E1217',
        pointHoverRadius: 6
      }
    })

    return {
      labels: config.labels,
      datasets: styledDatasets
    }
  }, [config])

  const options = useMemo(() => getChartOptions(config.type), [config.type])

  const ChartIcon = useMemo(() => {
    if (config.type === 'line') return LineChart
    if (config.type === 'pie' || config.type === 'doughnut') return PieChart
    return BarChart3
  }, [config.type])

  const renderChartContent = () => {
    if (config.type === 'bar') {
      return <Bar data={chartData} options={options} />
    }
    if (config.type === 'line') {
      return <Line data={chartData} options={options} />
    }
    if (config.type === 'doughnut') {
      return <Doughnut data={chartData} options={options} />
    }
    return <Pie data={chartData} options={options} />
  }

  return (
    <div
      data-testid="chart-renderer-container"
      className="overflow-hidden rounded-xl border border-white/10 bg-[#13171E]/60 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/5 bg-[#171C25] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <ChartIcon className="size-3.5 text-[#FF5E2B]" />
          <h4 className="text-xs font-semibold text-zinc-300 tracking-wide">
            {config.title}
          </h4>
        </div>
        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-400">
          {config.type}
        </span>
      </div>

      <div className="p-4 pt-3 h-64 sm:h-72 w-full">
        {renderChartContent()}
      </div>
    </div>
  )
}
export default ChartRenderer
