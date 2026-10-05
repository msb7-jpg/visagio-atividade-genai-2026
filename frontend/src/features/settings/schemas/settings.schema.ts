import { z } from 'zod'

const ProviderTypeSchema = z.enum(['groq', 'local', 'openrouter', 'google'])

export const ProviderConfigFormSchema = z.object({
  provider: ProviderTypeSchema,
  model: z.string().min(1, 'Modelo é obrigatório'),
  api_key: z.string(),
  base_url: z.string(),
  timeout_seconds: z.number().int().positive()
})

const SavedProviderSummarySchema = z.object({
  model: z.string(),
  api_key: z.string().nullable().optional(),
  base_url: z.string().nullable().optional(),
  timeout_seconds: z.number().optional()
})

const ProviderConfigSchema = z.object({
  provider: ProviderTypeSchema,
  model: z.string().min(1, 'Modelo é obrigatório'),
  api_key: z.string().nullable().optional(),
  base_url: z.string().nullable().optional(),
  timeout_seconds: z.number().int().positive().default(30),
  saved_providers: z.array(z.string()).default([]),
  saved_configs: z.record(z.string(), SavedProviderSummarySchema).default({})
})

const TestProviderRequestSchema = z.object({
  provider: ProviderTypeSchema,
  model: z.string().nullable().optional(),
  api_key: z.string().nullable().optional(),
  base_url: z.string().nullable().optional(),
  timeout_seconds: z.number().int().positive().optional()
})

export type ProviderType = z.infer<typeof ProviderTypeSchema>
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type TestProviderRequest = z.infer<typeof TestProviderRequestSchema>
