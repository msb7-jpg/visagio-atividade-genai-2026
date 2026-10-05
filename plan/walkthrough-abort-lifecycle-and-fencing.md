# Walkthrough: Arquitetura de Fencing e Ciclo de Vida do Abort no Chat

Este documento detalha a investigação, o diagnóstico da causa raiz, o planejamento arquitetural e as alterações implementadas para estabelecer um fencing hermético no ciclo de vida de cancelamento/aborto da transmissão SSE de mensagens do agente.

---

## 1. Diagnóstico da Causa Raiz

Ao clicar no botão de pausa (`<Pause>`), o frontend aparentava não reconhecer que o processamento havia acabado, mantendo o botão em estado de cancelamento ou travando o input de texto com mensagens como *"Esta conversa ainda está sendo processada"*.

A análise revelou que **o backend não continuava transmitindo**, mas o frontend caía em uma tríade de armadilhas assíncronas:

1. **Acoplamento Semântico no `ChatInput` (`isModelLocked` vs `isStreaming`)**:
   - O componente `ChatContainer` repassava `isStreaming={isModelLocked}` para o `ChatInput`.
   - O `isModelLocked` é uma união lógica: `isStreaming || isRunningRemotely`.
   - Quando `isRunningRemotely` virava `true`, o `ChatInput` renderizava o botão `<Pause>` em vez do botão `<ArrowUp>`, mesmo sem nenhuma conexão SSE local ativa para ser abortada. O clique no botão executava `stream.abortStream()`, que não realizava nada porque a ref do controller já era nula.

2. **Race Condition de Leitura Stale pós-Abort (`isRunningRemotely` Fantasma)**:
   - No bloco `finally` de `sendMessage`, disparava-se imediatamente `queryClient.invalidateQueries(threadDetail)`.
   - O servidor FastAPI/Starlette leva alguns milissegundos para concluir o teardown ASGI da desconexão e liberar o `session_scope` no `ActiveSessionManager`.
   - Como a requisição `GET /threads/{id}` chegava antes da desalocação do lock no backend, o servidor respondia com `{ is_running: true }`.
   - Como `stream.isStreaming` local já era `false`, a condição `isRunningRemotely = Boolean(detail?.is_running) && !isViewingStreamThread` avaliava para **`true`**.
   - O frontend entrava em estado fantasma de "processamento remoto", recriando placeholders de carregamento e travando a interface.

3. **Ausência de Cancelamento Ativo no Leitor (`ReadableStreamDefaultReader`)**:
   - O gerador `parseSseStream` não escutava o `AbortSignal`. Quando o `AbortController` cancelava o fetch, o leitor não executava `reader.cancel()`, mantendo o socket TCP aberto no nível do navegador e permitindo que eventos já bufferizados continuassem disparando mutações reativas na mensagem cancelada.

---

## 2. Visão Geral da Solução: Fencing em 4 Camadas

```
+---------------------------------------------------------------------------------+
| Camada 1: Transporte SSE (sseStreamParser & chatStreamTransport)                |
| - reader.cancel() síncrono via signal.addEventListener('abort')                |
| - Fechamento imediato do socket TCP no navegador                                |
| - Fencing estrito: descarta qualquer evento pós-aborto e lança AbortError       |
+---------------------------------------------------------------------------------+
                                       │
                                       ▼
+---------------------------------------------------------------------------------+
| Camada 2: Hook de Streaming (useAgentStream)                                    |
| - Aplicação síncrona imediata de applyAbortToMessage no clique de abort         |
| - Rastreamento de threads abortadas (isThreadAborted)                           |
| - Override atômico do cache TanStack Query (is_running: false)                  |
| - Fencing de callbacks assíncronos (onEvent/onTitle/onSession descartados)      |
+---------------------------------------------------------------------------------+
                                       │
                                       ▼
+---------------------------------------------------------------------------------+
| Camada 3: Sincronização de Conversas (useChatSync)                              |
| - isRunningRemotely protegido contra threads abortadas ou locais                |
| - rehydrateThreadMessages suprime mensagens sintéticas de loading               |
+---------------------------------------------------------------------------------+
                                       │
                                       ▼
+---------------------------------------------------------------------------------+
| Camada 4: Interface e Visualização (ChatInput & ChatContainer)                  |
| - Desacoplamento: isStreaming (exibe <Pause>) vs disabled (bloqueia input)      |
| - Retorno visual instantâneo para <ArrowUp> sem retenção de locks               |
+---------------------------------------------------------------------------------+
```

