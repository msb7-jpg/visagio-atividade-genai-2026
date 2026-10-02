import type { QueryKey } from '@tanstack/react-query'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Rota para redirecionamento automático após sucesso da mutação */
      redirectOnSuccess?: string | ((data: unknown) => string)
      /** Se o redirecionamento deve substituir o histórico (padrão: true) */
      replace?: boolean
      /** Chaves de queries a serem invalidadas após o sucesso da mutação */
      invalidates?: QueryKey[]
      /** Mensagem informativa de sucesso para feedbacks */
      successMessage?: string
    }
  }
}
