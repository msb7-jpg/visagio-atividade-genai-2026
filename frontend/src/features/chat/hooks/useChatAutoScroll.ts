import { useEffect, type RefObject } from 'react'

/**
 * Hook especialista para garantir auto-scroll suave até o final da conversa quando novas mensagens chegam.
 *
 * @param targetRef - Referência ao elemento de ancoragem no final do chat.
 * @param trigger - Dependência reativa (ex.: lista de mensagens).
 */
export function useChatAutoScroll(targetRef: RefObject<HTMLDivElement | null>, trigger: unknown): void {
  useEffect(() => {
    targetRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [targetRef, trigger])
}