---

## 3. Mapeamento Exato dos Arquivos e Alterações

### 3.1 `frontend/src/features/chat/lib/sseStreamParser.ts`
* **Intenção**: Garantir cancelamento físico da conexão HTTP e fechar o `ReadableStream` imediatamente quando o usuário abortar.
* **O que foi alterado**:
  - A assinatura da função foi expandida para `parseSseStream(response: Response, signal?: AbortSignal)`.
  - Adicionado listener de evento `'abort'` no `signal` que invoca `reader.cancel().catch(() => {})`.
  - Adicionadas verificações `signal?.aborted` no início da iteração, no loop `while` e no pós-processamento do buffer residual.
  - No bloco `finally`, remove o listener do sinal e garante `reader.releaseLock()`.

### 3.2 `frontend/src/features/chat/lib/chatStreamTransport.ts`
* **Intenção**: Estabelecer barreira de contenção (fencing) no transporte para que nenhum evento residual ou tardio alcance os reducers de mensagem após o cancelamento.
* **O que foi alterado**:
  - Repassa o `signal` para `parseSseStream(response, signal)`.
  - Verifica `if (signal?.aborted)` antes de chamar `apiFetch`, no início do loop SSE e logo após o término.
  - Lança garantidamente `new DOMException('The user aborted a request.', 'AbortError')`.
  - Impede a execução de `callbacks.onSession`, `callbacks.onTitle` e `callbacks.onEvent` se o sinal estiver cancelado.

### 3.3 `frontend/src/features/chat/hooks/useAgentStream.ts`
* **Intenção**: Prover feedback visual síncrono instantâneo ao usuário, rastrear threads abortadas e isolar o cache do TanStack Query contra estados obsoletos do backend.
* **O que foi alterado**:
  - Criadas as referências `activeAssistantMessageIdRef` (ID da resposta em curso) e `abortedThreadIdsRef` (conjunto de IDs de threads canceladas).
  - Exposta a função `isThreadAborted: (threadId: string | null | undefined) => boolean` na interface pública do hook.
  - **`abortStream()` síncrono**:
    - Invoca `abort()` no controller.
    - Se houver mensagem do assistente em fluxo, atualiza-a **no mesmo tick** com `applyAbortToMessage` e `isStreaming: false` (elimina qualquer delay visual de espera de rede).
    - Registra a thread no `abortedThreadIdsRef`.
    - Executa `queryClient.setQueryData` definindo imediatamente `is_running: false` no cache de detalhes da thread.
  - **`sendMessage()`**:
    - Remove a thread do conjunto de abortadas ao enviar uma nova mensagem nela.
    - Fencing defensivo nos callbacks `onSession`, `onTitle` e `onEvent`: se `controller.signal.aborted` for verdadeiro, retorna imediatamente sem atualizar o estado.
    - No bloco `catch`: identifica aborto por `controller.signal.aborted` ou nome do erro, aplicando `applyAbortToMessage`.
    - No bloco `finally`: caso o sinal tenha sido abortado, atualiza o cache local para `is_running: false` e **não executa** `invalidateQueries(threadDetail)` imediato, evitando consultar o servidor antes da finalização do teardown ASGI.

### 3.4 `frontend/src/features/chat/hooks/useChatSync.ts`
* **Intenção**: Eliminar locks fantasmas causados por `is_running: true` retornado pelo servidor após cancelamento e evitar mensagens artificiais de carregamento.
* **O que foi alterado**:
  - Calculadas as flags `isThreadAborted` (via `stream.isThreadAborted`) e `isManagedLocally` (indica se a thread atual é a mesma que o stream local gerencia).
  - Condição de `isRunningRemotely` refinada para:
    ```ts
    const isRunningRemotely =
      Boolean(currentDetail?.is_running) &&
      !isViewingStreamThread &&
      !isThreadAborted &&
      !isManagedLocally
    ```
  - Atualizada a função `rehydrateThreadMessages(threadDetail, isAborted)` para que, caso `isAborted` seja verdadeiro, a mensagem sintética com `isStreaming: true` (`running-${thread_id}`) não seja inserida no feed.

