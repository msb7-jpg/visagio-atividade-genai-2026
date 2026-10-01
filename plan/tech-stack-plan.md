# CineData Analytics — Plano Tecnológico e Arquitetural (Fullstack)

Este documento estabelece o plano tecnológico, o diagnóstico do backend, a análise de integração de IA no frontend e a especificação da interface web inspirada no projeto `visagio-atividade-dev-2026`.

---

## 1. Diagnóstico do Backend: Estado Atual e Dependências Faltantes

O backend possui a espinha dorsal estruturada com FastAPI, SQLite assíncrono (SQLAlchemy + aiosqlite) e integrações do ecossistema LangChain. No entanto, confrontando os requisitos do `plan/plan.md` e do `plan/ai-architecture.md` com o `pyproject.toml`, identificamos as seguintes necessidades:

### 1.1 Dependências a Adicionar no Backend

| Pacote | Função / Necessidade |
| :--- | :--- |
| **`langgraph`** (>= 1.2.12) | Orquestração do fluxo conversacional em máquina de estados (`StateGraph`, `START`, `END`). |
| **`langgraph-checkpoint-sqlite`** (>= 3.1.1) | Persistência assíncrona do histórico de conversas e estado dos nós por `thread_id` (`AsyncSqliteSaver`). |
| **`langchain-google-genai`** (>= 4.4.0) | Conector oficial para Google AI Studio / Gemini 2.0/2.5 previsto na factory multi-provedor. |
| **`sentence-transformers`** | Runtime local de embeddings vetoriais para o RAG semântico (`all-MiniLM-L6-v2` / `paraphrase-multilingual-MiniLM-L12-v2`). |
| **`sse-starlette`** (>= 2.1.0) | Suporte robusto a Server-Sent Events (SSE) assíncrono para streaming token-a-token e eventos de nós do LangGraph. |

### 1.2 Ajustes e Limpeza no `pyproject.toml`
* Remover a entrada duplicada de `pydantic-settings` (linhas 13 e 19).
* Garantir compatibilidade do interpretador Python (ambiente com Python 3.14).

---

## 2. TanStack AI (`@tanstack/ai-react`) vs. Arquitetura do Chat

O **TanStack AI** é uma biblioteca recente de abstração para chat em React baseada em hooks headless (`useChat`).

### 2.1 Análise de Encaixe e Funcionamento
* **Como opera:** Fornece gerenciamento de estado conversacional no client-side (`messages`, `input`, `isLoading`, `sendMessage`), desacoplado de estilos visuais.
* **Desafio com LangGraph:** Nosso backend emite um fluxo SSE composto por múltiplos tipos de eventos estruturados no mesmo stream:
  1. `node_start` / `node_end` (atualização do Node Stepper em tempo real).
  2. `thought` (raciocínio interno e logs intermediários).
  3. `sql` (código SQL formatado com syntax highlight).
  4. `token` (pedaços incrementais da resposta em linguagem natural).
  5. `chart` (`ChartJsConfigDTO` declarativo gerado pelo agente).
  6. `data` (linhas e colunas de registros analíticos).

### 2.2 Estratégia de Implementação Recomendada
* **Opção Híbrida / Hook Customizado:** Criar um hook `useChatStream` construído com `fetch` + `ReadableStream` / `EventSource` e cache gerenciado pelo **TanStack Query v5**.
* Isso garante compatibilidade total com o modelo de eventos do LangGraph, mantendo a reatividade do **Node Stepper**, do **Thought Inspector** e da renderização dinâmica de tabelas e gráficos.
* Caso optemos pelo `@tanstack/ai-react`, ele será acoplado como a camada de entrada do chat, delegando eventos de telemetria e gráficos para um store de visualização.

---

## 3. Stack Tecnológica do Frontend

