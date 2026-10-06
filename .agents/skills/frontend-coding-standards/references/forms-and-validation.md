# Referência: Formulários e Validação com @tanstack/react-form e Zod

Este guia define os padrões para construção de formulários reativos, tipados e com validação de schemas em React 19.

---

## 1. Stack Oficial de Formulários

- **Gerenciador de Formulários:** `@tanstack/react-form`
- **Validação de Schemas:** `zod` (v4)

---

## 2. Princípios de Implementação

1. **Schemas Zod Estritos:**
   - Defina os schemas com mensagens de validação descritivas em português:
   ```typescript
   import { z } from 'zod'

   export const providerFormSchema = z.object({
     provider: z.enum(['groq', 'local', 'openrouter', 'google']),
     apiKey: z.string().min(1, 'A chave de API é obrigatória'),
     model: z.string().min(1, 'O modelo deve ser especificado'),
   })

   export type ProviderFormValues = z.infer<typeof providerFormSchema>
   ```

2. **Fencing no Botão de Submit:**
   - Formulários devem bloquear submissões concorrentes inspecionando `isSubmitting` do formulário e `isPending` da mutação.
   - O botão principal deve exibir o estado de processamento (`<Spinner />`) durante a requisição.

3. **Exibição de Erros por Campo:**
   - Erros de validação devem ser renderizados próximos aos campos correspondentes, evitando modais de erro intrusivos para falhas pontuais de validação de campo.