### 3.5 `frontend/src/features/chat/components/input/ChatInput.tsx`
* **Intenção**: Desacoplar a exibição do botão de pausa (`isStreaming`) da desabilitação do campo de entrada (`disabled`).
* **O que foi alterado**:
  - Adicionada a propriedade opcional `disabled?: boolean` na interface `ChatInputProps`.
  - Criada a constante derivada `isInputDisabled = disabled || isStreaming`.
  - O campo de texto, o botão Plus e a validação de `handleSend` utilizam `isInputDisabled`.
  - O botão de envio/pausa é estritamente controlado por `isStreaming`:
    - Se `isStreaming === true`: renderiza o botão destrutivo com ícone `<Pause>` e callback `onAbortStream`.
    - Se `isStreaming === false`: renderiza o botão padrão `<ArrowUp>`, que fica desabilitado caso `isInputDisabled` seja verdadeiro.

### 3.6 `frontend/src/features/chat/ChatContainer.tsx`
* **Intenção**: Fornecer os parâmetros semânticos corretos para o `ChatInput`.
* **O que foi alterado**:
  - O `ChatInput` agora recebe:
    ```tsx
    <ChatInput
      onSendMessage={handleSend}
      onAbortStream={stream.abortStream}
      isStreaming={stream.isStreaming}
      disabled={isModelLocked}
    />
    ```
  - Desta forma, o botão `<Pause>` só aparece quando há uma transmissão SSE local real. Caso a thread esteja bloqueada por outra sessão ou processamento remoto, o botão `<ArrowUp>` permanece visível, porém desabilitado, acompanhado pelo aviso explicativo.

---

## 4. Testes Automatizados Criados e Atualizados

1. **`frontend/src/features/chat/lib/__tests__/sseStreamParser.test.ts`** *(Novo)*:
   - Validação da decodificação normal de eventos SSE.
   - Encerramento antecipado sem emissão quando `signal.aborted` já está ativo.
   - Cancelamento ativo do `ReadableStreamDefaultReader` ao disparar `controller.abort()`.

2. **`frontend/src/features/chat/lib/__tests__/chatStreamTransport.test.ts`** *(Novo)*:
   - Rejeição imediata com `AbortError` antes de iniciar fetch se o sinal já estiver abortado.
   - Consumo completo com acionamento correto de callbacks `onSession`, `onTitle` e `onEvent`.
   - Fencing estrito no meio da iteração: aborto aciona cancelamento e lança `AbortError`.

3. **`frontend/src/features/chat/hooks/__tests__/useAgentStream.test.ts`** *(Atualizado)*:
   - Adicionado mock para `queryClient.setQueryData`.
   - Novo teste cobrindo a invocação direta de `abortStream()`: valida cancelamento síncrono de `isStreaming`, marcação no `isThreadAborted` e atualização do status dos steps para `interrupted`.

4. **`frontend/src/features/chat/hooks/__tests__/useChatSync.test.tsx`** *(Atualizado)*:
   - Incorporação de `isThreadAborted` no mock do stream.
   - Novo teste garantindo que threads marcadas como abortadas suprimem o placeholder em loading (`isStreaming: true`) gerado por `rehydrateThreadMessages`.

5. **`frontend/src/features/chat/components/input/__tests__/ChatInput.test.tsx`** *(Atualizado)*:
   - Novo teste para `disabled={true}` e `isStreaming={false}`: assegura que o campo e o botão de envio estão desabilitados sem exibir indevidamente o botão de pausa.
   - Ajustada a verificação dos slash commands para a lista canônica (`/chart` e `/clear`).

---

## 5. Validação de Integridade

- **Testes Unitários / Integração Frontend**: 105 testes executados e aprovados (`26/26` arquivos de teste).
- **Testes Backend**: 98 testes executados e aprovados (`pytest`).
- **Análise Estática e Linter**: `eslint .` concluído sem erros ou alertas.
- **Compilação de Produção**: `tsc -b && vite build` finalizado com sucesso.
