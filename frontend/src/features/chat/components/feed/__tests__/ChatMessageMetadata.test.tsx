import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '../ChatMessage'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'

describe('ChatMessage Provider and Model Metadata', () => {
  it('renders provider and model metadata in assistant message footer', () => {
    const assistantMsg: ChatMessageItem = {
      id: 'msg-assist-1',
      role: 'assistant',
      content: 'Aqui está a análise do catálogo.',
      blocks: [
        {
          id: 'b-txt-1',
          type: 'text',
          content: 'Aqui está a análise do catálogo.'
        }
      ],
      steps: [],
      timestamp: Date.now(),
      isStreaming: false,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile'
    }

    render(<ChatMessage message={assistantMsg} />)

    expect(screen.getByText(/groq/i)).toBeInTheDocument()
    expect(screen.getByText(/llama-3.3-70b-versatile/i)).toBeInTheDocument()
  })

  it('does not render provider and model for user messages', () => {
    const userMsg: ChatMessageItem = {
      id: 'msg-user-1',
      role: 'user',
      content: 'Qual o filme mais assistido?',
      blocks: [],
      steps: [],
      timestamp: Date.now(),
      provider: 'groq',
      model: 'llama-3.3-70b-versatile'
    }

    render(<ChatMessage message={userMsg} />)

    expect(screen.queryByText('GROQ')).not.toBeInTheDocument()
    expect(screen.queryByText('• llama-3.3-70b-versatile')).not.toBeInTheDocument()
  })

  it('renders NodeStepper immediately when streaming starts even if steps is empty (no dead period)', () => {
    const streamingMsg: ChatMessageItem = {
      id: 'msg-assist-streaming',
      role: 'assistant',
      content: '',
      blocks: [],
      steps: [],
      timestamp: Date.now(),
      isStreaming: true
    }

    render(<ChatMessage message={streamingMsg} />)

    expect(screen.getByText('Etapas de Processamento')).toBeInTheDocument()
    expect(screen.getByText('Iniciando raciocínio analítico...')).toBeInTheDocument()
  })
})
