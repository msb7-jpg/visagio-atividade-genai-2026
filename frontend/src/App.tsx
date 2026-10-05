import { AppLayout } from '@/components/layouts/AppLayout'
import { ChatContainer } from '@/features/chat/ChatContainer'
import { AnimatedTitle } from '@/features/chat/components/header/AnimatedTitle'
import { SidebarThreads } from '@/features/chat/components/sidebar/SidebarThreads'
import { TimelineScrollSpy } from '@/features/chat/components/timeline/TimelineScrollSpy'
import { useAgentStream } from '@/features/chat/hooks/useAgentStream'
import { useDeleteThreadMutation } from '@/features/chat/hooks/useDeleteThreadMutation'
import { useScrollSpy } from '@/features/chat/hooks/useScrollSpy'
import { useThreadDetailQuery } from '@/features/chat/hooks/useThreadDetailQuery'
import { useThreadsQuery } from '@/features/chat/hooks/useThreadsQuery'
import { useThreadUrlSync } from '@/features/chat/hooks/useThreadUrlSync'
import { SettingsModal } from '@/features/settings/components/modal/SettingsModal'
import { queryClient } from '@/lib/query-client'
import { useEventListener } from '@reactuses/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

/**
 * Componente interno de conteúdo que consome o contexto de queries e orquestra o estado global do app.
 *
 * @returns Elemento JSX com a estrutura do layout, container de chat e modal de configurações.
 */
function AppContent() {
  const { activeThreadId, setThreadId } = useThreadUrlSync()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Stream único em nível de aplicação: sobrevive à troca de thread na sidebar
  const stream = useAgentStream()
  const { isStreaming } = stream
  const streamingThreadId = isStreaming ? stream.activeThreadId : null

  // Consultas e mutações estritas do TanStack Query
  const { data: threads = [] } = useThreadsQuery()
  const { mutate: deleteThread, isPending: isDeleting } = useDeleteThreadMutation()
  const { data: threadDetail } = useThreadDetailQuery(activeThreadId)

  const activeThread = useMemo(
    () => (activeThreadId ? threads.find((item) => item.thread_id === activeThreadId) : null),
    [activeThreadId, threads]
  )

  // Título derivado sincronicamente sem efeitos em cascata
  const currentTitle = stream.activeTitle || threadDetail?.title || activeThread?.title || null

  // Mensagens ativas resolvidas para sincronização direta e síncrona da timeline
  const timelineItems = useMemo(() => {
    const isViewingStreamThread = isStreaming && (activeThreadId ? stream.activeThreadId === activeThreadId : true)
    const streamOwnsView = isViewingStreamThread || stream.activeThreadId === (activeThreadId ?? null)
    const activeMessages = streamOwnsView ? stream.messages : (threadDetail?.messages ?? [])

    return activeMessages
      .filter((message) => message.role === 'user')
      .map((message) => ({
        id: `turn-${message.id}`,
        title: message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
      }))
  }, [isStreaming, activeThreadId, stream.activeThreadId, stream.messages, threadDetail?.messages])

  const timelineIds = useMemo(() => timelineItems.map((item) => item.id), [timelineItems])
  const { activeId, scrollToItem } = useScrollSpy(timelineIds)

  // Alerta de confirmação caso o usuário tente fechar ou recarregar a página durante uma resposta em andamento
  useEventListener('beforeunload', (event: BeforeUnloadEvent) => {
    if (isStreaming) {
      event.preventDefault()
      event.returnValue = ''
    }
  })

  const handleNewChat = () => {
    stream.clearMessages()
    setThreadId(null)
  }

  const handleSelectThread = (threadId: string) => {
    if (threadId === activeThreadId) return
    setThreadId(threadId)
  }

  const handleActiveThreadChange = useCallback((threadId: string | null) => {
    if (threadId && threadId !== activeThreadId) {
      setThreadId(threadId, true)
    }
  }, [activeThreadId, setThreadId])

  const handleGoToStreamingThread = () => {
    if (streamingThreadId) {
      handleSelectThread(streamingThreadId)
    }
  }

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
  }

  // Apenas renderiza a timeline direita se houver uma thread ativa ou itens de turno
  const hasActiveChat = Boolean(activeThreadId || timelineItems.length > 0)

  return (
    <>
      <AppLayout
        activeThreadId={activeThreadId}
        isStreaming={isStreaming}
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
        headerTitle={<AnimatedTitle title={currentTitle} />}
        sidebarContent={(
          <SidebarThreads
            threads={threads}
            activeThreadId={activeThreadId}
            streamingThreadId={streamingThreadId}
            onSelectThread={handleSelectThread}
            onNewChat={handleNewChat}
            onDeleteThread={(threadIdToDelete) => {
              if (threadIdToDelete === streamingThreadId) return
              deleteThread(threadIdToDelete)
              if (activeThreadId === threadIdToDelete) {
                handleNewChat()
              }
            }}
            isDeleting={isDeleting}
          />
        )}
        rightSidebarContent={
          hasActiveChat ? (
            <TimelineScrollSpy
              items={timelineItems}
              activeId={activeId}
              onSelectItem={scrollToItem}
            />
          ) : undefined
        }
      >
        <ChatContainer
          stream={stream}
          externalThreadId={activeThreadId}
          onOpenSettings={handleOpenSettings}
          onGoToStreamingThread={handleGoToStreamingThread}
          onActiveThreadChange={handleActiveThreadChange}
          onNewChat={handleNewChat}
        />
      </AppLayout>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        isStreaming={isStreaming}
      />
    </>
  )
}

/**
 * Componente raiz da aplicação configurando o provedor do TanStack Query.
 *
 * @returns Elemento JSX raiz da aplicação.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
