import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { describe, expect, it } from 'vitest'
import { MoviePreviewCard } from '@/features/chat/components/tooltip/MoviePreviewCard'
import { MovieTooltipCard } from '@/features/chat/components/tooltip/MovieTooltipCard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
})

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('MoviePreviewCard', () => {
  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<MoviePreviewCard isLoading />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error state when error is provided', () => {
    render(<MoviePreviewCard error={new Error('Failed')} />)
    expect(screen.getByText('Informações indisponíveis')).toBeInTheDocument()
  })

  it('renders complete movie data with poster, ratings and BRL finances', () => {
    const mockMovie = {
      sk_movie_id: 'test-123',
      id_filme: '456',
      titulo: 'Interestelar',
      ano_lancamento: 2014,
      duracao_minutos: 169,
      status_filme: 'Lançado',
      sinopse: 'As aventuras de um grupo de exploradores espaciais.',
      url_poster: 'https://image.tmdb.org/poster.jpg',
      url_backdrop: null,
      generos: ['Ficção Científica', 'Drama'],
      diretores: ['Christopher Nolan'],
      nota_imdb: 8.7,
      qtd_imdb: 1800000,
      nota_tmdb: 8.4,
      qtd_tmdb: 34000,
      receita_brl: 3500000000,
      orcamento_brl: 800000000,
      lucro_brl: 2700000000
    }

    render(<MoviePreviewCard movie={mockMovie} />)

    expect(screen.getByText('Interestelar')).toBeInTheDocument()
    expect(screen.getByText('2014')).toBeInTheDocument()
    expect(screen.getByText('169 min')).toBeInTheDocument()
    expect(screen.getByText('Christopher Nolan')).toBeInTheDocument()
    expect(screen.getByText(/IMDb 8.7/)).toBeInTheDocument()
    expect(screen.getByText(/TMDB 8.4/)).toBeInTheDocument()
    expect(screen.getByText('Ficção Científica')).toBeInTheDocument()
    expect(screen.getByText('As aventuras de um grupo de exploradores espaciais.')).toBeInTheDocument()
    expect(screen.getByText('Receita')).toBeInTheDocument()
    expect(screen.getByText('Lucro')).toBeInTheDocument()
  })
})

describe('MovieTooltipCard', () => {
  it('renders children trigger element', () => {
    renderWithClient(
      <MovieTooltipCard movieId="test-movie-id">
        <span>Avatar: O Caminho da Água</span>
      </MovieTooltipCard>
    )

    expect(screen.getByText('Avatar: O Caminho da Água')).toBeInTheDocument()
  })

  it('triggers mouse enter without crashing', () => {
    renderWithClient(
      <MovieTooltipCard movieId="test-movie-id">
        <span data-testid="movie-trigger">Avatar</span>
      </MovieTooltipCard>
    )

    const trigger = screen.getByTestId('movie-trigger')
    fireEvent.mouseEnter(trigger, { clientX: 200, clientY: 200 })
    expect(trigger).toBeInTheDocument()
  })
})
