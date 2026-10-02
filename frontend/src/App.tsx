import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AppLayout } from '@/components/layouts/AppLayout'
import { SettingsModal } from '@/features/settings/components/SettingsModal'

import { ChatContainer } from '@/features/chat/ChatContainer'

export function App() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const handleNewChat = () => {
    setActiveThreadId(null)
  }

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout
        activeThreadId={activeThreadId}
        isStreaming={isStreaming}
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
      >
        <ChatContainer
          onOpenSettings={handleOpenSettings}
          onStreamingChange={setIsStreaming}
        />
      </AppLayout>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        isStreaming={isStreaming}
      />
    </QueryClientProvider>
  )
}

export default App
