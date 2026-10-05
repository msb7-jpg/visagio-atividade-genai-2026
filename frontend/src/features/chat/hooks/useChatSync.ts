import { useThreadDetailQuery } from '@/features/chat/hooks/useThreadDetailQuery'
import {
  CHAT_BLOCK_TYPE,
  type ChatMessageBlock,
  type ChatMessageItem,
  type ThreadDetail
} from '@/features/chat/types/chat.types'
import { useProviderConfigQuery } from '@/features/settings/hooks/useProviderConfigQuery'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { AgentStream } from './useAgentStream'

/**
 * Converte o detalhe persistido da thread em itens de mensagem renderizáveis no feed.
 *
 * @param threadDetail - Objeto detalhado da thread com mensagens e status de execução.
 * @param isAborted - Indica se a thread foi abortada pelo usuário, suprimindo placeholders em andamento.
 * @returns Lista reconstituída de ChatMessageItem contendo blocos e etapas do agente.
 */
export function rehydrateThreadMessages(threadDetail: ThreadDetail, isAborted = false): ChatMessageItem[] {
  const rehydratedMessages: ChatMessageItem[] = threadDetail.messages.map((msg) => {
    const blocks: ChatMessageBlock[] = []

    if (msg.role === 'assistant') {
      if (msg.thought) {
        blocks.push({
          id: `th-${msg.id}`,
          type: CHAT_BLOCK_TYPE.THOUGHT,
          content: msg.thought
        })
      }
      if (msg.generated_sql) {
        blocks.push({
          id: `sql-${msg.id}`,
          type: CHAT_BLOCK_TYPE.SQL,
          query: msg.generated_sql
        })
      }
    }

    blocks.push({
      id: `block-${msg.id}`,
      type: CHAT_BLOCK_TYPE.TEXT,
      content: msg.content
    })

    if (msg.role === 'assistant' && msg.chart_spec) {
      blocks.push({
        id: `chart-${msg.id}`,
        type: CHAT_BLOCK_TYPE.CHART,
        config: msg.chart_spec
      })
    }

    const steps = msg.steps ?? []

    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      blocks,
      steps,
      timestamp: threadDetail.updated_at ? threadDetail.updated_at * 1000 : Date.now(),
      provider: msg.provider,
      model: msg.model
    }
  })

  // Backend ainda processando (ex.: após reload): exibe placeholder em loading em vez de erro
  const last = rehydratedMessages.at(-1)
  if (threadDetail.is_running && !isAborted && last?.role === 'user') {
    rehydratedMessages.push({
      id: `running-${threadDetail.thread_id}`,
      role: 'assistant',
      content: '',
      blocks: [],
      steps: [],
      timestamp: Date.now(),
      isStreaming: true
    })
  }

  return rehydratedMessages
}

/**
 * Opções de entrada para o hook de sincronização do chat.
 */
export interface UseChatSyncOptions {
  /** Instância global do stream de mensagens. */
  stream: AgentStream
  /** Identificador da thread passado via parâmetro de URL. */
  externalThreadId?: string | null
  /** Callback para sincronização do título ativo. */
  onTitleChange?: (title: string | null) => void
  /** Callback para atualização da thread selecionada na aplicação. */
  onActiveThreadChange?: (threadId: string | null) => void
  /** Callback para repassar a lista de perguntas à timeline. */
  onTimelineItemsChange?: (items: { id: string; title: string }[]) => void
}

/**
 * Objeto de retorno do hook useChatSync com estados consolidados e ações.
 */
export interface UseChatSyncResult {
  /** Mensagens resolvidas para renderização na view atual. */
  messages: ChatMessageItem[]
  /** Indica se o modelo está bloqueado para novos envios. */
  isModelLocked: boolean
  /** Indica se o streaming ativo pertence a uma conversa diferente da que está aberta na tela. */
  isLockedByOtherThread: boolean
  /** Indica se o backend ainda está processando a thread sem conexão de stream local. */
  isRunningRemotely: boolean
  /** Referência ao elemento de ancoragem no rodapé do chat para scroll automático. */
  messagesEndRef: RefObject<HTMLDivElement | null>
  /** Função para envio de nova pergunta. */
  handleSend: (text: string) => void
  /** Função para retentar a geração de uma resposta do assistente. */
  handleRetry: (assistantMsgId: string) => void
}

