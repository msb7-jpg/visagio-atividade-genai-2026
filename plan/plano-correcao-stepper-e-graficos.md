# Diagnóstico Sistemático (Fencing) e Plano de Ação

## 1. Diagnóstico Sistemático (Fencing das Causas-Raiz)

### Problema A: O `NodeStepper` não está aparecendo no Chat
- **Onde ocorre**: [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx#L93-L95), [`NodeStepper.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/NodeStepper.tsx#L20-L36) e na reidratação em [`ChatContainer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/ChatContainer.tsx#L51-L67).
- **Causa-Raiz 1 (Mensagens Persistidas / Histórico)**:
  Quando uma thread é carregada da API (`/chat/threads/:id`), o backend retorna apenas `messages: [{ role, content }]`. No [`ChatContainer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/ChatContainer.tsx#L62), as mensagens do histórico são reidratadas com `steps: []` e `isStreaming: false`.
  No [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx#L93):
  ```tsx
  {message.steps.length > 0 || message.isStreaming ? (
    <NodeStepper steps={message.steps} isStreaming={message.isStreaming} />
  ) : null}
  ```
  Como `steps.length === 0` e `isStreaming === false`, o componente não é renderizado.
- **Causa-Raiz 2 (Durante o Stream / Pós-Stream)**:
  No [`NodeStepper.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/NodeStepper.tsx#L26-L33):
  ```tsx
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && !hasError) {
      setIsExpanded(false)
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, hasError])
  ```
  Quando o stream finaliza com sucesso, `isExpanded` passa para `false` (colapsado). A barra colapsada fica sutil no topo do card e, se o array de passos não for preenchido ou for sobrescrito por reidratação de thread concorrente, a verificação `if (steps.length === 0 && !isStreaming) return null` faz o componente sumir por completo.

---

### Problema B: Gráficos não estão sendo renderizados na conversa
- **Onde ocorre**: [`synthesizer.py`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/backend/app/agent/nodes/synthesizer.py#L103-L111), [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx#L34-L35) e [`MarkdownRenderer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/renderers/MarkdownRenderer.tsx#L50-L79).
- **Causa-Raiz 1 (Backend - Interpolação do Prompt com Aspas Literais)**:
  No [`synthesizer.py`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/backend/app/agent/nodes/synthesizer.py#L103-L110):
  ```python
  full_prompt = (
      f"""
      "{SYNTHESIZER_PROMPT}
      \n\n{visualization_guideline}
      \n\n[CONTEXTO DOS DADOS]
      \n{context_info}"
      """
  )
  ```
  Existem **aspas duplas literais extras** envolvendo todo o system prompt (`"{SYNTHESIZER_PROMPT}...""`), o que faz com que o LLM receba o prompt envolto como uma string cotada com quebras de linha escapadas `\n\n`. Isso degrada a aderência do LLM para emitir o marcador:
  ````markdown
  ```chart
  ```
  ````
- **Causa-Raiz 2 (Frontend - Renderização desacoplada do bloco `chart`)**:
  No [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx#L34-L35):
  ```tsx
  case 'chart':
    return null
  ```
  O `renderBlock` ignora o bloco `'chart'` esperando que ele venha embutido dentro de um bloco `'text'` via `MarkdownRenderer`.
  Porém:
  1. Se a mensagem do assistente for restaurada da persistência (`/chat/threads/:id`), o checkpoint do LangGraph armazena apenas mensagens AIMessage textuais (sem o objeto estruturado `chart_spec`), fazendo com que o `chartBlock` não exista na reidratação.
  2. No stream em tempo real, se o bloco `chart` chegar ou se não houver um bloco de texto com o marcador exato, o gráfico só é exibido como fallback no fim do `MarkdownRenderer` se e somente se `chartConfig` existir no array de blocos. Se a mensagem veio de histórico sem metadado ou se o texto veio sem marcador, ele desaparece.
  3. No [`MarkdownRenderer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/renderers/MarkdownRenderer.tsx#L50-L62), a regra de interceptação do bloco de código `code`:
  ```tsx
  code: ({ className: codeClassName, children, ...props }) => {
    const isChartBlock = codeClassName?.includes('language-chart')
    if (isChartBlock) {
      if (chartConfig) {
        return <ChartRenderer config={chartConfig} />
      }
      return null
    }
  ```
  Se o modelo gera ````chart JSON_AQUI ```` ou se gera ````chart ```` mas `chartConfig` ainda não foi sincronizado ou chegou após o texto, o bloco é engolido retornando `null`.

---

## 2. Plano de Ação

### Etapa 1: Backend (`synthesizer.py` e persistência de `chart_spec` e `steps`)
1. **Corrigir formatação do prompt no [`synthesizer.py`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/backend/app/agent/nodes/synthesizer.py)**:
   - Remover as aspas literais indesejadas e `\n\n` duplicados da f-string de `full_prompt`.
   - Garantir que a diretriz para emissão de ````chart ```` seja cristalina e direta.
2. **Persistência de Metadados Analíticos no Checkpoint / Threads API**:
   - No [`threads_service.py`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/backend/app/features/chat/threads_service.py), recuperar também o `chart_spec` e os `steps` do estado persistido (`state.values.get("chart_spec")`, `state.values.get("steps")`) para retornar no `ThreadDetailDTO`. Assim, ao recarregar uma thread, gráficos e etapas continuam presentes!

### Etapa 2: Frontend (`ChatMessage.tsx` e `MarkdownRenderer.tsx`)
1. **Renderização Robusta de Gráficos**:
   - No [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx): se existir `chartBlock` na mensagem e o texto não tiver renderizado o gráfico inline (ou se não houver marcador no texto), renderizar o `<ChartRenderer config={chartConfig} />` de forma garantida.
   - No [`MarkdownRenderer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/renderers/MarkdownRenderer.tsx): tratar variações de marcação de bloco de código (`chart`, `json:chart`, etc.) e permitir que caso venha payload inline no corpo do code block, tentar parsear se `chartConfig` for nulo.
2. **Reidratação de Passos e Visibilidade do `NodeStepper`**:
   - No [`ChatContainer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/ChatContainer.tsx): reidratar os `steps` e blocos de gráficos vindos da API de detalhes da thread.
   - No [`NodeStepper.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/NodeStepper.tsx): garantir que se existirem passos no histórico ou se estiver em streaming, o componente permaneça acessível com visual claro e intuitivo, sem sumir silenciosamente.
   - Se uma mensagem for carregada do histórico e não tiver passos gravados (legado), exibir resumo com as etapas padronizadas concluídas para não quebrar a consistência visual.

### Etapa 3: Validação Automatizada (Backend e Frontend)
1. Rodar `uv run pytest` no backend para garantir integridade do LangGraph, roteamento e eventos SSE.
2. Rodar `bun run test` no frontend para validar os componentes `NodeStepper`, `ChatMessage` e `MarkdownRenderer`.
