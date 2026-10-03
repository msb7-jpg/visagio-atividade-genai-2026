# Walkthrough de Refatoração de Slices Frontend: Modularização, Hooks Granulares e Fencing

Este guia documenta as decisões de arquitetura, padrões aplicados e armadilhas identificadas durante a reestruturação das slices `features/chat` e `features/settings`. O objetivo é servir como manual de referência para replicar esses mesmos princípios em qualquer slice do projeto.

---

## 1. Princípios Fundamentais

### 1.2 Co-localização dos Testes (`__tests__/`)
* **Regra:** Testes ficam próximos aos seus componentes em pastas `__tests__/` semânticas dedicadas no topo de cada subpasta.
* **Exemplo de Estrutura:**
  ```text
  components/
  ├── feed/
  │   ├── __tests__/
  │   │   ├── ChatMessageError.test.tsx
  │   │   └── NodeStepper.test.tsx
  │   ├── AgentAvatar.tsx
  │   └── ChatMessage.tsx
  ```

### 1.3 Subpastas Semânticas por Responsabilidade
* Eliminar pastas `components/` totalmente planas.
* Categorizar por função:
  * `feed/`: Elementos estruturais da linha do tempo/histórico.
  * `input/`: Interação direta de entrada de dados do usuário.
  * `renderers/`: Componentes especialistas em converter dados da IA para visualizações (gráficos, tabelas, blocos de código).
  * `form/` e `form/fields/`: Componentes de formulário e inputs especializados.
  * `modal/`: Componentes de overlay/diálogo que apenas encapsulam os formulários.

---

## 2. Padrão: Decomposição de God Components e God Hooks

### 2.1 O Problema do God Hook
Hooks com mais de 15–20 propriedades de retorno tendem a violar o Princípio da Responsabilidade Única (SRP), misturando:
1. Ciclo de vida de formulário.
2. Chamadas de sonda/teste de API (probe).
3. Descoberta dinâmica de catálogo.
4. Estados visuais de edição vs bloqueio.

### 2.2 Solução: Hooks Granulares com Injeção de Dependências
Separamos os hooks em unidades atômicas onde **valores externos são injetados via parâmetros** em vez de embutidos internamente.

#### Exemplo 1: Hook Especialista de Probe (`useProviderProbe`)
Não conhece o formulário do TanStack Form, apenas strings puras:
```ts
export function useProviderProbe({
  provider,
  model,
  apiKey,
  baseUrl,
  onModelsDiscovered
}: UseProviderProbeProps) {
  const { testProvider, testResult, isTesting, testError, resetTest } =
    useTestProviderProbeMutation()

  const handleTestConnection = async () => {
    const res = await testProvider({ provider, model, api_key: apiKey, base_url: baseUrl, timeout_seconds: 10 })
    if (res?.available_models) onModelsDiscovered?.(res.available_models)
  }

  const isConnected = testResult?.success === true
  const isFailed = testResult?.success === false || Boolean(testError)
  const inputStatus = isConnected ? 'success' : isFailed ? 'error' : 'default'

  return { handleTestConnection, testResult, isTesting, isConnected, isFailed, inputStatus, probeErrorMessage, resetTest }
}
```

#### Exemplo 2: Hook Especialista de Descoberta (`useModelDiscovery`)
Controla apenas a lista de opções e alternância de digitação livre:
```ts
export function useModelDiscovery(onModelSelect?: (model: string) => void) {
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [isCustomModel, setIsCustomModel] = useState(false)
  // ...
  return { discoveredModels, isCustomModel, setIsCustomModel, handleModelsDiscovered, resetDiscovery }
}
```

#### Exemplo 3: Hook Principal de Formulário (`useProviderFormCore`)
Concentra o estado do formulário (`useForm`), seletores reativos e mutação de persistência.

---

## 3. Padrão de Fencing & Resolução da Armadilha de Desmontagem Prematura

### 3.1 A Causa Raiz do Bug do "Clique Duplo / Mensagem Sumindo"
No React, quando passamos uma chave dinâmica baseada em estado remoto como:
```tsx
// ⚠️ ANTI-PADRÃO DETECTADO
<ProviderFormContent key={config.provider} initialConfig={config} />
```
1. Ao salvar com sucesso, a mutação do React Query dispara e invalida a query (`invalidates: [providerKey]`).
2. O React Query refaz o fetch em segundo plano e obtém a nova configuração.
3. O valor de `config.provider` muda, forçando o React a **desmontar e destruir** a instância do componente imediatamente.
4. **Impacto:** O timer do timeout (ex: 800ms) e os estados de feedback de sucesso (`saveSuccessMessage`) são abortados no unmount. A mensagem pisca por milissegundos e o callback `onSuccess()` (fechar modal) nunca é executado. O usuário é forçado a clicar uma 2ª vez.

### 3.2 Como Resolver:
1. **Eliminar chaves que causam desmontagem involuntária:** O formulário deve manter sua instância estável durante a operação de salvamento.
2. **Implementar Fencing de Submissão e Estados de Transição (`isClosing`):**
   ```ts
   // No hook useProviderFormCore:
   const [isClosing, setIsClosing] = useState(false)

   onSubmit: ({ value }) => {
     // Fencing: rejeita reentrância
     if (isUpdating || isClosing || isStreaming) return

     updateConfig(payload, {
       onSuccess: () => {
         setIsClosing(true) // Trava novas ações
         setSaveSuccessMessage('Configuração salva com sucesso!')
         startSuccessTimeout() // Garante a execução do onSuccess
       }
     })
   }
   ```
3. **Fencing no UI (Botões e Inputs):**
   ```tsx
   <Button
     type="submit"
     disabled={isUpdating || isTesting || isStreaming || isClosing}
   >
     {isUpdating ? 'Salvando...' : 'Salvar Configuração'}
   </Button>
   ```

---

## 4. Checklist para Replicar em Novas Slices

Ao criar ou refatorar qualquer nova slice (ex: `features/catalog`, `features/analytics`, etc.):

- [ ] **1. Estrutura de Pastas:**
  - Dividida semanticamente (`feed/`, `renderers/`, `form/`, `modal/`, etc.).
  - Sem `index.ts` barril.
  - Testes co-localizados dentro de `__tests__/` locais.
- [ ] **2. Separação de Mutações e Constantes:**
  - Metadados, paletas e defaults estáticos isolados em `constants/*.ts`.
  - Configurações de bibliotecas pesadas (ex: singleton do Chart.js) isoladas em `*.config.ts`.
- [ ] **3. Granularidade de Hooks:**
  - O hook principal (`use*Core`) lida com form e ciclo de vida central.
  - Hooks auxiliares recebem valores via props/argumentos (Injeção de Dependências).
- [ ] **4. Fencing & Robustez de Ações:**
  - Formulário possui trava contra cliques repetidos / double-submit.
  - Feedback visual garantido com timer estável antes do fechamento de modais.
  - Nenhuma `key={...}` dinâmica destruindo o componente durante mutações.
- [ ] **5. Verificação Automatizada:**
  - Suíte de testes: `bun run test` (todos os testes passando).
  - Verificação de tipos e compilação: `bun run build`.
