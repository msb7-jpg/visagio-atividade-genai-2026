import { Calendar, Clock, DollarSign, Film, Star, User } from 'lucide-react'

import type { MovieDetailDTO } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'

interface MoviePreviewCardProps {
  movie?: MovieDetailDTO | null
  isLoading?: boolean
  error?: Error | null
  className?: string
}

function formatBRL(value?: number | null): string {
  if (value === null || value === undefined) return 'N/D'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Conteúdo visual puro do card de detalhes do filme (poster, sinopse, notas e dados financeiros).
 */
export function MoviePreviewCard({ movie, isLoading, error, className }: MoviePreviewCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'w-80 rounded-xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md',
          'animate-pulse space-y-3',
          className
        )}
      >
        <div className="flex gap-3">
          <div className="h-28 w-20 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </div>
        <div className="h-12 w-full rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="h-6 rounded bg-muted" />
          <div className="h-6 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div
        className={cn(
          'w-72 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md text-xs text-muted-foreground',
          className
        )}
      >
        <div className="flex items-center gap-2 text-destructive font-medium">
          <Film className="size-4" />
          <span>Informações indisponíveis</span>
        </div>
        <p className="mt-1 text-xs">
          Não foi possível carregar os detalhes do filme no catálogo analítico.
        </p>
      </div>
    )
  }

  const {
    titulo,
    ano_lancamento,
    duracao_minutos,
    sinopse,
    url_poster,
    generos = [],
    diretores = [],
    nota_imdb,
    qtd_imdb,
    nota_tmdb,
    qtd_tmdb,
    receita_brl,
    lucro_brl
  } = movie

  return (
    <div
      className={cn(
        'w-84 overflow-hidden rounded-xl border border-border/70 bg-card/95 p-4 text-foreground shadow-2xl backdrop-blur-xl',
        'ring-1 ring-border/20 transition-all select-none',
        className
      )}
    >
      {/* Top Header com Poster e Metadados Principais */}
      <div className="flex gap-3.5">
        {url_poster ? (
          <img
            src={url_poster}
            alt={titulo}
            className="h-32 w-20 shrink-0 rounded-lg object-cover shadow-md ring-1 ring-border/30 bg-muted"
            loading="lazy"
          />
        ) : (
          <div className="flex h-32 w-20 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground border border-border/40">
            <Film className="size-8 opacity-40" />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <div>
            <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
              {titulo}
            </h4>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {ano_lancamento ? (
                <span className="flex items-center gap-0.5">
                  <Calendar className="size-3" />
                  {ano_lancamento}
                </span>
              ) : null}
              {duracao_minutos ? (
                <span className="flex items-center gap-0.5">
                  <Clock className="size-3" />
                  {duracao_minutos} min
                </span>
              ) : null}
            </div>

            {diretores.length > 0 ? (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                <User className="size-3 shrink-0" />
                <span className="truncate">{diretores.join(', ')}</span>
              </div>
            ) : null}
          </div>

          {/* Badges de Notas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            {nota_imdb !== null && nota_imdb !== undefined ? (
              <div className="flex items-center gap-1 rounded-md bg-accent-amber/15 px-1.5 py-0.5 text-xs font-semibold text-accent-amber border border-accent-amber/30">
                <Star className="size-2.5 fill-accent-amber" />
                <span>IMDb {nota_imdb.toFixed(1)}</span>
                {qtd_imdb ? (
                  <span className="text-xs text-accent-amber/80 font-normal">
                    ({(qtd_imdb / 1000).toFixed(0)}k)
                  </span>
                ) : null}
              </div>
            ) : null}

            {nota_tmdb !== null && nota_tmdb !== undefined ? (
              <div className="flex items-center gap-1 rounded-md bg-accent-cyan/15 px-1.5 py-0.5 text-xs font-semibold text-accent-cyan border border-accent-cyan/30">
                <Star className="size-2.5 fill-accent-cyan" />
                <span>TMDB {nota_tmdb.toFixed(1)}</span>
                {qtd_tmdb ? (
                  <span className="text-xs text-accent-cyan/80 font-normal">
                    ({(qtd_tmdb / 1000).toFixed(0)}k)
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Gêneros */}
      {generos.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {generos.slice(0, 4).map((genero) => (
            <span
              key={genero}
              className="rounded-full bg-secondary/80 px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {genero}
            </span>
          ))}
        </div>
      ) : null}

      {/* Sinopse */}
      {sinopse ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
          {sinopse}
        </p>
      ) : null}

      {/* Finanças (Receita e Lucro em BRL) */}
      {receita_brl || lucro_brl ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/40 pt-2 text-xs">
          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <DollarSign className="size-2.5" />
              Receita
            </span>
            <span className="font-semibold text-foreground text-xs">
              {formatBRL(receita_brl)}
            </span>
          </div>

          <div>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <DollarSign className="size-2.5" />
              Lucro
            </span>
            <span
              className={cn(
                'font-semibold text-xs',
                (lucro_brl ?? 0) >= 0 ? 'text-accent-emerald' : 'text-destructive'
              )}
            >
              {formatBRL(lucro_brl)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
