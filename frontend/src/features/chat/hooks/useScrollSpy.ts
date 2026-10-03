import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Objeto de retorno do hook useScrollSpy contendo o elemento ativo e método de rolagem.
 */
export interface UseScrollSpyResult {
  /** Identificador do item atualmente visível na viewport ou o mais recente. */
  activeId: string | null
  /** Rola suavemente até o elemento identificado pelo ID. */
  scrollToItem: (id: string) => void
  /** Força programaticamente a definição do ID ativo. */
  setActiveId: Dispatch<SetStateAction<string | null>>
}

/**
 * Hook para espionar a rolagem de mensagens utilizando IntersectionObserver e sincronizar a linha do tempo ativa.
 *
 * @param itemIds - Lista de identificadores de elementos a serem observados no container.
 * @param containerSelector - Seletor CSS do elemento container com rolagem.
 * @returns Objeto com o identificador ativo e funções de navegação suave.
 */
export function useScrollSpy(
  itemIds: string[],
  containerSelector = '[data-chat-scroll-container]'
): UseScrollSpyResult {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (itemIds.length === 0) {
      return
    }

    const scrollContainer = document.querySelector(containerSelector)
    const elements = itemIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) {
      return
    }

    // Configura IntersectionObserver para detectar qual mensagem está visível
    const observer = new IntersectionObserver(
      (entries) => {
        // Encontra as entradas que estão interceptando
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          // Pega a entrada visível mais próxima do topo da área de visualização
          const sorted = [...visibleEntries].sort(
            (entryA, entryB) => entryA.boundingClientRect.top - entryB.boundingClientRect.top
          )
          const targetId = sorted[0].target.id
          if (targetId) {
            setInternalActiveId(targetId)
          }
        }
      },
      {
        root: scrollContainer,
        rootMargin: '0px 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 1.0]
      }
    )

    elements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [itemIds, containerSelector])

  let activeId: string | null = null
  if (itemIds.length > 0) {
    if (internalActiveId && itemIds.includes(internalActiveId)) {
      activeId = internalActiveId
    } else {
      activeId = itemIds[itemIds.length - 1]
    }
  }

  const scrollToItem = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setInternalActiveId(id)
    }
  }

  return { activeId, scrollToItem, setActiveId: setInternalActiveId }
}
