import { AppLayout } from '@/components/layouts/AppLayout'
import { ChatContainer } from '@/features/chat/ChatContainer'
import { AnimatedTitle } from '@/features/chat/components/header/AnimatedTitle'
import { SidebarThreads } from '@/features/chat/components/sidebar/SidebarThreads'
import { TimelineScrollSpy } from '@/features/chat/components/timeline/TimelineScrollSpy'
import { useScrollSpy } from '@/features/chat/hooks/useScrollSpy'
import { useThreadHistory } from '@/features/chat/hooks/useThreadHistory'
import { useThreadUrlSync } from '@/features/chat/hooks/useThreadUrlSync'
import { SettingsModal } from '@/features/settings/components/modal/SettingsModal'
import { queryClient } from '@/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

function AppContent() {
  const { activeThreadId, setThreadId } = useThreadUrlSync()
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const [timelineItems, setTimelineItems] = useState<{ id: string; title: string }[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatKey, setChatKey] = useState(0)

  const timelineIds = useMemo(() => timelineItems.map((item) => item.id), [timelineItems])
  const { activeId, scrollToItem } = useScrollSpy(timelineIds)

  const {
    threads,
    deleteThread,
    isDeleting
  } = useThreadHistory()

  // Atualiza título quando a thread da lista de histórico muda
  useEffect(() => {
    if (activeThreadId) {
      const current = threads.find((item) => item.thread_id === activeThreadId)
      if (current) {
        setActiveTitle(current.title)
      }
    } else {
      setActiveTitle(null)
    }
  }, [activeThreadId, threads])

  const handleNewChat = () => {
    setThreadId(null)
    setActiveTitle(null)
    setTimelineItems([])
    setChatKey((prev) => prev + 1)
  }

  const handleSelectThread = (threadId: string) => {
    setThreadId(threadId)
    const thread = threads.find((item) => item.thread_id === threadId)
    if (thread) {
      setActiveTitle(thread.title)
    }
    setTimelineItems([])
    setChatKey((prev) => prev + 1)
  }

  const handleActiveThreadChange = (threadId: string | null) => {
    if (threadId && threadId !== activeThreadId) {
      setThreadId(threadId, true)
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
        headerTitle={<AnimatedTitle title={activeTitle} />}
        sidebarContent={(
          <SidebarThreads
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onNewChat={handleNewChat}
            onDeleteThread={(threadIdToDelete) => {
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
          externalThreadId={activeThreadId}
          onOpenSettings={handleOpenSettings}
          onStreamingChange={setIsStreaming}
          onTitleChange={setActiveTitle}
          onActiveThreadChange={handleActiveThreadChange}
          onTimelineItemsChange={setTimelineItems}
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
