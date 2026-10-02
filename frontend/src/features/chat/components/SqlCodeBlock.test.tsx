import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SqlCodeBlock } from './SqlCodeBlock'

describe('SqlCodeBlock', () => {
  it('renderiza o bloco colapsado por padrão com botão de cópia', () => {
    const query = 'SELECT titulo FROM dim_movies LIMIT 5'
    render(<SqlCodeBlock query={query} />)

    expect(screen.getByText('Consulta SQL')).toBeInTheDocument()
    expect(screen.getByText(/clique para expandir/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^copiar$/i })).toBeInTheDocument()
    expect(screen.queryByText(query)).not.toBeInTheDocument()
  })

  it('expande e exibe a consulta SQL ao clicar no header', async () => {
    const query = 'SELECT titulo FROM dim_movies LIMIT 5'
    render(<SqlCodeBlock query={query} />)

    const trigger = screen.getByRole('button', { name: /alternar exibição da consulta sql/i })
    trigger.click()

    expect(await screen.findByText(/clique para recolher/i)).toBeInTheDocument()
  })
})
