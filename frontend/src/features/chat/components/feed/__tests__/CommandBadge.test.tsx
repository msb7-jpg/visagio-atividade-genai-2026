import { CommandBadge } from '@/features/chat/components/feed/CommandBadge'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('CommandBadge Component', () => {
  it('renderiza o comando com barra normalizada', () => {
    render(<CommandBadge command="chart" />)
    expect(screen.getByText('/chart')).toBeInTheDocument()
  })

  it('renderiza o comando com argumentos adicionais se fornecidos', () => {
    render(<CommandBadge command="/chart" args="bar Top 5" />)
    expect(screen.getByText('/chart')).toBeInTheDocument()
    expect(screen.getByText('bar Top 5')).toBeInTheDocument()
  })
})
