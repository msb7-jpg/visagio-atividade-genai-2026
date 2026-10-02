import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsModal } from '@/features/settings/components/SettingsModal'
import { AppLayout } from '@/components/layouts/AppLayout'

// Mock useProviderConfigQuery
vi.mock('@/features/settings/hooks/useProviderConfigQuery', () => ({
  useProviderConfigQuery: () => ({
    config: {
      provider: 'groq',
      model: 'openai/gpt-oss-20b',
      api_key: 'gsk_123',
      saved_providers: ['groq'],
      saved_configs: {
        groq: { model: 'openai/gpt-oss-20b', api_key: 'gsk_123' }
      }
    },
    isLoading: false
  })
}))

describe('Streaming Lock in Settings and AppLayout', () => {
  it('renders streaming active banner and disables submit when isStreaming is true in SettingsModal', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsModal isOpen={true} onClose={vi.fn()} isStreaming={true} />
      </QueryClientProvider>
    )

    // Verifica presença do banner informativo
    expect(screen.getByTestId('streaming-active-banner')).toBeInTheDocument()
    expect(
      screen.getByText(/Uma consulta analítica está em andamento/i)
    ).toBeInTheDocument()

    // Botões devem estar desabilitados
    const saveBtn = screen.getByRole('button', { name: /Salvar Configuração/i })
    expect(saveBtn).toBeDisabled()

    const testBtn = screen.getByRole('button', { name: /Testar Conexão/i })
    expect(testBtn).toBeDisabled()
  })

  it('disables Settings buttons in AppLayout when isStreaming is true', () => {
    render(<AppLayout isStreaming={true} />)

    const buttons = screen.getAllByRole('button', { name: /Configurações \(bloqueado durante análise\)/i })
    expect(buttons.length).toBeGreaterThan(0)
    for (const btn of buttons) {
      expect(btn).toBeDisabled()
    }
  })
})
