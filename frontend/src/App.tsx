import { AppLayout } from '@/components/layouts/AppLayout'
import { ChatContainer } from '@/features/chat/ChatContainer'
import { AnimatedTitle } from '@/features/chat/components/header/AnimatedTitle'
import { SidebarThreads } from '@/features/chat/components/sidebar/SidebarThreads'
import { TimelineScrollSpy } from '@/features/chat/components/timeline/TimelineScrollSpy'
import { useAgentStream } from '@/features/chat/hooks/useAgentStream'
import { useScrollSpy } from '@/features/chat/hooks/useScrollSpy'
import { useThreadHistory } from '@/features/chat/hooks/useThreadHistory'
import { useThreadUrlSync } from '@/features/chat/hooks/useThreadUrlSync'
import { SettingsModal } from '@/features/settings/components/modal/SettingsModal'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Componente interno de conteúdo que consome o contexto de queries e orquestra o estado global do app.
 *
 * @returns Elemento JSX com a estrutura do layout, container de chat e modal de configurações.
 */
function AppContent() {
  const { activeThreadId, setThreadId } = useThreadUrlSync()
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const [timelineItems, setTimelineItems] = useState<{ id: string; title: string }[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // Stream único em nível de aplicação: sobrevive à troca de thread na sidebar
  const stream = useAgentStream()
  const { isStreaming } = stream
  const streamingThreadId = isStreaming ? stream.activeThreadId : null
  const [chatKey, setChatKey] = useState(0)

  const timelineIds = useMemo(() => timelineItems.map((item) => item.id), [timelineItems])
  const { activeId, scrollToItem } = useScrollSpy(timelineIds)

  const {
    threads,
    deleteThread,
    isDeleting
  } = useThreadHistory()

  const activeThread = useMemo(
    () => (activeThreadId ? threads.find((item) => item.thread_id === activeThreadId) : null),
    [activeThreadId, threads]
  )
  const currentTitle = activeTitle || activeThread?.title || null

  // Alerta de confirmação caso o usuário tente fechar ou recarregar a página durante uma resposta em andamento
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isStreaming) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isStreaming])

  const handleNewChat = () => {
    stream.clearMessages()
    setThreadId(null)
    setActiveTitle(null)
    setTimelineItems([])
    setChatKey((prev) => prev + 1)
  }

  const handleSelectThread = (threadId: string) => {
    if (threadId === activeThreadId) return

    setThreadId(threadId)
    const thread = threads.find((item) => item.thread_id === threadId)
    if (thread) {
      setActiveTitle(thread.title)
    }
    setTimelineItems([])
    setChatKey((prev) => prev + 1)
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
          key={chatKey}
          stream={stream}
          externalThreadId={activeThreadId}
          onOpenSettings={handleOpenSettings}
          onGoToStreamingThread={handleGoToStreamingThread}
          onTitleChange={setActiveTitle}
          onActiveThreadChange={handleActiveThreadChange}
          onTimelineItemsChange={setTimelineItems}
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
