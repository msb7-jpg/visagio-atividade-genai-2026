# Reference: Forms and Validation with @tanstack/react-form and Zod

This guide defines standards for building reactive, type-safe forms with schema validation in React 19.

---

## 1. Official Form Stack

- **Form Manager:** `@tanstack/react-form`
- **Schema Validation:** `zod` (v4)

---

## 2. Implementation Principles

1. **Strict Zod Schemas:**
   - Define schemas with descriptive validation messages:
   ```typescript
   import { z } from 'zod'

   export const providerFormSchema = z.object({
     provider: z.enum(['groq', 'local', 'openrouter', 'google']),
     apiKey: z.string().min(1, 'API key is required'),
     model: z.string().min(1, 'Model must be specified'),
   })

   export type ProviderFormValues = z.infer<typeof providerFormSchema>
   ```

2. **Submit Button Fencing:**
   - Forms must prevent concurrent submissions by inspecting the form's `isSubmitting` and the mutation's `isPending`.
   - The primary button must show a processing state (`<Spinner />`) during the request.

3. **Field-Level Error Rendering:**
   - Validation errors must be rendered next to their corresponding fields, avoiding intrusive error dialogs for regular field validation errors.
