import type { AgentStepItem } from '@/features/chat/types/chat.types'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NodeStepper } from '../NodeStepper'

describe('NodeStepper', () => {
  it('renderiza nada quando a lista de passos está vazia', () => {
    const { container } = render(<NodeStepper steps={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza os passos com seus respectivos rótulos e durações quando expandido', () => {
    const steps: AgentStepItem[] = [
      { step: 'router', label: 'Classificando intenção', status: 'done', duration_ms: 12 },
      { step: 'sql_generator', label: 'Escrevendo consulta SQL', status: 'active' },
      { step: 'sql_executor', label: 'Executando no cinerocket.db', status: 'pending' },
    ]

    render(<NodeStepper steps={steps} isStreaming />)

    expect(screen.getByText('Classificando intenção')).toBeInTheDocument()
    expect(screen.getByText('12ms')).toBeInTheDocument()
    expect(screen.getByText('Escrevendo consulta SQL')).toBeInTheDocument()
    expect(screen.getByText('Executando no cinerocket.db')).toBeInTheDocument()
  })

  it('renderiza o primeiro passo em loading quando inicia streaming sem passos', () => {
    render(<NodeStepper steps={[]} isStreaming />)

    expect(screen.getByText('Etapas de Processamento')).toBeInTheDocument()
    expect(screen.getByText('Iniciando raciocínio analítico...')).toBeInTheDocument()
  })

  it('adiciona indicador de próxima etapa dinamicamente quando a última etapa recebida foi concluída em streaming', () => {
    const steps: AgentStepItem[] = [
      { step: 'custom_semantic_step', label: 'Verificando regras de negócio', status: 'done', duration_ms: 45 }
    ]
    render(<NodeStepper steps={steps} isStreaming />)

    expect(screen.getByText('Verificando regras de negócio')).toBeInTheDocument()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('permite expandir e recolher manualmente pelo clique no cabeçalho', () => {
    const steps: AgentStepItem[] = [
      { step: 'router', label: 'Classificando intenção', status: 'done', duration_ms: 12 }
    ]
    render(<NodeStepper steps={steps} isStreaming={false} />)

    // Inicia recolhido quando isStreaming=false
    expect(screen.queryByText('Classificando intenção')).not.toBeInTheDocument()
    expect(screen.getByText('(clique para expandir)')).toBeInTheDocument()

    // Clica para expandir
    const trigger = screen.getByRole('button', { name: /alternar exibição das etapas de processamento/i })
    fireEvent.click(trigger)

    expect(screen.getByText('Classificando intenção')).toBeInTheDocument()
    expect(screen.getByText('(clique para recolher)')).toBeInTheDocument()
  })

  it('fecha automaticamente quando o streaming finaliza', () => {
    const steps: AgentStepItem[] = [
      { step: 'router', label: 'Classificando intenção', status: 'done', duration_ms: 12 }
    ]
    const { rerender } = render(<NodeStepper steps={steps} isStreaming />)

    // Aberto durante streaming
    expect(screen.getByText('Classificando intenção')).toBeInTheDocument()

    // Streaming finaliza
    rerender(<NodeStepper steps={steps} isStreaming={false} />)

    // Agora deve estar colapsado automaticamente
    expect(screen.queryByText('Classificando intenção')).not.toBeInTheDocument()
    expect(screen.getByText('(clique para expandir)')).toBeInTheDocument()
  })
})
