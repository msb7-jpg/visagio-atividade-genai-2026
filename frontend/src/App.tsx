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
import { rehydrateThreadMessages } from '@/features/chat/hooks/useChatSync'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'
import { SettingsModal } from '@/features/settings/components/modal/SettingsModal'
import { queryClient } from '@/lib/query-client'
import { useEventListener } from '@reactuses/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

/**
 * Resolve as mensagens ativas com base na posse do stream ou no histórico do servidor.
 */
function resolveActiveMessages(
  streamMessages: ChatMessageItem[],
  detailMessages: ChatMessageItem[] | undefined,
  isStreaming: boolean,
  activeThreadId: string | null,
  streamingThreadId: string | null
): ChatMessageItem[] {
  const isViewingCurrentStream = isStreaming && (!activeThreadId || streamingThreadId === activeThreadId)
  const isMatchingStreamThread = Boolean(streamingThreadId && streamingThreadId === activeThreadId)

  if (isViewingCurrentStream || isMatchingStreamThread) {
    return streamMessages
  }
  return detailMessages ?? []
}

/**
 * Mapeia mensagens do usuário em itens da timeline para o scroll-spy.
 */
function resolveTimelineItems(messages: ChatMessageItem[]): { id: string; title: string }[] {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => ({
      id: `turn-${message.id}`,
      title: message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
    }))
}

/**
 * Hook headless especialista que gerencia o estado global e os manipuladores de evento da aplicação.
 */
function useAppShellState() {
  const { activeThreadId, setThreadId } = useThreadUrlSync()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const stream = useAgentStream()
  const { isStreaming } = stream
  const streamingThreadId = isStreaming ? stream.activeThreadId : null

  const { data: threads = [] } = useThreadsQuery()
  const { mutate: deleteThread, isPending: isDeleting } = useDeleteThreadMutation()
  const { data: threadDetail } = useThreadDetailQuery(activeThreadId)

  const activeThread = useMemo(
    () => (activeThreadId ? threads.find((item) => item.thread_id === activeThreadId) : null),
    [activeThreadId, threads]
  )

  const currentTitle = stream.activeTitle || threadDetail?.title || activeThread?.title || null

  const serverMessages = useMemo(
    () => (threadDetail ? rehydrateThreadMessages(threadDetail) : undefined),
    [threadDetail]
  )

  const activeMessages = useMemo(
    () => resolveActiveMessages(stream.messages, serverMessages, isStreaming, activeThreadId, streamingThreadId),
    [stream.messages, serverMessages, isStreaming, activeThreadId, streamingThreadId]
  )

  const timelineItems = useMemo(
    () => resolveTimelineItems(activeMessages),
    [activeMessages]
  )

  const timelineIds = useMemo(() => timelineItems.map((item) => item.id), [timelineItems])
  const { activeId, scrollToItem } = useScrollSpy(timelineIds)

  useEventListener('beforeunload', (event: BeforeUnloadEvent) => {
    if (isStreaming) {
      event.preventDefault()
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

  const handleDeleteThread = (threadIdToDelete: string) => {
    if (threadIdToDelete === streamingThreadId) return
    deleteThread(threadIdToDelete)
    if (activeThreadId === threadIdToDelete) {
      handleNewChat()
    }
  }

  return {
    activeThreadId,
    isSettingsOpen,
    setIsSettingsOpen,
    stream,
    isStreaming,
    streamingThreadId,
    threads,
    isDeleting,
    currentTitle,
    timelineItems,
    activeId,
    scrollToItem,
    handleNewChat,
    handleSelectThread,
    handleActiveThreadChange,
    handleGoToStreamingThread,
    handleDeleteThread
  }
}

/**
 * Componente interno de conteúdo que consome o contexto de queries e orquestra o estado global do app.
 *
 * @returns Elemento JSX com a estrutura do layout, container de chat e modal de configurações.
 */
function AppContent() {
  const {
    activeThreadId,
    isSettingsOpen,
    setIsSettingsOpen,
    stream,
    isStreaming,
    streamingThreadId,
    threads,
    isDeleting,
    currentTitle,
    timelineItems,
    activeId,
    scrollToItem,
    handleNewChat,
    handleSelectThread,
    handleActiveThreadChange,
    handleGoToStreamingThread,
    handleDeleteThread
  } = useAppShellState()

  const hasActiveChat = Boolean(activeThreadId || timelineItems.length > 0)

  return (
    <>
      <AppLayout
        activeThreadId={activeThreadId}
        isStreaming={isStreaming}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        headerTitle={<AnimatedTitle title={currentTitle} />}
        sidebarContent={(
          <SidebarThreads
            threads={threads}
            activeThreadId={activeThreadId}
            streamingThreadId={streamingThreadId}
            onSelectThread={handleSelectThread}
            onNewChat={handleNewChat}
            onDeleteThread={handleDeleteThread}
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
          onOpenSettings={() => setIsSettingsOpen(true)}
          onGoToStreamingThread={handleGoToStreamingThread}
          onActiveThreadChange={handleActiveThreadChange}
          onNewChat={handleNewChat}
        />
      </AppLayout>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
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