Inspirado diretamente na arquitetura e no design de [visagio-atividade-dev-2026/frontend](file:///home/miguel/workspace/visagio-atividade-dev-2026/frontend):

### 3.1 Core & Build
* **React 19** + **TypeScript 5.8+**
* **Vite 6** com `@vitejs/plugin-react` e `vite-tsconfig-paths` (alias `@/*`)
* **React Router v7** (`react-router-dom`) para rotas declarativas (`/chat`, `/history`, `/analytics`)

### 3.2 Estilização e Design System (Dark Glassmorphism + Shadcn)
* **Tailwind CSS v4** (`@tailwindcss/vite`, `@import "tailwindcss";`, cores em `oklch`).
* **Shadcn UI (CLI v4)** com componentes Radix Nova:
  * `button`, `card`, `dialog`, `dropdown-menu`, `input`, `scroll-area`, `separator`, `sheet`, `skeleton`, `tabs`, `badge`, `tooltip`, `accordion`.
* **Lucide React** para iconografia unificada.
* **Geist Font** (`@fontsource-variable/geist`).
* **Motion / Framer Motion 13+** para animações de entrada de mensagens, pulso dos nós ativos e transições.
* **Tailwind Animate CSS** (`tw-animate-css`) e utilitários `clsx` + `tailwind-merge` (`cn`).

### 3.3 Gerenciamento de Estado & Dados Assíncronos
* **`@tanstack/react-query` v5** + `@tanstack/react-query-devtools`:
  * Gestão de cache das threads de conversa (`GET /chat/threads`).
  * Metadados e catálogo de perguntas sugeridas (`GET /analytics/suggestions`).
  * Dicionário semântico e estatísticas da base (`GET /analytics/schema`).
* **`@tanstack/react-form`** + **`zod`**:
  * Para filtros analíticos e validação tipada de parâmetros de consulta.

### 3.4 Visualização de Dados (Gráficos e Tabelas)
* **`react-chartjs-2`** + **`chart.js`**:
  * Consumo do payload declarativo `ChartJsConfigDTO` gerado pelo agente.
  * O backend envia apenas a semântica (`labels`, `datasets`, `type`), enquanto o frontend aplica o tema Dark Glass (cores âmbar, dourado cine, esmeralda lucro).
* **Tabela de Dados Analítica:**
  * Componente tabular paginado com ordenação de colunas e botão de exportação para CSV/JSON.

---

## 4. Estrutura de Diretórios Proposta para o Frontend

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Componentes Shadcn (button, card, dialog, etc.)
│   │   ├── layouts/               # AppLayout, Sidebar (Histórico de Sessões), Header
│   │   └── common/                # GlassCard, ThemeProvider, ErrorBoundary
│   ├── features/
│   │   ├── chat/                  # Core da Interface do Assistente
│   │   │   ├── components/
│   │   │   │   ├── ChatMessage.tsx        # Renderizador de mensagens (Usuário / Assistente)
│   │   │   │   ├── ChatInput.tsx          # Campo de prompt com atalhos
│   │   │   │   ├── NodeStepper.tsx        # Trilha visual do LangGraph em tempo real
│   │   │   │   ├── ThoughtInspector.tsx   # Accordion expansível de raciocínio e SQL
│   │   │   │   ├── ChartRenderer.tsx      # Renderizador react-chartjs-2
│   │   │   │   ├── TableRenderer.tsx      # Tabela analítica com paginação e exportação
│   │   │   │   └── SuggestedPrompts.tsx   # Pílulas de perguntas sugeridas
│   │   │   ├── hooks/
│   │   │   │   ├── useChatStream.ts       # Consumo SSE token-a-token e eventos do grafo
│   │   │   │   └── useThreadHistory.ts    # TanStack Query para listar e reidratar threads
│   │   │   └── types/chat.ts              # DTOs de eventos SSE, mensagens e nós
│   │   └── analytics/             # Hub de Metadados e Dicionário da Base
│   │       ├── components/
│   │       └── hooks/useAnalytics.ts
│   ├── lib/
│   │   ├── api-client.ts          # Axios / Fetch com baseURL e headers
│   │   ├── query-client.ts        # TanStack QueryClient configurado
│   │   └── utils.ts               # cn(), formatadores de moeda (BRL, USD) e datas
│   ├── routes/
│   │   └── AppRoutes.tsx          # Configuração de rotas da aplicação
│   ├── index.css                  # Variáveis oklch Dark Glassmorphism, Tailwind v4
│   └── main.tsx                   # Entrypoint da aplicação
├── components.json                # Configuração do Shadcn UI
├── package.json
└── vite.config.ts
```

---

## 5. Roteiro de Execução

1. **Backend:** Instalar as dependências pendentes (`uv add langgraph langgraph-checkpoint-sqlite langchain-google-genai sse-starlette sentence-transformers`) e corrigir a duplicação no `pyproject.toml`.
2. **Frontend:** Inicializar o projeto Vite React TS com a pasta `frontend` (ou `ui/`), configurar Tailwind CSS v4, Geist Font e instalar os componentes Shadcn base.
3. **Integração:** Implementar o endpoint SSE no backend e o hook `useChatStream` no frontend com suporte ao **Node Stepper** e ao **ChartRenderer**.
