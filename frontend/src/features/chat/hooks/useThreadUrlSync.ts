import { useCallback, useEffect, useState } from 'react'

const THREAD_PARAM = 'thread'

/**
 * Objeto de retorno do hook useThreadUrlSync contendo a thread ativa e a função de navegação por URL.
 */
export interface UseThreadUrlSyncResult {
  /** Identificador da thread ativa refletido na query string (?thread=xyz). */
  activeThreadId: string | null
  /** Atualiza o identificador da thread e sincroniza com a URL do navegador. */
  setThreadId: (threadId: string | null, replace?: boolean) => void
}

/**
 * Hook para sincronização bidirecional do ID da conversa ativa com a query string do navegador.
 *
 * @param initialThreadId - Identificador inicial caso a query string esteja vazia.
 * @returns Objeto com o ID ativo e método para atualização da URL sem recarregar a página.
 */
export function useThreadUrlSync(initialThreadId: string | null = null): UseThreadUrlSyncResult {
  const getThreadFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get(THREAD_PARAM)
  }

  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(() => {
    return getThreadFromUrl() || initialThreadId
  })

  // Sincroniza o estado interno e a URL da página sem recarregar
  const setThreadId = useCallback((threadId: string | null, replace = false) => {
    setActiveThreadIdState(threadId)

    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    if (threadId) {
      url.searchParams.set(THREAD_PARAM, threadId)
    } else {
      url.searchParams.delete(THREAD_PARAM)
    }

    if (replace) {
      window.history.replaceState({}, '', url.toString())
    } else {
      window.history.pushState({}, '', url.toString())
    }
  }, [])

  // Suporte aos botões voltar/avançar do navegador (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const fromUrl = getThreadFromUrl()
      setActiveThreadIdState(fromUrl)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return {
    activeThreadId,
    setThreadId
  }
}
