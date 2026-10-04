import { ChatInput } from '@/features/chat/components/input/ChatInput'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('ChatInput Component', () => {
  it('renderiza o botão de envio desabilitado quando o input está vazio', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i })
    expect(sendButton).toBeDisabled()
  })

  it('habilita o envio quando há texto digitado e dispara callback ao clicar', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    fireEvent.change(input, { target: { value: 'Quais os maiores sucessos de 2024?' } })

    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i })
    expect(sendButton).toBeEnabled()

    fireEvent.click(sendButton)
    expect(onSendMock).toHaveBeenCalledWith('Quais os maiores sucessos de 2024?')
    expect(input).toHaveValue('')
  })

  it('submete texto ao pressionar tecla Enter', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    fireEvent.change(input, { target: { value: 'Consulta rápida' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    expect(onSendMock).toHaveBeenCalledWith('Consulta rápida')
  })

  it('exibe botão de pausa quando isStreaming for verdadeiro e aciona onAbortStream no clique', () => {
    const onSendMock = vi.fn()
    const onAbortMock = vi.fn()

    render(
      <ChatInput
        onSendMessage={onSendMock}
        onAbortStream={onAbortMock}
        isStreaming
      />
    )

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    expect(input).toBeDisabled()

    const pauseButton = screen.getByRole('button', { name: /cancelar geração/i })
    expect(pauseButton).toBeInTheDocument()
    expect(pauseButton).toBeEnabled()

    fireEvent.click(pauseButton)
    expect(onAbortMock).toHaveBeenCalledTimes(1)
  })
})
