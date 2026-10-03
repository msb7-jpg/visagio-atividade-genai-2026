import { Bot, HardDrive, Layers, Zap } from 'lucide-react'
import type { ProviderType } from '@/features/settings/schemas/settings.schema'

export const PROVIDER_METADATA: Record<ProviderType, { name: string; icon: typeof Zap }> = {
  groq: { name: 'Groq', icon: Zap },
  local: { name: 'Servidor Local', icon: HardDrive },
  openrouter: { name: 'OpenRouter', icon: Layers },
  google: { name: 'Google Gemini', icon: Bot }
}

export const DEFAULT_PROVIDER_MODELS: Record<ProviderType, string> = {
  groq: 'openai/gpt-oss-20b',
  local: 'Qwen3.5-4B-Q4_K_M.gguf',
  openrouter: 'qwen/qwen3.8-27b:free',
  google: 'gemini-2.5-flash'
}
