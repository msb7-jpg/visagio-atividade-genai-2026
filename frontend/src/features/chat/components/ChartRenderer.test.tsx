import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChartRenderer } from './ChartRenderer'
import type { ChartJsConfigDTO } from '@/features/chat/types/chat.types'

// Mock react-chartjs-2 para validar props e estrutura sem depender de renderização Canvas nativa no JSDOM
vi.mock('react-chartjs-2', () => ({
  Bar: vi.fn(({ data, options }) => (
    <div data-testid="mock-chart-bar" data-labels={JSON.stringify(data.labels)}>
      <span>{options?.plugins?.legend?.display ? 'legend-visible' : 'no-legend'}</span>
    </div>
  )),
  Line: vi.fn(() => <div data-testid="mock-chart-line" />),
  Pie: vi.fn(() => <div data-testid="mock-chart-pie" />),
  Doughnut: vi.fn(() => <div data-testid="mock-chart-doughnut" />)
}))

describe('ChartRenderer', () => {
  it('renders bar chart with title, type badge and labels', () => {
    const config: ChartJsConfigDTO = {
      type: 'bar',
      title: 'Top 3 Produtoras',
      labels: ['Warner Bros', 'Universal', 'Paramount'],
      datasets: [
        {
          label: 'Lucro Total (R$)',
          data: [1500000, 1200000, 900000]
        }
      ]
    }

    render(<ChartRenderer config={config} />)

    expect(screen.getByText('Top 3 Produtoras')).toBeInTheDocument()
    expect(screen.getByText('bar')).toBeInTheDocument()
    const chart = screen.getByTestId('mock-chart-bar')
    expect(chart).toBeInTheDocument()
    expect(chart.getAttribute('data-labels')).toContain('Warner Bros')
  })

  it('renders pie chart with correct component', () => {
    const config: ChartJsConfigDTO = {
      type: 'pie',
      title: 'Distribuição por Gênero',
      labels: ['Action', 'Comedy'],
      datasets: [
        {
          label: 'Quantidade',
          data: [40, 60]
        }
      ]
    }

    render(<ChartRenderer config={config} />)

    expect(screen.getByText('Distribuição por Gênero')).toBeInTheDocument()
    expect(screen.getByTestId('mock-chart-pie')).toBeInTheDocument()
  })
})