/**
 * Hook de orquestração que sincroniza o stream ativo em memória com a thread persistida consultada via URL.
 *
 * @param options - Configurações contendo stream global, IDs de thread e callbacks de sincronização.
 * @returns Objeto com mensagens consolidadas, flags de lock e manipuladores de envio.
 */
export function useChatSync({
  stream,
  externalThreadId,
  onTitleChange,
  onActiveThreadChange,
  onTimelineItemsChange
}: UseChatSyncOptions): UseChatSyncResult {
  const {
    messages: streamMessages,
    isStreaming,
    activeThreadId,
    activeTitle,
    sendMessage,
    retryMessage,
    loadThreadMessages
  } = stream

  const { config } = useProviderConfigQuery()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Consulta reativa e em cache com TanStack Query para os detalhes da thread selecionada
  const { data: threadDetail } = useThreadDetailQuery(externalThreadId)
  const currentDetail = threadDetail && threadDetail.thread_id === externalThreadId ? threadDetail : undefined

  const isThreadAborted = Boolean(
    (externalThreadId && stream.isThreadAborted?.(externalThreadId)) ||
    (activeThreadId && stream.isThreadAborted?.(activeThreadId))
  )
  const isManagedLocally = Boolean(
    activeThreadId && (activeThreadId === externalThreadId || (!externalThreadId && activeThreadId))
  )

  const isViewingStreamThread = isStreaming && (externalThreadId ? activeThreadId === externalThreadId : true)
  // Há geração em andamento em OUTRA thread: a tela atual fica somente-leitura
  const isLockedByOtherThread = isStreaming && !isViewingStreamThread
  // O estado do stream corresponde à thread exibida
  const streamOwnsView = isViewingStreamThread || activeThreadId === (externalThreadId ?? null)
  // Backend ainda processa esta thread sem stream local (ex.: após recarregar a página)
  const isRunningRemotely =
    Boolean(currentDetail?.is_running) &&
    !isViewingStreamThread &&
    !isThreadAborted &&
    !isManagedLocally
  const isModelLocked = isStreaming || isRunningRemotely

  const viewMessages = useMemo(
    () => (currentDetail ? rehydrateThreadMessages(currentDetail, isThreadAborted) : []),
    [currentDetail, isThreadAborted]
  )

  useEffect(() => {
    if (!currentDetail || isStreaming) return
    // Evita loop de reidratação quando o stream já estiver posicionado nesta conversa
    if (activeThreadId === currentDetail.thread_id) return

    loadThreadMessages(
      currentDetail.thread_id,
      currentDetail.title,
      viewMessages
    )
  }, [currentDetail, viewMessages, isStreaming, activeThreadId, loadThreadMessages])

  const messages = streamOwnsView ? streamMessages : viewMessages

  const timelineItems = useMemo(() => {
    return messages
      .filter((message) => message.role === 'user')
      .map((message) => ({
        id: `turn-${message.id}`,
        title: message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
      }))
  }, [messages])

  useEffect(() => {
    onTimelineItemsChange?.(timelineItems)
  }, [timelineItems, onTimelineItemsChange])

  // Notifica título da thread (prioriza título gerado durante streaming)
  useEffect(() => {
    if (activeTitle) {
      onTitleChange?.(activeTitle)
    } else if (currentDetail?.title) {
      onTitleChange?.(currentDetail.title)
    }
  }, [activeTitle, currentDetail?.title, onTitleChange])

  // Auto-scroll suave para o final conforme novas mensagens chegam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text: string) => {
    if (isModelLocked) return
    void sendMessage({
      message: text,
      threadId: externalThreadId ?? null,
      provider: config?.provider,
      model: config?.model,
      onThreadCreated: (newThreadId) => {
        onActiveThreadChange?.(newThreadId)
      }
    })
  }

  const handleRetry = (assistantMsgId: string) => {
    if (isModelLocked) return
    void retryMessage(assistantMsgId, {
      provider: config?.provider,
      model: config?.model
    })
  }

  return {
    messages,
    isModelLocked,
    isLockedByOtherThread,
    isRunningRemotely,
    messagesEndRef,
    handleSend,
    handleRetry
  }
}
