import reactHooks from 'eslint-plugin-react-hooks'

/**
 * Wrapper de segurança sobre a regra 'exhaustive-deps' do react-hooks.
 *
 * 1. Remove qualquer capacidade de auto-fix (fixable: undefined, sem problem.fix).
 * 2. Remove sugestões automáticas da IDE (hasSuggestions: false, sem problem.suggest)
 *    para impedir que a IDE/VS Code injete funções instáveis às cegas no array de dependências.
 * 3. Enriquece a mensagem de aviso com alerta explícito sobre estabilização referencial via useCallback/useMemo.
 */
export const safeExhaustiveDepsRule = {
  ...reactHooks.rules['exhaustive-deps'],
  meta: {
    ...reactHooks.rules['exhaustive-deps'].meta,
    fixable: undefined,
    hasSuggestions: false
  },
  create(context) {
    const wrappedContext = Object.create(context)

    Object.defineProperty(wrappedContext, 'report', {
      value: (descriptor) => {
        const modified = { ...descriptor }
        delete modified.fix
        delete modified.suggest

        if (modified.message) {
          modified.message +=
            '\n   ⚠️ If this dependency is a function or a external object, make sure that is wrapped inside a useCallback or useMemo in the source hook to avoid infinite re-rendering loops!'
        }
        context.report(modified)
      },
      configurable: true,
      writable: true
    })

    return reactHooks.rules['exhaustive-deps'].create(wrappedContext)
  }
}

/**
 * Plugin seguro de react-hooks com a regra de exhaustive-deps protegida.
 */
export const safeReactHooksPlugin = {
  ...reactHooks,
  rules: {
    ...reactHooks.rules,
    'exhaustive-deps': safeExhaustiveDepsRule
  }
}

/**
 * Configuração flat recomendada para React Hooks com proteção contra auto-fix destrutivo.
 */
export const safeReactHooksConfig = {
  plugins: {
    'react-hooks': safeReactHooksPlugin
  },
  rules: {
    ...reactHooks.configs.flat.recommended.rules,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
}
