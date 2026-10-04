import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { fetchMovieDetails, movieQueryKeys } from '@/features/chat/api/moviesApi'
import type { MovieDetailDTO } from '@/features/chat/types/chat.types'

const ONE_HOUR_MS = 1000 * 60 * 60

/**
 * Hook para consulta e pré-carregamento dos detalhes de um filme no CineData.
 *
 * @param movieId - Surrogate key ou ID do filme.
 * @param enabled - Booleano para disparar a busca ativa.
 */
export function useMovieDetailsQuery(movieId: string | null | undefined, enabled = false) {
  const queryClient = useQueryClient()

  const query = useQuery<MovieDetailDTO, Error>({
    queryKey: movieQueryKeys.movieDetail(movieId ?? ''),
    queryFn: () => {
      if (!movieId) throw new Error('ID do filme não fornecido')
      return fetchMovieDetails(movieId)
    },
    enabled: Boolean(movieId && enabled),
    staleTime: ONE_HOUR_MS,
    gcTime: ONE_HOUR_MS * 2
  })

  const prefetch = useCallback(() => {
    if (!movieId) return
    void queryClient.prefetchQuery({
      queryKey: movieQueryKeys.movieDetail(movieId),
      queryFn: () => fetchMovieDetails(movieId),
      staleTime: ONE_HOUR_MS
    })
  }, [movieId, queryClient])

  return {
    ...query,
    prefetch
  }
}
