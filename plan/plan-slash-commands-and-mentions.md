# Plano de Implementação: Slash Commands (`/`) e Botões de Ação Rápida no CineData

Este documento atualiza o escopo de implementação para focar **exclusivamente em Slash Commands (`/`)** e **Ações Rápidas no Feed (`ChatMessageActions`)**, removendo menções (`@`) para manter o escopo enxuto, ágil e focado na melhoria imediata de usabilidade analítica.

---

## 1. Visão Geral e Objetivos do Escopo Focado

1. **Backend (`AgentState`, `router_node.py`, `chart_generator.py`):**
   - Extração padronizada de comandos de barra (`/chart`, `/sql`, `/rag`, `/hybrid`, `/explain`).
   - Bypass determinístico e imediato de rota no `router_node` quando um comando for acionado (evitando chamadas e latência desnecessárias do LLM no roteador).
   - Suporte a especificadores de tipo em `/chart` (ex: `/chart bar`, `/chart line`, `/chart pie`, `/chart doughnut`) no `chart_generator_node`.
2. **Frontend (`ChatMessageActions.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`):**
   - **Novo botão "Gerar Gráfico" em `ChatMessageActions.tsx`:** quando uma resposta possuir dados/tabela mas não tiver gráfico, exibe botão de ação rápida que despacha `/chart Gere um gráfico para a análise acima`.
   - **Highlight estilo CLI para comandos conhecidos:** renderiza comandos no início da mensagem com visual de badge/pill de CLI (`font-mono bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5`).
   - **Menu de autocompletar flutuante no `ChatInput.tsx` ao digitar `/`:** lista os comandos suportados com descrição e inserção rápida por clique ou teclado (`Enter`/`Tab`).

---

## 2. Catálogo Canônico de Slash Commands

| Comando | Descrição | Comportamento no LangGraph |
| :--- | :--- | :--- |
| `/chart [tipo]` | Gera visualização gráfica (opcional: `bar`, `line`, `pie`, `doughnut`) | `requires_chart = True`, `route = 'sql'`, força execução do gerador de gráficos |
| `/sql <pergunta>` | Força rota analítica direta Text-to-SQL | `route = 'sql'`, pula classificação no roteador |
| `/rag <pergunta>` | Força busca semântica em sinopses e resenhas | `route = 'rag'`, pula classificação no roteador |
| `/hybrid <pergunta>` | Força busca semântica combinada com SQL | `route = 'hybrid'`, executa busca vetorial + SQL |
| `/explain` | Solicita explicação técnica da consulta executada | `route = 'direct'`, sintetiza a lógica do SQL anterior |
| `/clear` | Limpa a conversa ativa | Limpeza direta no cliente frontend |

---

## 3. Mudanças por Camada

### 3.1 Backend

#### [MODIFY] `backend/app/agent/state.py`
- Registrar `SlashCommandInfo`:
  ```python
  class SlashCommandInfo(TypedDict, total=False):
      name: str
      args: str | None

  class AgentState(TypedDict):
      # ...
      command: SlashCommandInfo | None

  class AgentStateUpdate(TypedDict, total=False):
      # ...
      command: SlashCommandInfo | None
  ```

#### [NEW] `backend/app/agent/utils/command_parser.py`
- Utilitário puro `parse_slash_command(text: str) -> tuple[SlashCommandInfo | None, str]`.
- Detecta e valida comandos do catálogo, extraindo `name` e argumentos restantes `args`.

#### [MODIFY] `backend/app/agent/nodes/router_node.py`
- Se a mensagem do usuário começar com um comando suportado (`/sql`, `/rag`, `/hybrid`, `/direct`, `/chart`):
  - Atribui imediatamente a `route` correspondente e define `command` no estado.
  - Se for `/chart`, define `route = 'sql'` e `requires_chart = True`.
  - Pula a invocação do LLM do roteador, economizando tempo e tokens.

#### [MODIFY] `backend/app/agent/nodes/chart_generator.py`
- Lê `command` de `state`. Se o comando for `/chart` e contiver argumento de tipo (`bar`, `line`, `pie`, `doughnut`), prioriza o tipo requisitado pelo usuário no gerador de gráfico e fallback.

---

### 3.2 Frontend

#### [MODIFY] `frontend/src/features/chat/types/chat.types.ts`
- Declarar o dicionário congelado de comandos:
  ```typescript
  export const SLASH_COMMANDS = {
    CHART: '/chart',
    SQL: '/sql',
    RAG: '/rag',
    HYBRID: '/hybrid',
    EXPLAIN: '/explain',
    CLEAR: '/clear'
  } as const

  export type SlashCommand = (typeof SLASH_COMMANDS)[keyof typeof SLASH_COMMANDS]
  ```

#### [MODIFY] `frontend/src/features/chat/components/feed/ChatMessageActions.tsx`
- Adicionar callback opcional `onGenerateChart?: () => void`.
- Renderizar botão com `<BarChart3 className="h-3.5 w-3.5 mr-1" />` e texto `"Gerar Gráfico"` quando a mensagem não possuir gráfico embutido e tiver conteúdo analítico.

#### [NEW] `frontend/src/features/chat/components/feed/CommandBadge.tsx`
- Componente que formata visualmente comandos `/` no balão de mensagem do usuário e na síntese:
  - Destaca o token com estilo CLI (`font-mono text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5`).

#### [MODIFY] `frontend/src/features/chat/components/input/ChatInput.tsx`
- Detectar se o texto começa com `/`.
- Exibir popup/popover flutuante com a lista de comandos suportados, ícones e descrições sucintas.
- Permitir navegação por setas (`ArrowUp`, `ArrowDown`) e seleção via `Enter`/`Tab` ou clique.

---

## 4. Plano de Verificação

### Testes Automatizados
- **Backend:** `uv run pytest`
  - Validar `command_parser.py` (extração de comando, argumentos e texto limpo).
  - Validar bypass de rota no `router_node.py`.
  - Validar `chart_generator.py` respeitando `/chart pie`, `/chart line`, etc.
- **Frontend:** `bun run test`
  - Validar `ChatMessageActions` exibindo e acionando `onGenerateChart`.
  - Validar popup de comandos do `ChatInput`.
  - Validar `CommandBadge`.

### Verificação Manual
1. Digitar `/` no `ChatInput` e verificar a abertura do menu de comandos.
2. Clicar em `/chart` e enviar `/chart Mostre as 5 maiores bilheterias`.
3. Verificar a presença da badge visual no balão do usuário e a renderização do gráfico pelo assistente.
4. Clicar em "Gerar Gráfico" em uma mensagem analítica sem gráfico e verificar a geração.
