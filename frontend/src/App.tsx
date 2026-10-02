import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layouts/AppLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1
    }
  }
})

export function App() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  const handleNewChat = () => {
    setActiveThreadId(null)
  }

  const handleOpenSettings = () => {
    // Será integrado ao modal de settings no Slice 1
    console.info('Configurações solicitadas')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout
        activeThreadId={activeThreadId}
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
      />
    </QueryClientProvider>
  )
}

export default App
