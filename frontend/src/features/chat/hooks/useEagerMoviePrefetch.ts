import { useEffect, useMemo } from 'react'

import { fetchMovieDetails, movieQueryKeys } from '@/features/chat/api/moviesApi'
import { queryClient as defaultQueryClient } from '@/lib/query-client'

const ONE_HOUR_MS = 1000 * 60 * 60

/**
 * Expressões regulares para extrair IDs de filmes tanto de formato Markdown
 * `[Nome](movie:id)` quanto do formato alternativo `(Nome)[id]`.
 */
const MOVIE_MARKDOWN_REGEX = /\[(?:[^\]]+)\]\(movie:([a-zA-Z0-9_\-:]+)\)/g
const MOVIE_ALT_REGEX = /\((?:[^)]+)\)\[([a-zA-Z0-9_\-:]+)\]/g

/**
 * Extrai todos os IDs únicos de filmes presentes em uma string de texto.
 *
 * @param content - Conteúdo textual contendo links de filmes.
 * @returns Array com IDs únicos de filmes encontrados.
 */
export function extractMovieIdsFromContent(content?: string | null): string[] {
  if (!content) return []

  const ids = new Set<string>()

  const matchesMarkdown = content.matchAll(MOVIE_MARKDOWN_REGEX)
  for (const match of matchesMarkdown) {
    if (match[1]) {
      ids.add(match[1])
    }
  }

  const matchesAlt = content.matchAll(MOVIE_ALT_REGEX)
  for (const match of matchesAlt) {
    if (match[1]) {
      ids.add(match[1])
    }
  }

  return Array.from(ids)
}

/**
 * Hook para pré-carregamento eager de todos os filmes encontrados no conteúdo textual.
 * Popula ativamente o cache do TanStack Query para que no hover o tooltip apareça instantaneamente.
 *
 * @param content - Conteúdo Markdown ou texto bruto da resposta do agente.
 */
export function useEagerMoviePrefetch(content?: string | null) {
  const movieIds = useMemo(() => extractMovieIdsFromContent(content), [content])

  useEffect(() => {
    if (movieIds.length === 0) return

    for (const movieId of movieIds) {
      void defaultQueryClient.prefetchQuery({
        queryKey: movieQueryKeys.movieDetail(movieId),
        queryFn: () => fetchMovieDetails(movieId),
        staleTime: ONE_HOUR_MS
      })
    }
  }, [movieIds])

  return movieIds
}
