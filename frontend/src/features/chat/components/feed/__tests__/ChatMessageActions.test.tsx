import { ChatMessageActions } from '@/features/chat/components/feed/ChatMessageActions'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('ChatMessageActions Component', () => {
  it('renderiza o botão Gerar Gráfico quando onGenerateChart é fornecido e hasChart é falso', () => {
    const onGenerateChartMock = vi.fn()

    render(
      <ChatMessageActions
        content="Aqui está a análise com dados."
        onGenerateChart={onGenerateChartMock}
        hasChart={false}
      />
    )

    const chartBtn = screen.getByRole('button', { name: /Gerar Gráfico/i })
    expect(chartBtn).toBeInTheDocument()

    fireEvent.click(chartBtn)
    expect(onGenerateChartMock).toHaveBeenCalledTimes(1)
  })

  it('não renderiza o botão Gerar Gráfico quando hasChart é verdadeiro', () => {
    const onGenerateChartMock = vi.fn()

    render(
      <ChatMessageActions
        content="Aqui está a análise com dados."
        onGenerateChart={onGenerateChartMock}
        hasChart
      />
    )

    expect(screen.queryByRole('button', { name: /Gerar Gráfico/i })).not.toBeInTheDocument()
  })
})
