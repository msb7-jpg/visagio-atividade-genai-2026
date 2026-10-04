import type React from 'react'

import { Tooltip } from '@/components/ui/tooltip-card'
import { MoviePreviewCard } from '@/features/chat/components/tooltip/MoviePreviewCard'
import { useMovieDetailsQuery } from '@/features/chat/hooks/useMovieDetailsQuery'
import { cn } from '@/lib/utils'

interface MovieTooltipCardProps {
  movieId: string
  children: React.ReactNode
  className?: string
}

/**
 * Componente orquestrador de tooltip card de filmes utilizando o componente Tooltip do shadcn.
 * Combina prefetch do TanStack Query com a animação de mola, cálculo de viewport e portal do Tooltip.
 */
export function MovieTooltipCard({ movieId, children, className }: MovieTooltipCardProps) {
  // Com eager prefetch ativo no MarkdownRenderer, a query com enabled: true
  // resolve instantaneamente da memória de cache do TanStack sem espera adicional.
  const { data: movie, isLoading, error, prefetch } = useMovieDetailsQuery(movieId, true)

  const content = (
    <MoviePreviewCard
      movie={movie}
      isLoading={isLoading}
      error={error}
    />
  )

  return (
    <Tooltip
      content={content}
      containerClassName={cn('inline-block cursor-pointer align-baseline', className)}
    >
      <span
        onMouseEnter={() => prefetch()}
        className="inline-block"
      >
        {children}
      </span>
    </Tooltip>
  )
}
