import { z } from 'zod'

export const ProviderTypeSchema = z.enum(['groq', 'local', 'openrouter', 'google', 'openai'])

export const ProviderConfigFormSchema = z.object({
  provider: ProviderTypeSchema,
  model: z.string().min(1, 'Modelo é obrigatório'),
  api_key: z.string(),
  base_url: z.string(),
  timeout_seconds: z.number().int().positive()
})

export const ProviderConfigSchema = z.object({
  provider: ProviderTypeSchema,
  model: z.string().min(1, 'Modelo é obrigatório'),
  api_key: z.string().nullable().optional(),
  base_url: z.string().nullable().optional(),
  timeout_seconds: z.number().int().positive().default(30),
  saved_providers: z.array(z.string()).default([])
})

export const TestProviderRequestSchema = z.object({
  provider: ProviderTypeSchema,
  model: z.string().nullable().optional(),
  api_key: z.string().nullable().optional(),
  base_url: z.string().nullable().optional(),
  timeout_seconds: z.number().int().positive().optional()
})

export type ProviderType = z.infer<typeof ProviderTypeSchema>
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type ProviderConfigFormValues = z.infer<typeof ProviderConfigFormSchema>
export type TestProviderRequest = z.infer<typeof TestProviderRequestSchema>
