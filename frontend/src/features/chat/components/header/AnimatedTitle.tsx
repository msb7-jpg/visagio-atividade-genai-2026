import { useEffect } from 'react'

export interface AnimatedTitleProps {
  title: string | null
  fallbackTitle?: string
}

export function AnimatedTitle({
  title,
  fallbackTitle = 'CineData Analytics'
}: AnimatedTitleProps) {
  const displayTitle = title || fallbackTitle

  useEffect(() => {
    document.title = `${displayTitle} | CineData`
  }, [displayTitle])

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span
        key={displayTitle}
        className="animate-fade-in truncate text-sm font-semibold text-zinc-200 tracking-wide transition-all duration-300"
      >
        {displayTitle}
      </span>
    </div>
  )
}
