import { MESSAGE_ROLE, type ChatMessageItem } from '@/features/chat/types/chat.types'

/**
 * Encontra a pergunta original do usuário imediatamente anterior à mensagem do assistente.
 *
 * Percorre o histórico de mensagens em ordem inversa a partir do índice da mensagem alvo.
 *
 * @param messages - Histórico ordenado de mensagens da conversa.
 * @param assistantMessageId - Identificador único da mensagem do assistente.
 * @returns Texto da pergunta enviada pelo usuário ou nulo se não for localizada.
 */
export function findPrecedingUserPrompt(
  messages: ChatMessageItem[],
  assistantMessageId: string
): string | null {
  const assistantIndex = messages.findIndex((msg) => msg.id === assistantMessageId)
  if (assistantIndex === -1) return null

  for (let index = assistantIndex - 1; index >= 0; index--) {
    if (messages[index].role === MESSAGE_ROLE.USER) {
      return messages[index].content
    }
  }

  return null
}
