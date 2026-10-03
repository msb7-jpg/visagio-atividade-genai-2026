import { useEffect, type JSX } from 'react'

/**
 * Propriedades para exibição animada do título da conversa ativa.
 */
export interface AnimatedTitleProps {
  /** Título dinâmico da thread ou nulo. */
  title: string | null
  /**
   * Título padrão a ser exibido caso a thread ainda não tenha título específico.
   * @defaultValue `'CineData Analytics'`
   */
  fallbackTitle?: string
}

/**
 * Título do cabeçalho que atualiza o título do documento HTML e renderiza com transição suave.
 *
 * @param props - Propriedades contendo o título da thread e fallback.
 * @returns Elemento JSX com o texto do título truncado e animado.
 */
export function AnimatedTitle({
  title,
  fallbackTitle = 'CineData Analytics'
}: AnimatedTitleProps): JSX.Element {
  const displayTitle = title || fallbackTitle

  useEffect(() => {
    document.title = `${displayTitle} | CineData`
  }, [displayTitle])

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span
        key={displayTitle}
        className="animate-fade-in truncate text-sm font-semibold text-foreground tracking-wide transition-all duration-300"
      >
        {displayTitle}
      </span>
    </div>
  )
}
