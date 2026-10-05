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

  it('desabilita input e botão de envio sem exibir botão de pausa quando disabled for verdadeiro e isStreaming for falso', () => {
    const onSendMock = vi.fn()
    const onAbortMock = vi.fn()

    render(
      <ChatInput
        onSendMessage={onSendMock}
        onAbortStream={onAbortMock}
        isStreaming={false}
        disabled
      />
    )

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    expect(input).toBeDisabled()

    // Não deve exibir o botão de pausa quando não há streaming ativo
    expect(screen.queryByRole('button', { name: /cancelar geração/i })).not.toBeInTheDocument()

    // Deve exibir o botão de envio padrão, porém desabilitado
    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i })
    expect(sendButton).toBeInTheDocument()
    expect(sendButton).toBeDisabled()
  })

  it('exibe menu flutuante de comandos ao digitar / e seleciona comando ao clicar', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    fireEvent.change(input, { target: { value: '/' } })

    const menu = screen.getByTestId('slash-command-menu')
    expect(menu).toBeInTheDocument()
    expect(screen.getByText('/chart')).toBeInTheDocument()
    expect(screen.getByText('/clear')).toBeInTheDocument()

    const chartBtn = screen.getByRole('button', { name: /\/chart/i })
    fireEvent.click(chartBtn)

    const pill = screen.getByTestId('input-command-pill')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveTextContent('/chart')
    expect(input).toHaveValue('')
  })

  it('navega pelas sugestões de comandos via teclado (ArrowDown e Enter)', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    fireEvent.change(input, { target: { value: '/' } })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    const pill = screen.getByTestId('input-command-pill')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveTextContent('/clear')
  })

  it('abre e fecha o menu de comandos ao clicar no botão Plus', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const plusBtn = screen.getByRole('button', { name: /abrir comandos rápidos/i })
    expect(plusBtn).toBeInTheDocument()

    fireEvent.click(plusBtn)
    expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument()

    fireEvent.click(plusBtn)
    expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument()
  })

  it('permite remover a pill de comando ao clicar no botão de fechar (X)', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const plusBtn = screen.getByRole('button', { name: /abrir comandos rápidos/i })
    fireEvent.click(plusBtn)

    const chartBtn = screen.getByRole('button', { name: /\/chart/i })
    fireEvent.click(chartBtn)

    const pill = screen.getByTestId('input-command-pill')
    expect(pill).toBeInTheDocument()

    const removeBtn = screen.getByRole('button', { name: /remover comando/i })
    fireEvent.click(removeBtn)

    expect(screen.queryByTestId('input-command-pill')).not.toBeInTheDocument()
  })

  it('submete comando ativo concatenado com o texto digitado', () => {
    const onSendMock = vi.fn()
    render(<ChatInput onSendMessage={onSendMock} isStreaming={false} />)

    const input = screen.getByPlaceholderText(/faça uma pergunta/i)
    fireEvent.change(input, { target: { value: '/' } })

    const chartBtn = screen.getByRole('button', { name: /\/chart/i })
    fireEvent.click(chartBtn)

    const inputAfter = screen.getByPlaceholderText(/digite a pergunta ou parâmetros/i)
    fireEvent.change(inputAfter, { target: { value: 'bar bilheteria por ano' } })

    const sendButton = screen.getByRole('button', { name: /enviar mensagem/i })
    fireEvent.click(sendButton)

    expect(onSendMock).toHaveBeenCalledWith('/chart bar bilheteria por ano')
  })
})
