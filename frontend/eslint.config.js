import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactCompiler from 'eslint-plugin-react-compiler'
import shadcnPlugin from '@shadcn/lint'
import stylistic from '@stylistic/eslint-plugin'
import tsdoc from 'eslint-plugin-tsdoc'
import { defineConfig, globalIgnores } from 'eslint/config'
import designSystemPolicy from './design-system.lint.json' with { type: 'json' }
import jsdoc from 'eslint-plugin-jsdoc';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '.tmp']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: '19.0',
      },
      shadcn: {
        ui: '@/components/ui',
        mergeFunctions: ['cn'],
        note: 'See ui/DESIGN.md and .agents/skills/shadcn/SKILL.md. Do not invent domain-specific variants or use raw colors.',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-compiler': reactCompiler,
      shadcn: shadcnPlugin.default || shadcnPlugin,
      '@stylistic': stylistic,
      tsdoc,
      jsdoc
    },
    rules: {
      // 1. Regras do Design System (@shadcn/lint)
      ...designSystemPolicy.rules,

      // 2. Anti-Bypass: Proibir elementos nativos fora de src/components/ui
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            {
              element: 'button',
              message:
                '❌ Proibido usar <button> nativo. Use <Button> de "@/components/ui/button" ou componha com as primitivas do design system.',
            },
            {
              element: 'input',
              message:
                '❌ Proibido usar <input> nativo. Use <Input> de "@/components/ui/input" ou <Field> de "@/components/ui/field".',
            },
            {
              element: 'select',
              message:
                '❌ Proibido usar <select> nativo. Use <Select> de "@/components/ui/select".',
            },
            {
              element: 'textarea',
              message:
                '❌ Proibido usar <textarea> nativo. Use <Textarea> de "@/components/ui/textarea".',
            },
          ],
        },
      ],

      // 3. Anti-React < 19: Banir APIs obsoletas e padrões legados
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='forwardRef'], CallExpression[callee.property.name='forwardRef']",
          message:
            "❌ forwardRef é obsoleto no React 19. Passe 'ref' diretamente como prop do componente.",
        },
        {
          selector: "JSXMemberExpression[property.name='Provider']",
          message:
            '❌ <Context.Provider> é obsoleto no React 19. Renderize <Context value={...}> diretamente.',
        },
      ],
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            'React.FC': {
              message:
                '❌ React.FC é desnecessário e desencorajado no React 19. Defina componentes como funções padrão com props tipadas: function Component({ prop }: Props).',
            },
            'React.FunctionComponent': {
              message:
                '❌ React.FunctionComponent é desnecessário e desencorajado no React 19. Defina componentes como funções padrão com props tipadas.',
            },
          },
        },
      ],
      'react-compiler/react-compiler': 'error',
      'react/no-deprecated': 'error',
      'react/no-string-refs': 'error',
      'react/no-find-dom-node': 'error',

      // 4. Imports Absolutos com @/* (Evitar caminhos relativos profundos)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../../*'],
              message: 'Please use absolute imports with "@/" (e.g. "@/components/...")',
            },
          ],
        },
      ],

      // 5. Prevenção de Identificadores Criptográficos (Bloquear variáveis de 1 letra como 'a', 'x', 'i')
      'id-length': [
        'error',
        {
          min: 2,
          exceptions: ['_'],
          properties: 'never',
        },
      ],

      // 6. Qualidade Lógica e Prevenção de Bugs
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'error',
      'prefer-const': 'error',

      // 7. Clean Code & Boolean Safety (plan/frontend-guidelines.md)
      'no-nested-ternary': 'error',
      'react/jsx-no-leaked-render': [
        'error',
        { validStrategies: ['ternary', 'coerce'] },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // 8. Stylistic Geral & Formatação de Código
      quotes: ['error', 'single', { avoidEscape: true }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/type-annotation-spacing': [
        'error',
        {
          before: false,
          after: true,
          overrides: { arrow: 'ignore' },
        },
      ],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],

      // 9. Stylistic JSX — Templates Limpos, Alinhados e Profissionais
      '@stylistic/jsx-self-closing-comp': ['error', { component: true, html: true }],
      '@stylistic/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never', propElementValues: 'always' },
      ],
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      '@stylistic/jsx-pascal-case': ['error', { allowAllCaps: false }],
      '@stylistic/jsx-closing-bracket-location': ['error', 'tag-aligned'],
      '@stylistic/jsx-closing-tag-location': 'error',
      '@stylistic/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
      '@stylistic/jsx-max-props-per-line': [
        'error',
        { maximum: 1, when: 'multiline' },
      ],
      '@stylistic/jsx-indent-props': ['error', 2],
      '@stylistic/jsx-tag-spacing': [
        'error',
        {
          closingSlash: 'never',
          beforeSelfClosing: 'always',
          afterOpening: 'never',
          beforeClosing: 'never',
        },
      ],
      '@stylistic/jsx-equals-spacing': ['error', 'never'],
      '@stylistic/jsx-curly-spacing': ['error', { when: 'never', children: true }],
      '@stylistic/jsx-curly-newline': [
        'error',
        { multiline: 'consistent', singleline: 'consistent' },
      ],
      '@stylistic/jsx-wrap-multilines': [
        'error',
        {
          declaration: 'parens-new-line',
          assignment: 'parens-new-line',
          return: 'parens-new-line',
          arrow: 'parens-new-line',
          condition: 'parens-new-line',
          logical: 'parens-new-line',
          prop: 'parens-new-line',
        },
      ],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-fragments': ['error', 'syntax'],

      // 10. TypeScript & Unused Vars refinado
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],

      // 11. TSDoc
      'tsdoc/syntax': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
          },
        },
      ],
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-param-type': 'off', // Desativado: O TypeScript já resolve o tipo nativamente
      'jsdoc/require-returns-type': 'off', // Desativado: O TypeScript já resolve o tipo de retorno
    },
  },
  // Overrides de design system e componentes UI
  ...designSystemPolicy.overrides,
  {
    files: ['src/components/ui/**', 'src/hooks/**'],
    rules: {
      'react/forbid-elements': 'off',
      'shadcn/no-restyle': 'off',
      'shadcn/no-raw-colors': 'off',
      'shadcn/no-arbitrary-values': 'off',
      'shadcn/no-inline-styles': 'off',
      'react-refresh/only-export-components': 'off',
      'no-restricted-syntax': 'off',
      '@stylistic/semi': 'off',
      quotes: 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/no-trailing-spaces': 'off',
      '@stylistic/jsx-curly-brace-presence': 'off',
      '@stylistic/jsx-quotes': 'off',
      '@stylistic/jsx-wrap-multilines': 'off',
      '@stylistic/jsx-closing-bracket-location': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-compiler/react-compiler': 'off',
      'react/jsx-no-leaked-render': 'off',
    },
  },
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
