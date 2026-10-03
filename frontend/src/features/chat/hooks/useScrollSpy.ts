import { useEffect, useState } from 'react'

export function useScrollSpy(itemIds: string[], containerSelector = '[data-chat-scroll-container]') {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (itemIds.length === 0) {
      setActiveId(null)
      return
    }

    const scrollContainer = document.querySelector(containerSelector)
    const elements = itemIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) {
      // Se os elementos ainda não renderizaram, marca por padrão o último item enviado
      setActiveId(itemIds[itemIds.length - 1])
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
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )
          const targetId = sorted[0].target.id
          if (targetId) {
            setActiveId(targetId)
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

    // Se nenhum item estiver ativo ou se o activeId atual não existir nos itemIds, ativa o último item
    setActiveId((prev) => (prev && itemIds.includes(prev) ? prev : itemIds[itemIds.length - 1]))

    return () => {
      observer.disconnect()
    }
  }, [itemIds, containerSelector])

  const scrollToItem = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  return { activeId, scrollToItem, setActiveId }
}
