import { threadsQueryOptions } from '@/features/chat/api/threadsApi'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

/**
 * Hook do TanStack Query para listar o catálogo histórico de conversas do usuário salvas no SQLite.
 *
 * @param limit - Limite máximo de conversas retornadas (padrão: 50).
 * @param offset - Deslocamento inicial para paginação (padrão: 0).
 * @returns Objeto UseQueryResult contendo lista de threads, estados de carregamento e eventuais erros.
 */
export function useThreadsQuery(limit = 50, offset = 0): UseQueryResult<ThreadSummary[], Error> {
  return useQuery(threadsQueryOptions(limit, offset))
}
