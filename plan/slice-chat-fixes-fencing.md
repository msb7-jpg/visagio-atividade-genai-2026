# Diagnóstico Sistemático (Fencing) e Plano de Correção

## 1. Fencing: Diagnóstico e Validação das Causas-Raiz

### Problema 1: Event stream não atualiza o chat após a pergunta
- **Causa-Raiz**: No [`ChatContainer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/ChatContainer.tsx), existe o efeito:
  ```ts
  useEffect(() => {
    onActiveThreadChange?.(activeThreadId)
  }, [activeThreadId, onActiveThreadChange])
  ```
  Quando o backend envia o primeiro evento SSE `session` com o `thread_id` (UUID), `useAgentStream` invoca `setActiveThreadId(parsed.thread_id)`.
  Isso dispara `onActiveThreadChange(thread_id)` para o componente pai [`App.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/App.tsx).
  Em `App.tsx`:
  ```ts
  onActiveThreadChange={setActiveThreadId}
  ```
  atualiza `activeThreadId` no `App.tsx`.
  No entanto, `ChatContainer` também recebia:
  ```ts
  externalThreadId={activeThreadId}
  ```
  No `ChatContainer.tsx`, havia um `useEffect([externalThreadId])` executando `fetchThreadDetail(externalThreadId)`.
  **O que acontecia em tempo de execução**:
  1. O usuário digitava e enviava uma pergunta. As mensagens `userMsg` e `assistantMsg` eram colocadas no estado de `useAgentStream`.
  2. O SSE iniciava e recebia o evento `session` com o novo `thread_id`.
  3. `activeThreadId` mudava e notificava `App.tsx`.
  4. `App.tsx` repassava `externalThreadId = novo_uuid` para o `ChatContainer`.
  5. O `useEffect([externalThreadId])` disparava imediatamente um `fetchThreadDetail(novo_uuid)`.
  6. O backend ainda estava gerando os nós do grafo, logo `get_thread_detail(novo_uuid)` retornava a lista de mensagens persistidas **incompleta ou vazia** (pois o checkpoint ainda não havia finalizado ou não possuía a resposta completa).
  7. A promessa resolvia e chamava `loadThreadMessages(..., rehydratedMessages)`, **SOBRESCREVENDO** o array `messages` do streaming em andamento por mensagens desatualizadas/vazias!
  8. Além disso, no [`AppLayout.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/components/layouts/AppLayout.tsx), o botão de toggle da sidebar direita só aparecia se `rightSidebarContent` existisse. Mas o mini-mapa ficava visível mesmo sem thread ativa.

### Problema 2: `loadThread` deve ser gerenciado pelo TanStack Query
- Em vez de um `useEffect` imperativo com `fetchThreadDetail` solto dentro de `ChatContainer`, criaremos o hook `useThreadDetailQuery(threadId)`.
- A hidratação só deve ocorrer quando o usuário explicitamente troca/carrega uma thread salva (ou ao entrar via URL com um `thread_id` persistido), e nunca concorrentemente atropelar o stream ativo da sessão corrente.

### Problema 3: Sincronização da URL (`useThreadUrlSync`), histórico na sidebar e exibição condicional da timeline
- Criar o hook `useThreadUrlSync` que sincroniza a URL do navegador com a `activeThreadId` (`?thread=UUID` ou `window.history.pushState`). Ao carregar a página com `?thread=UUID`, o estado inicial já puxa a thread correspondente.
- Ao clicar no botão de histórico da sidebar esquerda ([`SidebarThreads.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/sidebar/SidebarThreads.tsx)), disparar a seleção, atualizar a URL com o UUID e reidratar os dados via TanStack Query.
- Se não houver thread ativa (tela inicial / novo chat sem perguntas), **NÃO** exibir a sidebar direita de turnos (ou passar `rightSidebarContent={null}`).

### Problema 4: Simplificação do design dos turnos da conversa (`TimelineScrollSpy`)
- Remover visual "pill" laranja estático (`bg-[#FF5E2B]` / `bg-primary/15`, bordas chamativas).
- Remover o ícone de chat repetitivo nos itens.
- Exibir texto sutil e limpo: apenas o número e o início da pergunta (`{idx + 1}. {item.title}`).
- Destacar em cor primária/sutil apenas no hover e quando for o turno ativo selecionado.
