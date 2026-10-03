import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatMessage } from '../ChatMessage'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'

describe('ChatMessage with Error Block', () => {
  it('renders ChatErrorCard with message and code correctly', () => {
    const onOpenSettings = vi.fn()
    const errorMsg: ChatMessageItem = {
      id: 'msg-err-1',
      role: 'assistant',
      content: 'Créditos ou cota esgotados no Google Gemini (402 Resource Exhausted).',
      blocks: [
        {
          id: 'b-err-1',
          type: 'error',
          code: 'RESOURCE_EXHAUSTED',
          message: 'Créditos ou cota esgotados no Google Gemini (402 Resource Exhausted).',
          rawError: 'Error 402: Prepayment credits depleted.'
        }
      ],
      steps: [
        {
          step: 'router',
          label: 'Classificando intenção',
          status: 'error'
        }
      ],
      timestamp: Date.now(),
      isStreaming: false,
      provider: 'google',
      model: 'gemini-2.5-flash'
    }

    render(<ChatMessage message={errorMsg} onOpenSettings={onOpenSettings} />)

    // Verifica se o card de erro foi renderizado
    expect(screen.getByTestId('chat-error-card')).toBeInTheDocument()
    expect(screen.getByText(/Falha na Execução \(RESOURCE_EXHAUSTED\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Créditos ou cota esgotados/i)).toBeInTheDocument()

    // Botão de Configurar Provedor deve estar presente para erro de cota
    const configBtn = screen.getByRole('button', { name: /Configurar Provedor/i })
    expect(configBtn).toBeInTheDocument()
    fireEvent.click(configBtn)
    expect(onOpenSettings).toHaveBeenCalledTimes(1)

    // Botão de ver detalhes técnicos
    const detailsBtn = screen.getByRole('button', { name: /Ver detalhes técnicos/i })
    expect(detailsBtn).toBeInTheDocument()
    fireEvent.click(detailsBtn)
    expect(screen.getByText(/Prepayment credits depleted/i)).toBeInTheDocument()
  })

  it('keeps NodeStepper open when steps contain error status', () => {
    const errorMsg: ChatMessageItem = {
      id: 'msg-err-2',
      role: 'assistant',
      content: 'Erro no processamento',
      blocks: [
        {
          id: 'b-err-2',
          type: 'error',
          code: 'TIMEOUT',
          message: 'Tempo limite excedido'
        }
      ],
      steps: [
        {
          step: 'sql_generator',
          label: 'Escrevendo consulta SQL',
          status: 'error'
        }
      ],
      timestamp: Date.now(),
      isStreaming: false
    }

    render(<ChatMessage message={errorMsg} />)
    expect(screen.getByText('Escrevendo consulta SQL')).toBeInTheDocument()
  })

  it('renders Configurar Provedor button on ANY generic error (AGENT_ERROR) and supports onRetry', () => {
    const onOpenSettings = vi.fn()
    const onRetry = vi.fn()
    const genericErrorMsg: ChatMessageItem = {
      id: 'msg-err-3',
      role: 'assistant',
      content: 'Falha desconhecida',
      blocks: [
        {
          id: 'b-err-3',
          type: 'error',
          code: 'AGENT_ERROR',
          message: 'Falha interna do SQLite'
        }
      ],
      steps: [],
      timestamp: Date.now(),
      isStreaming: false
    }

    render(
      <ChatMessage
        message={genericErrorMsg}
        onOpenSettings={onOpenSettings}
        onRetry={onRetry}
      />
    )

    // Configurar Provedor DEVE estar presente mesmo em erro genérico
    const configBtn = screen.getByRole('button', { name: /Configurar Provedor/i })
    expect(configBtn).toBeInTheDocument()
    fireEvent.click(configBtn)
    expect(onOpenSettings).toHaveBeenCalled()

    // Regenerar DEVE estar disponível na barra de ações
    const retryBtn = screen.getByRole('button', { name: /Regenerar/i })
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalled()
  })
})
