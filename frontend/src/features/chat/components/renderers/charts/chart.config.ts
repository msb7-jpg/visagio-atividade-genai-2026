import { CHART_TYPE, type ChartType } from '@/features/chat/types/chat.types'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
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

/** Paleta cromática cinematográfica otimizada para alto contraste em fundo escuro. */
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

/**
 * Constrói a configuração visual do Chart.js parametrizada para o tema escuro.
 *
 * @param type - Tipo de visualização gráfica ('bar', 'line', 'pie' ou 'doughnut').
 * @returns Objeto de opções ChartOptions customizado para o tema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getChartOptions(type: ChartType | string): ChartOptions<any> {
  const isRadial = type === CHART_TYPE.PIE || type === CHART_TYPE.DOUGHNUT

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
