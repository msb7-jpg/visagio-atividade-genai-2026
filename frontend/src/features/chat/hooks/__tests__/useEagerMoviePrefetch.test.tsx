import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'

import * as moviesApi from '@/features/chat/api/moviesApi'
import { extractMovieIdsFromContent, useEagerMoviePrefetch } from '../useEagerMoviePrefetch'

describe('useEagerMoviePrefetch', () => {
  it('correctly extracts movie IDs from Markdown format and alternative format', () => {
    const text = `
    Destaque para [Avatar](movie:sk-avatar-123) e [Titanic](movie:sk-titanic-456).
    E também (Interestelar)[sk-interstellar-789] e duplicado [Avatar](movie:sk-avatar-123).
    `
    const ids = extractMovieIdsFromContent(text)
    expect(ids).toEqual(['sk-avatar-123', 'sk-titanic-456', 'sk-interstellar-789'])
  })

  it('prefetches movie details for each detected ID', async () => {
    const prefetchSpy = vi.spyOn(moviesApi, 'fetchMovieDetails').mockResolvedValue({
      sk_movie_id: 'sk-avatar-123',
      id_filme: '1',
      titulo: 'Avatar',
      ano_lancamento: 2009,
      duracao_minutos: 162,
      status_filme: 'Lançado',
      sinopse: 'Um fuzileiro no planeta Pandora.',
      url_poster: null,
      url_backdrop: null,
      generos: ['Ficção Científica'],
      diretores: ['James Cameron'],
      nota_imdb: 7.9,
      qtd_imdb: 1200000,
      nota_tmdb: 7.5,
      qtd_tmdb: 28000,
      receita_brl: 15000000000,
      orcamento_brl: 1200000000,
      lucro_brl: 13800000000
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const content = 'Confira [Avatar](movie:sk-avatar-123) na lista.'
    const { result } = renderHook(() => useEagerMoviePrefetch(content), { wrapper })

    expect(result.current).toEqual(['sk-avatar-123'])

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalledWith('sk-avatar-123')
    })

    prefetchSpy.mockRestore()
  })
})
