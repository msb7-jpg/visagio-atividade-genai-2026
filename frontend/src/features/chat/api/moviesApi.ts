import type { MovieDetailDTO } from '@/features/chat/types/chat.types'
import { apiClient } from '@/lib/api-client'

export const movieQueryKeys = {
  movieDetail: (id: string) => ['movies', 'detail', id] as const
}

/**
 * Busca detalhes cadastrais, financeiros e notas de um filme pelo id ou sk_movie_id.
 *
 * @param movieId - Identificador ou Surrogate Key do filme.
 * @returns Detalhes do filme MovieDetailDTO.
 */
export async function fetchMovieDetails(movieId: string): Promise<MovieDetailDTO> {
  return apiClient<MovieDetailDTO>(`/analytics/movies/${encodeURIComponent(movieId)}`)
}
