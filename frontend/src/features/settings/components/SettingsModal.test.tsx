import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsModal } from '@/features/settings/components/SettingsModal'
import * as apiClientModule from '@/lib/api-client'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('SettingsModal', () => {
  it('does not render when isOpen is false', () => {
    renderWithClient(<SettingsModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders modal and switches between providers', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
      provider: 'local',
      model: 'Qwen3.5-4B-Q4_K_M',
      api_key: null,
      base_url: 'http://localhost:1234/v1',
      timeout_seconds: 30
    })

    renderWithClient(<SettingsModal isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('provider-option-groq')).toBeInTheDocument()
    })

    // Clica na opção Groq
    const groqBtn = screen.getByTestId('provider-option-groq')
    fireEvent.click(groqBtn)

    // Verifica que o campo de chave de API aparece para Groq
    expect(screen.getByLabelText(/Chave de API/i)).toBeInTheDocument()
  })

  it('triggers onClose when close button is clicked', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({
      provider: 'local',
      model: 'Qwen3.5-4B-Q4_K_M',
      api_key: null,
      base_url: 'http://localhost:1234/v1',
      timeout_seconds: 30
    })

    const handleClose = vi.fn()
    renderWithClient(<SettingsModal isOpen onClose={handleClose} />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const closeBtn = screen.getByLabelText(/Fechar modal de configurações/i)
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('triggers probe test on Testar Conexão click and displays in-line feedback', async () => {
    const apiClientSpy = vi.spyOn(apiClientModule, 'apiClient')
    apiClientSpy.mockImplementation((endpoint) => {
      if (endpoint === '/settings/provider') {
        return Promise.resolve({
          provider: 'local',
          model: 'Qwen3.5-4B-Q4_K_M',
          api_key: null,
          base_url: 'http://localhost:1234/v1',
          timeout_seconds: 30,
          saved_providers: ['local']
        })
      }
      if (endpoint === '/settings/test-provider') {
        return Promise.resolve({
          success: true,
          latency_ms: 45.2,
          model: 'Qwen3.5-4B-Q4_K_M',
          message: "Conexão com 'local' estabelecida com sucesso!"
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    renderWithClient(<SettingsModal isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Testar Conexão')).toBeInTheDocument()
      // Verifica badge de salvo
      expect(screen.getByTestId('saved-badge-local')).toBeInTheDocument()
    })

    // O select de modelos deve estar inicialmente desabilitado
    const selectBefore = screen.getByRole('combobox')
    expect(selectBefore).toBeDisabled()

    const testBtn = screen.getByText('Testar Conexão')
    fireEvent.click(testBtn)

    await waitFor(() => {
      expect(screen.getByTestId('inline-status-connected')).toBeInTheDocument()
      expect(screen.getByText(/45.2 ms/)).toBeInTheDocument()
    })

    // O select de modelos deve estar habilitado após a conexão ser bem-sucedida
    expect(screen.getByRole('combobox')).not.toBeDisabled()
  })

  it('saves configuration successfully when Salvar Configuração is clicked', async () => {
    const apiClientSpy = vi.spyOn(apiClientModule, 'apiClient')
    apiClientSpy.mockImplementation((endpoint) => {
      if (endpoint === '/settings/provider') {
        return Promise.resolve({
          provider: 'local',
          model: 'Qwen3.5-4B-Q4_K_M',
          api_key: null,
          base_url: 'http://localhost:1234/v1',
          timeout_seconds: 30,
          saved_providers: []
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    const handleClose = vi.fn()
    renderWithClient(<SettingsModal isOpen onClose={handleClose} />)

    await waitFor(() => {
      expect(screen.getByText('Salvar Configuração')).toBeInTheDocument()
    })

    const saveBtn = screen.getByText('Salvar Configuração')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByTestId('save-success-feedback')).toBeInTheDocument()
      expect(screen.getByText('Configuração salva com sucesso!')).toBeInTheDocument()
    })
  })

  it('displays friendly error feedback when updateConfig mutation fails', async () => {
    const apiClientSpy = vi.spyOn(apiClientModule, 'apiClient')
    apiClientSpy.mockImplementation((endpoint, options) => {
      if (endpoint === '/settings/provider') {
        if (options?.method === 'POST') {
          return Promise.reject(new Error('Erro interno ao gravar configuração'))
        }
        return Promise.resolve({
          provider: 'local',
          model: 'Qwen3.5-4B-Q4_K_M',
          api_key: null,
          base_url: 'http://localhost:1234/v1',
          timeout_seconds: 30,
          saved_providers: []
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    renderWithClient(<SettingsModal isOpen onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Salvar Configuração')).toBeInTheDocument()
    })

    const saveBtn = screen.getByText('Salvar Configuração')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByTestId('save-error-feedback')).toBeInTheDocument()
      expect(screen.getByText(/Erro interno ao gravar configuração/i)).toBeInTheDocument()
    })
  })
})
