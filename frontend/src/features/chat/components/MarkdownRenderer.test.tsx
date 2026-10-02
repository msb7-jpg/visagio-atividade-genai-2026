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
})

