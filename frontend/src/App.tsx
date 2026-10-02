import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AppLayout } from '@/components/layouts/AppLayout'
import { SettingsModal } from '@/features/settings/components/SettingsModal'

export function App() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </QueryClientProvider>
  )
}

export default App
