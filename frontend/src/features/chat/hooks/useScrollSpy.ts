import { useEffect, useState } from 'react'

export function useScrollSpy(itemIds: string[], offset = 100) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (itemIds.length === 0) {
      setActiveId(null)
      return
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset

      for (let index = itemIds.length - 1; index >= 0; index--) {
        const id = itemIds[index]
        const element = document.getElementById(id)
        if (element) {
          const top = element.getBoundingClientRect().top + window.scrollY
          if (scrollPosition >= top - 50) {
            setActiveId(id)
            return
          }
        }
      }

      setActiveId(itemIds[0])
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [itemIds, offset])

  const scrollToItem = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  return { activeId, scrollToItem }
}
