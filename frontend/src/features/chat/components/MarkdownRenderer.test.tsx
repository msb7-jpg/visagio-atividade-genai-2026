import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownRenderer } from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders headings and paragraph properly', () => {
    const markdown = '### Top 10 Filmes\n\nEste é um parágrafo analítico.'
    render(<MarkdownRenderer content={markdown} />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Top 10 Filmes')
    expect(screen.getByText('Este é um parágrafo analítico.')).toBeInTheDocument()
  })

  it('renders GFM markdown table correctly and has copy button in options menu', async () => {
    const tableMarkdown = `
| Rank | Título | Receita |
| :--- | :----- | :------ |
| 1 | Avatar | US$ 2.8B |
| 2 | Avengers | US$ 2.7B |
`
    render(<MarkdownRenderer content={tableMarkdown} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Rank')).toBeInTheDocument()
    expect(screen.getByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Avatar')).toBeInTheDocument()
    expect(screen.getByText('US$ 2.8B')).toBeInTheDocument()

    const menuButton = screen.getByRole('button', { name: /opções da tabela/i })
    expect(menuButton).toBeInTheDocument()
    menuButton.click()

    expect(await screen.findByRole('button', { name: /copiar tabela/i })).toBeInTheDocument()
  })

  it('renders chart inline when ```chart``` marker is present', () => {
    const mockConfig = {
      type: 'bar' as const,
      title: 'Top Produtoras',
      labels: ['Warner', 'Disney'],
      datasets: [{ label: 'Lucro', data: [100, 200] }]
    }
    const markdown = 'Introdução analítica.\n\n```chart\n```\n\nConclusão executiva.'
    render(<MarkdownRenderer content={markdown} chartConfig={mockConfig} />)

    expect(screen.getByText('Introdução analítica.')).toBeInTheDocument()
    expect(screen.getByTestId('chart-renderer-container')).toBeInTheDocument()
    expect(screen.getByText('Top Produtoras')).toBeInTheDocument()
    expect(screen.getByText('Conclusão executiva.')).toBeInTheDocument()
  })

  it('renders chart as graceful fallback when chartConfig is present without ```chart``` marker', () => {
    const mockConfig = {
      type: 'pie' as const,
      title: 'Distribuição por Gênero',
      labels: ['Ação', 'Drama'],
      datasets: [{ label: 'Qtd', data: [50, 30] }]
    }
    const markdown = 'Análise sem marcador explícito.'
    render(<MarkdownRenderer content={markdown} chartConfig={mockConfig} />)

    expect(screen.getByText('Análise sem marcador explícito.')).toBeInTheDocument()
    expect(screen.getByTestId('chart-renderer-container')).toBeInTheDocument()
    expect(screen.getByText('Distribuição por Gênero')).toBeInTheDocument()
  })
})


