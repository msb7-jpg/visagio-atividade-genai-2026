# Diagnóstico por Fencing: Erro Silencioso no Chat e Simplificação de Efeitos

## 1. Conclusão do Diagnóstico por Fencing

### Causa-Raiz do Erro no Chat
Ao executar o teste direto no backend simulando a pergunta *"Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo."*, foi identificado o seguinte retorno:

```text
{'event': 'session', 'data': '{"thread_id": "...", "provider": "openrouter", "model": "apodex/apodex-1.1-mini:free"}'}
Error code: 429 - Rate limit exceeded: free-models-per-day no OpenRouter
{'event': 'error', 'data': '{"error": "Error code: 429...", "error_code": "AGENT_ERROR", "message": "Ocorreu uma falha no processamento analítico..."}'}
```

O backend emite o evento `error`. 

No frontend:
1. `useAgentStream` processa o evento de erro e injeta um bloco `{ type: 'error', message: ..., code: 'AGENT_ERROR' }` e define `isStreaming = false`.
2. Em [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx):
   - A barra de ações ([`ChatMessageActions`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessageActions.tsx)) e as informações do modelo estavam condicionadas a `!message.isStreaming` E dependiam de propriedades de texto ou só apareciam com certas classes.
   - O card de erro ([`ChatErrorCard.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatErrorCard.tsx)) é renderizado, mas a barra de ações com o botão de **Regenerar** e **Trocar Modelo** fica oculta quando `textualContent` é vazio ou a mensagem não possui texto gerado além do erro.
   - Além disso, a troca de modelo no Modal de Configurações permite selecionar outro provedor ativo (ex.: Groq ou Google Gemini, ambos já configurados no banco `app_settings.db`).

---

## 2. Simplificação dos `useEffect` com `@reactuses/core` e Padrões React

No [`ChatContainer.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/ChatContainer.tsx), identificamos múltiplos `useEffect` que podem ser simplificados e consolidados:

1. **Notificações para o componente pai** (`onStreamingChange`, `onTitleChange`, `onActiveThreadChange`, `onTimelineItemsChange`):
   - Estavam dispersos em 4 `useEffect` separados, disparando ciclos extras de renderização.
   - Podem ser unificados ou emitidos diretamente nos pontos de transição de estado.
2. **Scroll automático (`messagesEndRef`)**:
   - Pode ser simplificado utilizando hooks utilitários de scroll ou consolidação com debounce/animação.
3. **Reidratação de Thread**:
   - Agora é totalmente controlada pelo TanStack Query (`useThreadDetailQuery`), eliminando requisições imperativas manuais.

---

## 3. Plano de Correção e Ações

1. **Exibição Universal de Ações e Troca de Modelo diante de Erro**:
   - Garantir que [`ChatMessage.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatMessage.tsx) e [`ChatErrorCard.tsx`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/frontend/src/features/chat/components/feed/ChatErrorCard.tsx) sempre exibam:
     - O erro legível e detalhado em destaque.
     - Botão de **Tentar Novamente (Retry)**.
     - Botão de **Trocar Modelo / Provedor** que abre o modal de configurações imediatamente.
     - Indicador do modelo e provedor que gerou a falha.
2. **Alternância de Provedor Padrão para Evitar Rate Limit (429)**:
   - Configurar o provedor ativo padrão no backend para Google Gemini (`gemini-2.5-flash`) ou Groq (`qwen/qwen3.8-27b`), que estão ativos e operacionais no banco SQLite local.
3. **Refatoração dos `useEffect` no ChatContainer**:
   - Consolidar as sincronizações e callbacks para o pai, reduzindo re-renders e eliminando duplicações.
