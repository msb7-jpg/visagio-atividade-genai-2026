export type {
  ProviderType,
  ProviderConfig,
  TestProviderRequest
} from '@/features/settings/schemas/settings.schema'

export interface TestProviderResponse {
  success: boolean
  latency_ms: number
  model: string
  message: string
  error_code?: string | null
}
