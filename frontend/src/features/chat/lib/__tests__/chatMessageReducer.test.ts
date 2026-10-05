import { applyAbortToMessage, applySseEventToMessage } from '@/features/chat/lib/chatMessageReducer'
import {
  CHAT_BLOCK_TYPE,
  SSE_EVENT,
  STEP_STATUS,
  type ChatBlockThought,
  type ChatMessageItem
} from '@/features/chat/types/chat.types'
import { describe, expect, it } from 'vitest'

describe('chatMessageReducer - handleThought', () => {
  const baseMessage: ChatMessageItem = {
    id: 'msg-1',
    role: 'assistant',
    content: '',
    blocks: [],
    steps: [],
    timestamp: Date.now()
  }

  it('cria bloco de pensamento na primeira ocorrência de evento thought', () => {
    const updated = applySseEventToMessage(baseMessage, SSE_EVENT.THOUGHT, {
      thought: '[RAG]\nBuscando sinopses'
    })

    expect(updated.blocks).toHaveLength(1)
    const thoughtBlock = updated.blocks[0] as ChatBlockThought
    expect(thoughtBlock.type).toBe(CHAT_BLOCK_TYPE.THOUGHT)
    expect(thoughtBlock.content).toBe('[RAG]\nBuscando sinopses')
  })

  it('concatena pensamentos subsequentes preservando reflexões anteriores', () => {
    const msg1 = applySseEventToMessage(baseMessage, SSE_EVENT.THOUGHT, {
      thought: '[RAG]\nBuscando sinopses'
    })
    const msg2 = applySseEventToMessage(msg1, SSE_EVENT.THOUGHT, {
      thought: '[SQL]\nPlanejando consulta de bilheteria'
    })

    expect(msg2.blocks).toHaveLength(1)
    const thoughtBlock = msg2.blocks[0] as ChatBlockThought
    expect(thoughtBlock.content).toBe(
      '[RAG]\nBuscando sinopses\n\n[SQL]\nPlanejando consulta de bilheteria'
    )
  })

  it('evita duplicação ao receber o mesmo pensamento repetido', () => {
    const msg1 = applySseEventToMessage(baseMessage, SSE_EVENT.THOUGHT, {
      thought: '[SQL]\nPlanejando consulta'
    })
    const msg2 = applySseEventToMessage(msg1, SSE_EVENT.THOUGHT, {
      thought: '[SQL]\nPlanejando consulta'
    })

    expect(msg2.blocks).toHaveLength(1)
    const thoughtBlock = msg2.blocks[0] as ChatBlockThought
    expect(thoughtBlock.content).toBe('[SQL]\nPlanejando consulta')
  })
})

describe('chatMessageReducer - applyAbortToMessage', () => {
  const baseMessage: ChatMessageItem = {
    id: 'msg-abort-test',
    role: 'assistant',
    content: '',
    blocks: [],
    steps: [
      { step: 'router', label: 'Classificando intenção', status: STEP_STATUS.DONE, duration_ms: 120 }
    ],
    timestamp: Date.now()
  }

  it('anexa etapa de interrupção quando os passos anteriores já foram concluídos', () => {
    const aborted = applyAbortToMessage(baseMessage)

    expect(aborted.steps).toHaveLength(2)
    expect(aborted.steps[1]).toEqual({
      step: 'interrupted',
      label: 'Processamento interrompido',
      status: STEP_STATUS.ERROR
    })
  })

  it('é estritamente idempotente e não duplica a etapa Processamento interrompido quando invocado múltiplas vezes', () => {
    const firstAbort = applyAbortToMessage(baseMessage)
    const secondAbort = applyAbortToMessage(firstAbort)
    const thirdAbort = applyAbortToMessage(secondAbort)

    const interruptedSteps = thirdAbort.steps.filter((stepItem) => stepItem.step === 'interrupted')
    expect(interruptedSteps).toHaveLength(1)
    expect(thirdAbort.steps).toHaveLength(2)
  })

  it('não anexa etapa extra caso uma etapa em andamento já tenha sido marcada como interrompida', () => {
    const activeMessage: ChatMessageItem = {
      ...baseMessage,
      steps: [
        { step: 'router', label: 'Classificando intenção', status: STEP_STATUS.DONE },
        { step: 'sql_generator', label: 'Gerando consulta SQL', status: STEP_STATUS.ACTIVE }
      ]
    }

    const firstAbort = applyAbortToMessage(activeMessage)
    expect(firstAbort.steps).toHaveLength(2)
    expect(firstAbort.steps[1].label).toBe('Gerando consulta SQL (interrompido)')
    expect(firstAbort.steps[1].status).toBe(STEP_STATUS.ERROR)

    // Segunda chamada simulada pelo bloco catch
    const secondAbort = applyAbortToMessage(firstAbort)
    expect(secondAbort.steps).toHaveLength(2)
    expect(secondAbort.steps.some((stepItem) => stepItem.step === 'interrupted')).toBe(false)
  })
})
