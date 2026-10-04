import { applySseEventToMessage } from '@/features/chat/lib/chatMessageReducer'
import {
  CHAT_BLOCK_TYPE,
  SSE_EVENT,
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
