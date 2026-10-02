# Plano Executivo de Implementação: CineData Analytics Agent (Vertical Slices)

> **Documento Canônico de Execução Técnica & Acompanhamento Contínuo**  
> **Fontes de Conhecimento:** `Atividade GenAI.pdf`, `plan/context.md`, `plan/ai-implementation.md`, `plan/db-semantics.md`, `plan/frontend-guidelines.md`, `plan/langchain-langgraph-standards.md`, `plan/tech-stack-plan.md`, `ui/DESIGN.md`, `ui/ref.md` e `arquitetura-anterior.md`.  
> **Status Geral do Projeto:** `[EM ANDAMENTO]`

---

## 🤖 Protocolo de Automação & Continuação Autônoma para o Agente de IA

Se você é um agente de IA lendo este arquivo para iniciar ou continuar o desenvolvimento do projeto, **siga estritamente este protocolo operacional**:

1. **Localização da Próxima Tarefa:**
   - Percorra as fatias verticais em ordem sequencial (`Slice 0` ➔ `Slice 6`).
   - Identifique a **primeira fatia vertical** cujo status não seja `[CONCLUÍDO]` ou que possua checkboxes `[ ]` pendentes.
2. **Leitura Prévia de Contexto (Obrigatória):**
   - Antes de gerar código ou alterar arquivos, abra e leia as referências listadas na seção **"Documentos de Apoio & Referências"** da fatia ativa (ex: `plan/db-semantics.md`, `plan/ai-implementation.md`, etc.).
   - Respeite as regras de linting do frontend (`frontend/LINT_GUIDE.md` e `plan/frontend-guidelines.md`) e os padrões modernos do LangChain 2026 (`plan/langchain-langgraph-standards.md`).
3. **Execução da Fatia Vertical:**
   - Implemente todas as frentes da fatia: **Agente**, **Backend**, **Frontend** e **Testes automatizados**.
   - Crie e modifique estritamente os arquivos nos caminhos relativos indicados (lembrando que a partir do **Slice 0**, todo o backend e seus testes residem sob o diretório `backend/`).
4. **Verificação Mandatória (Build, Lint e Testes):**
   - Execute os comandos exatos de verificação descritos na seção **"Comandos de Verificação"** da fatia.
   - Não considere a fatia concluída se houver qualquer erro de compilação, quebra de tipagem, falha de teste ou warning bloqueante do linter.
5. **Auto-Atualização Deste Arquivo (`plan/plano-executivo.md`):**
   - Ao finalizar e verificar a fatia com sucesso, marque as caixas `[ ]` correspondentes como `[x]`.
   - Atualize o badge de status da fatia para `[CONCLUÍDO - DD/MM/AAAA]`.
   - Atualize o **"Painel Resumo de Progresso"** no início deste documento.
6. **Comunicação Final de Turno:**
   - Sintetize com clareza o que foi implementado, os testes que foram validados e qual é a **próxima fatia pendente** a ser iniciada.

---

## 📊 Painel Resumo de Progresso das Fatias Verticais

| Slice | Nome da Fatia Vertical | Foco Funcional Principal | Status |
| :---: | :--- | :--- | :---: |
| **0** | **Fundação, Estruturação `backend/` & Pipeline Fullstack** | Mover backend para `backend/`, setup SQLite Read-Only, checkpointer, layout e testes | `[CONCLUÍDO - 01/10/2026]` |
| **1** | **Settings & Conectividade Multi-LLM** | Gestão e teste dinâmico de provedores (Groq, Local, OpenRouter, Google, OpenAI) | `[CONCLUÍDO - 01/10/2026]` |
| **2** | **Text-to-SQL Analítico & Auditoria Visual** | Core LangGraph, catálogo embutido, AST check, self-correction, SSE e Shiki | `[CONCLUÍDO - 02/10/2026]` |
| **3** | **Visualização Declarativa de Gráficos & Tabelas** | Chart.js declarativo (`ChartJsConfigDTO`), tabela analítica e exportação CSV | `[PENDENTE]` |
| **4** | **Histórico Persistente & Navegação de Threads** | `AsyncSqliteSaver`, titulação concorrente, reidratação e TimelineScrollSpy | `[PENDENTE]` |
| **5** | **Busca Semântica Híbrida & Math Sandbox** | RAG vetorial em sinopses/reviews, sandbox matemática e sugestões rápidas | `[PENDENTE]` |
| **6** | **Hardening, Validação do Desafio & Entrega** | Auditoria das 10 perguntas canônicas, resiliência de cotas, E2E e README | `[PENDENTE]` |

---

## Slice 0: Fundação, Estruturação `backend/` & Pipeline Fullstack

### 1. Objetivo e Escopo de Negócio
Isolar a arquitetura do projeto estabelecendo a pasta `backend/` para todo o código Python, atualizar dependências Python e Node.js, configurar conexão estritamente `mode=ro` com o banco `cinerocket.db`, configurar a persistência de checkpoints do LangGraph, preparar os executores de testes (`pytest` em `backend/tests` e `vitest` em `frontend`), e renderizar a casca da interface no padrão **MGC AI Dark Glassmorphism**.

### 2. Documentos de Apoio & Referências
* `Atividade GenAI.pdf` (Página 1 e 2: modelo dimensional e SQLite embutido).
* `plan/context.md` (Seção 1: Visão Geral e Princípios Arquiteturais Cardeais; Seção 3.1: Estrutura Vertical Slice em `backend/`).
* `plan/tech-stack-plan.md` (Seções 1, 3 e 4: Dependências Python e Frontend).
* `plan/langchain-langgraph-standards.md` (Seção 1 e 3.2: Versões PyPI e `AgentState`).
* `ui/DESIGN.md` (Seções 2, 3 e 5: Paleta de cores, tipografia e layout base).

### 3. Arquivos Criados, Movidos e Modificados
* **Migração Inicial para `backend/`:**
  - `app/` ➔ `backend/app/`
  - `main.py` ➔ `backend/main.py`
  - `pyproject.toml` ➔ `backend/pyproject.toml`
  - `uv.lock` ➔ `backend/uv.lock`
  - `.python-version` ➔ `backend/.python-version`
  - `llama-up.sh` ➔ `backend/llama-up.sh`
* **Arquivos do Backend (`backend/`):**
  - `backend/pyproject.toml` — Adicionar `langgraph`, `langgraph-checkpoint-sqlite`, `langchain-google-genai`, `sentence-transformers`, `sse-starlette`, `sqlparse` e remover duplicidade de `pydantic-settings`.
  - `backend/app/core/config.py` — Configurações de ambiente tipadas via Pydantic Settings (paths de banco, portas, provedores e timeouts).
  - `backend/app/db/session.py` — Conexão analítica segura com driver SQLite em modo estritamente `file:cinerocket.db?mode=ro`.
  - `backend/app/db/checkpointer.py` — Gerenciador assíncrono de persistência do LangGraph (`AsyncSqliteSaver`).
  - `backend/app/agent/state.py` — Definição do `AgentState` canônico com TypedDict e `add_messages`.
  - `backend/app/agent/graph.py` — Esqueleto compilável do `StateGraph` inicial.
  - `backend/app/shared/docs.py` — Dataclass imutável `EndpointDoc` para documentação OpenAPI.
  - `backend/app/shared/exceptions.py` — Exceções customizadas de domínio (`DatabaseReadError`, `ProviderUnavailableError`).
  - `backend/tests/conftest.py` — Fixtures globais do pytest (cliente HTTP assíncrono, banco de teste em memória).
  - `backend/tests/unit/test_config_and_db.py` — Teste unitário de carregamento de config e conexão read-only.
* **Arquivos do Frontend (`frontend/`):**
  - `frontend/package.json` — Instalar `@tanstack/react-query`, `lucide-react`, `clsx`, `tailwind-merge` e configurar `vitest` + `@testing-library/react`.
  - `frontend/vite.config.ts` — Ajustar configurações de teste e aliases `@/*`.
  - `frontend/src/index.css` — Configurar variáveis semânticas do tema MGC AI Dark (`#0E1217`, `#13171E`, `#1B202B`, `#FF5E2B`).
  - `frontend/src/lib/utils.ts` — Função utilitária `cn()` e formatadores monetários (`BRL`, `USD`).
  - `frontend/src/lib/api-client.ts` — Cliente HTTP centralizado com interceptor de erros.
  - `frontend/src/components/layouts/AppLayout.tsx` — Layout principal com Sidebar e Header Dark Glass.
  - `frontend/src/components/layouts/AppLayout.test.tsx` — Teste unitário de renderização do layout base.

### 4. Descrição Detalhada das Tarefas
* **Estruturação & Migração do Backend:**
  - Mover o código Python da raiz do projeto para o diretório `backend/` (`app/` ➔ `backend/app/`, `main.py` ➔ `backend/main.py`, `pyproject.toml` ➔ `backend/pyproject.toml`, etc.).
  - Criar o diretório de testes em `backend/tests/`.
  - Atualizar dependências em `backend/pyproject.toml` e sincronizar via `cd backend && uv sync`.
* **Backend:**
  - Implementar conexão SQLite read-only garantindo bloqueio nativo de operações de escrita (`CREATE`, `UPDATE`, `INSERT`, `DROP`).
  - Configurar checkpointer do LangGraph apontando para `conversations.db` assíncrono.
* **Agente:**
  - Criar `AgentState` com campos essenciais: `messages`, `route`, `generated_sql`, `query_result`, `error_count`, `title`.
  - Instanciar um `StateGraph` compilável com fluxo básico (START ➔ router ➔ END).
* **Frontend:**
  - Instalar dependências essenciais de UI e testes.
  - Implementar tokens de cores MGC AI em `frontend/src/index.css` respeitando o design system.
  - Criar a estrutura base do `AppLayout` com navegação lateral e topo limpo.
* **Testes:**
  - Criar teste verificando que a conexão ao `cinerocket.db` falha ao tentar executar comandos de escrita (`sqlite3.OperationalError: attempt to write a readonly database`).
  - Criar teste do layout frontend com `vitest`.

### 5. Comandos de Verificação
```bash
# Backend: Verificação de tipagem, lint e testes dentro de backend/
cd backend
uv run ruff check .
uv run pytest tests/unit/test_config_and_db.py -v
cd ..

# Frontend: Linting do design system, verificação de build e testes dentro de frontend/
cd frontend
bun run lint
bun run build
bun test
cd ..
```

### 6. Checklist Operacional
- [x] Código Python da raiz migrado para o diretório `backend/` (`backend/app`, `backend/main.py`, `backend/pyproject.toml`, etc.).
- [x] Dependências Python atualizadas e sincronizadas com `uv sync` em `backend/`.
- [x] Conexão `mode=ro` com SQLite implementada e testada contra tentativas de escrita.
- [x] Checkpointer assíncrono `AsyncSqliteSaver` configurado.
- [x] `AgentState` canônico implementado com `add_messages`.
- [x] Dependências frontend e vitest configurados no `frontend/package.json`.
- [x] Layout Dark Glassmorphism estruturado com `AppLayout.tsx`.
- [x] Testes do Slice 0 passando no backend e frontend.
- [x] Status da fatia: `[CONCLUÍDO - 01/10/2026]`

---

## Slice 1: Configuração Dinâmica de Provedores de IA (Settings & Model Connectivity)

### 1. Objetivo e Escopo de Negócio
Permitir que o usuário configure e alterne dinamicamente o provedor de IA diretamente pela interface (Groq para máxima velocidade, LM Studio/Ollama local para privacidade, OpenRouter para modelos gratuitos, Google AI Studio e OpenAI oficial), oferecendo um botão de **teste de conectividade em tempo real** com diagnóstico amigável de erros (HTTP 401, 429 ou conexão recusada na porta 1234).

### 2. Documentos de Apoio & Referências
* `plan/context.md` (Seção 3.2: Arquitetura Agnóstica de Provedores LLM & Configuração Dinâmica).
* `plan/tech-stack-plan.md` (Seção 1.1: Conectores de IA e multi-provedores).
* `plan/frontend-guidelines.md` (Seções 1 e 3: Guardrails de Formulários e ESLint).
* `arquitetura-anterior.md` (Seção 2: Separação Estrita de Responsabilidades HTTP vs Negócio e `EndpointDoc`).

### 3. Arquivos Criados e Modificados
* `backend/app/core/llm_factory.py` — Fábrica unificada de modelos com suporte dinâmico a Groq, OpenAI Local (porta 1234), OpenRouter (com headers `HTTP-Referer` e `X-Title`), Google Generative AI e OpenAI oficial.
* `backend/app/features/settings/schemas.py` — DTOs Pydantic: `ProviderConfigDTO`, `TestProviderRequestDTO`, `TestProviderResponseDTO`.
* `backend/app/features/settings/service.py` — Serviço de teste de conectividade (probe com timeout estrito de 5s e ping leve).
* `backend/app/features/settings/router_metadata.py` — Metadados OpenAPI isolados com `EndpointDoc`.
* `backend/app/features/settings/router.py` — Endpoints: `GET /settings/provider`, `POST /settings/provider`, `POST /settings/test-provider`.
* `backend/main.py` — Registro do roteador de settings no aplicativo FastAPI.
* `frontend/src/features/settings/schemas/settings.schema.ts` — Schemas Zod (`ProviderConfigSchema`, `ProviderConfigFormSchema`, `TestProviderRequestSchema`).
* `frontend/src/features/settings/types/settings.types.ts` — Tipagens TypeScript derivadas dos schemas Zod (SSOT).
* `frontend/src/features/settings/api/settingsQueryKeys.ts` — Objeto centralizador de query keys canônicas (`settingsQueryKeys.provider()`).
* `frontend/src/features/settings/hooks/useProviderConfigQuery.ts` — Hook atômico de consulta TanStack Query para leitura da configuração ativa.
* `frontend/src/features/settings/hooks/useUpdateProviderConfigMutation.ts` — Hook atômico de mutação para salvar configuração com invalidação declarativa de queries.
* `frontend/src/features/settings/hooks/useTestProviderProbeMutation.ts` — Hook atômico de mutação para teste assíncrono de conectividade probe.
* `frontend/src/features/settings/components/SettingsModal.tsx` — Modal de configurações com design Dark Glassmorphism.
* `frontend/src/features/settings/components/ProviderForm.tsx` — Formulário reativo com `@tanstack/react-form` + `useSelector` + validação Zod.
* `backend/tests/unit/test_llm_factory.py` — Teste unitário da fábrica de LLMs para cada provedor suportado.
* `backend/tests/features/test_settings_router.py` — Testes de integração dos endpoints `/settings/provider` e `/settings/test-provider`.
* `frontend/src/features/settings/components/SettingsModal.test.tsx` — Teste de interação, probe de conectividade e submissão do formulário.

### 4. Descrição Detalhada das Tarefas
* **Backend:**
  - Implementar `backend/app/core/llm_factory.py` encapsulando a inicialização de `ChatGroq`, `ChatOpenAI` e `ChatGoogleGenerativeAI`.
  - No `service.py`, criar método de teste de conectividade que envia uma mensagem de probe efêmera e calcula a latência em ms.
  - Tratar exceções conhecidas de API (401 chave inválida, 429 quota excedida, ConnectionRefused porta local offline) convertendo-as em `TestProviderResponseDTO(success=False, message="...")` sem crashar a API.
* **Frontend:**
  - Desenvolver o componente `SettingsModal` acessível a partir do Header ou Sidebar.
  - Implementar feedback visual no botão "Testar Conexão": estado de loading com spinner, badge verde com latência em ms em caso de sucesso e alerta âmbar explicativo em caso de falha.
  - Integrar mutações usando TanStack Query v5 sem re-wrapping desnecessário.
* **Testes:**
  - Testar no backend a troca de configuração e o retorno adequado de erro quando uma chave inválida for enviada (mock ou dry-run).
  - Testar no frontend a abertura do modal e a renderização dos campos conforme o provedor selecionado.

### 5. Comandos de Verificação
```bash
# Backend: Testes do Slice 1 e análise estática
cd backend
uv run ruff check .
uv run pytest tests/unit/test_llm_factory.py tests/features/test_settings_router.py -v
cd ..

# Frontend: Linting e testes do componente de configurações
cd frontend
bun run lint
bun test src/features/settings/
cd ..
```

### 6. Checklist Operacional
- [x] `llm_factory.py` implementado com suporte a Groq, Local, OpenRouter, Google e OpenAI.
- [x] Endpoints `/settings/provider` e `/settings/test-provider` operacionais com `EndpointDoc`.
- [x] Diagnóstico de erros de provedor (401, 429, timeout, connection refused) tratado amigavelmente.
- [x] Componentes `SettingsModal.tsx` e `ProviderForm.tsx` integrados com feedback de latência e validação.
- [x] Testes unitários e de integração do Slice 1 validados com sucesso no backend e frontend.
- [x] Status da fatia: `[CONCLUÍDO - 01/10/2026]`

---

## Slice 2: Text-to-SQL Analítico & Auditoria Visual (Core SQL Slice)

### 1. Objetivo e Escopo de Negócio
Implementar o fluxo nuclear da CineData Analytics: o usuário faz perguntas em linguagem natural sobre o catálogo de filmes (bilheteria, popularidade, diretores, atores, produtoras e notas) e o agente gera a consulta SQL analítica via catálogo semântico embutido, valida a consulta via AST (rejeitando comandos destrutivos), executa no banco em `mode=ro`, auto-corrige eventuais erros de sintaxe do SQLite e transmite a resposta ao frontend via SSE com visualização em tempo real do progresso (`NodeStepper`), auditoria do código gerado com Shiki (`SqlCodeBlock`) e resposta executiva formatada em Markdown.

### 2. Documentos de Apoio & Referências
* `Atividade GenAI.pdf` (Páginas 1 e 2: Categorias de perguntas analíticas e modelo relacional).
* `plan/db-semantics.md` (Documento completo: regras de ouro `receita_brl > 0`, gêneros em inglês, queries Q1 a Q10).
* `plan/ai-implementation.md` (Seção 1: FSM do LangGraph e catálogo compacto embutido; Seção 2: Tool `execute_sql_query`).
* `plan/langchain-langgraph-standards.md` (Seção 3.1: Tool de execução SQL com `mode=ro`).
* `ui/ref.md` (Seções 1 e 3: `AgentAvatar`, `NodeStepper`, `ThoughtInspector`, `SqlCodeBlock`, `MarkdownRenderer`).
* `frontend/LINT_GUIDE.md` (Guardrails do design system e anti-bypass de componentes).

### 3. Arquivos Criados e Modificados
* `backend/app/agent/tools/query_runner.py` — Tool `@tool` `execute_sql_query` com conexão `mode=ro` e bloqueio de queries sem `SELECT`.
* `backend/app/agent/nodes/sql_generator.py` — Nó gerador de SQL com catálogo semântico compacto injetado no System Prompt (~600 tokens).
* `backend/app/agent/nodes/sql_validator.py` — Nó validador de AST com parser SQL (garante estritamente `SELECT` e tabelas autorizadas).
* `backend/app/agent/nodes/sql_executor.py` — Nó executor que invoca a tool e captura os dados ou exceções do SQLite.
* `backend/app/agent/nodes/corrector.py` — Nó `sql_corrector_node` com loop fechado de auto-recuperação (até 3 tentativas).
* `backend/app/agent/nodes/synthesizer.py` — Nó sintetizador que formata a resposta executiva final em Markdown legível.
* `backend/app/agent/graph.py` — Montagem completa do subgrafo Text-to-SQL com conexões condicionais de auto-correção.
* `backend/app/features/chat/schemas.py` — DTOs de streaming SSE (`step_start`, `step_end`, `sql`, `thought`, `token`, `data`, `error`, `done`).
* `backend/app/features/chat/service.py` — `AgentService` formatando SQL com `sqlparse` e despachando eventos tipados.
* `backend/app/features/chat/router.py` — Endpoint SSE `POST /chat/stream`.
* `backend/app/features/chat/router_metadata.py` — Metadados do Swagger para o endpoint de streaming.
* `frontend/src/features/chat/types/chat.types.ts` — Tipos dos eventos SSE, estados dos nós e blocos polimórficos de mensagem.
* `frontend/src/features/chat/hooks/useAgentStream.ts` — Hook customizado de streaming SSE com montagem de blocos polimórficos.
* `frontend/src/features/chat/components/AgentAvatar.tsx` — PFP exclusivo do assistente com glow cinematográfico suave e live badge.
* `frontend/src/features/chat/components/NodeStepper.tsx` — Trilha sequencial dos passos do LangGraph com duração em ms e status dinâmico.
* `frontend/src/features/chat/components/ThoughtInspector.tsx` — Accordion recolhível de raciocínio intermediário.
* `frontend/src/features/chat/components/SqlCodeBlock.tsx` — Bloco de visualização SQL com Shiki dark glass, botão de copiar e badge "Read-Only".
* `frontend/src/features/chat/components/MarkdownRenderer.tsx` — Renderizador `react-markdown` + `remark-gfm` + tipografia refinada.
* `frontend/src/features/chat/components/ChatMessage.tsx` — Agrupador polimórfico de blocos de mensagem.
* `frontend/src/features/chat/components/ChatInput.tsx` — Campo de input com botão de envio, atalho `Enter` e estado de desativação durante streaming.
* `frontend/src/features/chat/ChatContainer.tsx` — Container integrador da tela principal do chat.
* `backend/tests/agent/test_sql_tools.py` — Testes da tool `execute_sql_query` e rejeição de escritas.
* `backend/tests/agent/test_sql_validator_ast.py` — Testes de AST rejeitando queries maliciosas (`DROP`, `DELETE`, injection).
* `backend/tests/agent/test_sql_self_correction.py` — Teste do loop de auto-recuperação do agente diante de erro de sintaxe.
* `backend/tests/agent/test_canonical_queries.py` — Validação das queries das perguntas Q1 a Q10 do desafio.
* `backend/tests/features/test_chat_stream_endpoint.py` — Teste de integração do endpoint SSE do chat.
* `frontend/src/features/chat/components/NodeStepper.test.tsx` — Teste unitário do Stepper de nós.
* `frontend/src/features/chat/components/SqlCodeBlock.test.tsx` — Teste do bloco SQL e ação de cópia.

### 4. Descrição Detalhada das Tarefas
* **Agente (LangGraph):**
  - Implementar o catálogo semântico compacto embutido no prompt do gerador SQL, contemplando as regras essenciais de negócio: `receita_brl > 0`, gêneros em inglês, tabelas de pessoas/elenco (`tipo_pessoa = 'Ator' | 'Diretor'`), evitando chamadas extras de descoberta de schema.
  - Desenvolver o validador AST que inspeciona a query gerada antes da execução no banco.
  - Implementar o self-correction loop: caso o SQLite lance `sqlite3.OperationalError`, o nó de correção alimenta o erro de volta ao modelo para gerar a query ajustada.
* **Backend:**
  - Configurar `POST /chat/stream` com streaming SSE assíncrono via `EventSourceResponse` da biblioteca `sse-starlette`.
  - Aplicar `sqlparse.format(reindent=True, keyword_case='upper')` em todo SQL antes de emitir o evento `sql`.
* **Frontend:**
  - Implementar o hook `useAgentStream` processando o stream SSE e atualizando o estado da mensagem de forma reativa e imutável.
  - Criar o componente `NodeStepper` mostrando o progresso nó a nó (`[Classificador] ➔ [Gerador SQL] ➔ [Executor SQLite] ➔ [Sintetizador]`).
  - Renderizar o bloco `SqlCodeBlock` com Shiki garantindo visual escuro de alto contraste (`#13171E`), botão de copiar com feedback de 2s e badge de segurança.
* **Testes:**
  - Escrever testes automatizados validando as 10 perguntas canônicas do desafio (Top 10 receitas, lucro médio por gênero, diretores com melhor média, ator com mais filmes, etc.).
  - Testar o comportamento do streaming e a montagem das mensagens no frontend.

### 5. Comandos de Verificação
```bash
# Backend: Testes do agente SQL, validações AST e streaming
cd backend
uv run ruff check .
uv run pytest tests/agent/ tests/features/test_chat_stream_endpoint.py -v
cd ..

# Frontend: Verificação de tipagem, regras do design system e testes unitários
cd frontend
bun run lint
bun run build
bun test src/features/chat/
cd ..
```

### 6. Checklist Operacional
- [x] Catálogo semântico compacto (~600 tokens) integrado ao System Prompt do gerador SQL.
- [x] Validador AST implementado e bloqueando comandos destrutivos ou tabelas não autorizadas.
- [x] Self-correction loop funcional com até 3 tentativas de auto-recuperação de SQL.
- [x] Queries canônicas Q1 a Q10 validadas contra o banco `cinerocket.db`.
- [x] Endpoint `POST /chat/stream` emitindo eventos SSE com SQL formatado via `sqlparse`.
- [x] `useAgentStream` processando eventos SSE e renderizando blocos polimórficos no frontend.
- [x] Componentes `NodeStepper`, `ThoughtInspector`, `SqlCodeBlock` e `AgentAvatar` finalizados.
- [x] Testes do Slice 2 validados no backend e frontend.
- [x] Status da fatia: `[CONCLUÍDO - 02/10/2026]`

---

## Slice 3: Visualização Declarativa de Gráficos & Tabela Interativa (Data Viz & Reporting)

### 1. Objetivo e Escopo de Negócio
Habilitar a geração e renderização declarativa de gráficos analíticos (`react-chartjs-2`) e tabelas paginadas para perguntas visuais e rankings. O agente decide quando gerar gráficos através da tool `generate_chartjs_spec`, emitindo o payload Pydantic puramente semântico `ChartJsConfigDTO` (zero estilização no backend). O frontend mescla automaticamente as cores do tema Dark Glassmorphism e renderiza gráficos de barras, linhas, pizza e rosca. A tabela analítica apresenta dados brutos com paginação, ordenação de colunas e botão de exportação para CSV.

### 2. Documentos de Apoio & Referências
* `Atividade GenAI.pdf` (Página 2: Funcionalidades adicionais - interface visual e gráficos).
* `plan/ai-implementation.md` (Seção 2: Tool `generate_chartjs_spec`; Seção 3: Contrato de Gráficos Declarativos `ChartJsConfigDTO`; Seção 4 - Categoria B: Perguntas que acionam gráficos).
* `plan/tech-stack-plan.md` (Seção 3.5: Visualização de Dados com `react-chartjs-2` + `chart.js`).
* `ui/DESIGN.md` (Seção 2: Cores de acento - `#FF5E2B`, gradientes, cores esmeralda/lucro e âmbar).

### 3. Arquivos Criados e Modificados
* `backend/app/agent/schemas/chart_schema.py` — Modelos Pydantic enxutos: `ChartDataset` e `ChartJsConfigDTO`.
* `backend/app/agent/tools/chart_builder.py` — Tool `@tool` `generate_chartjs_spec` para validação e emissão da especificação declarativa.
* `backend/app/agent/nodes/chart_generator.py` — Nó do LangGraph `chart_generator_node` que aciona a tool a partir dos dados do SQL.
* `backend/app/agent/graph.py` — Roteamento condicional para o nó de gráfico quando o usuário solicitar visualização ou rankings comparativos.
* `frontend/package.json` — Instalar `chart.js` e `react-chartjs-2`.
* `frontend/src/features/chat/types/chart.types.ts` — Tipagens TypeScript do payload `ChartJsConfigDTO`.
* `frontend/src/features/chat/components/ChartRenderer.tsx` — Componente inteligente wrapper do `react-chartjs-2` que injeta o tema Dark Glass, paleta de cores e tooltips refinados.
* `frontend/src/features/chat/components/TableRenderer.tsx` — Componente de tabela analítica paginada com ordenação de colunas e exportação em formato `.csv`.
* `frontend/src/features/chat/components/ChatMessage.tsx` — Inclusão dos renderizadores `ChartRenderer` e `TableRenderer` no fluxo da mensagem.
* `backend/tests/agent/test_chart_builder.py` — Teste unitário da tool de geração de gráficos e validação do schema Pydantic.
* `backend/tests/features/test_chat_chart_stream.py` — Teste de integração do streaming emitindo eventos `chart` e `data`.
* `frontend/src/features/chat/components/ChartRenderer.test.tsx` — Teste de renderização do componente de gráficos.
* `frontend/src/features/chat/components/TableRenderer.test.tsx` — Teste de ordenação e paginação da tabela analítica.

### 4. Descrição Detalhada das Tarefas
* **Agente:**
  - Implementar os schemas `ChartDataset` e `ChartJsConfigDTO` garantindo que o backend não envie propriedades de estilo (cores, fontes, bordas).
  - Integrar a tool `generate_chartjs_spec` e o nó `chart_generator_node` no fluxo do LangGraph, ativado após `sql_executor_node` quando detectada intenção visual.
* **Backend:**
  - Incluir no serviço de streaming a emissão dos eventos SSE `chart` (com o JSON do `ChartJsConfigDTO`) e `data` (com o dataset tabular).
* **Frontend:**
  - Instalar e configurar `chart.js` registrando os módulos necessários (`CategoryScale`, `LinearScale`, `BarElement`, `PointElement`, `LineElement`, `ArcElement`, `Title`, `Tooltip`, `Legend`).
  - Implementar `ChartRenderer` aplicando a paleta MGC AI: Primary Warm Orange (`#FF5E2B`), Cyan/Blue Glow (`#00D2FF` / `#3B82F6`), Emerald para lucro (`#10B981`) e greys sutis para eixos e grids.
  - Desenvolver `TableRenderer` permitindo inspecionar as linhas brutas retornadas pela query e botão para download de arquivo CSV gerado no cliente.
* **Testes:**
  - Validar a geração correta de gráficos para perguntas da Categoria B (ranking de produtoras, evolução de notas IMDb, distribuição por gênero).
  - Testar a ordenação e exportação de CSV no componente de tabela.

### 5. Comandos de Verificação
```bash
# Backend: Teste de geração dos schemas de gráfico e eventos
cd backend
uv run ruff check .
uv run pytest tests/agent/test_chart_builder.py tests/features/test_chat_chart_stream.py -v
cd ..

# Frontend: Verificação de build e testes dos renderizadores
cd frontend
bun run lint
bun run build
bun test src/features/chat/components/ChartRenderer.test.tsx src/features/chat/components/TableRenderer.test.tsx
cd ..
```

### 6. Checklist Operacional
- [ ] Schema declarativo `ChartJsConfigDTO` e tool `generate_chartjs_spec` implementados sem estilização no backend.
- [ ] Nó `chart_generator_node` integrado à FSM do LangGraph.
- [ ] Eventos SSE `chart` e `data` emitidos no fluxo de conversação.
- [ ] `react-chartjs-2` configurado com injeção automática de paleta Dark Glass.
- [ ] Componente `TableRenderer` com paginação, ordenação e exportação CSV funcional.
- [ ] Testes do Slice 3 validados no backend e frontend.
- [ ] Status da fatia: `[PENDENTE]`

---

## Slice 4: Histórico Persistente, Threads & Navegação Contextual (Persistence & Time Travel)

### 1. Objetivo e Escopo de Negócio
Garantir persistência completa de conversas entre sessões utilizando o checkpointer assíncrono `AsyncSqliteSaver` do LangGraph ancorado por `thread_id` (UUID v4). No primeiro turno de uma nova conversa, disparar uma sub-rotina assíncrona leve para titulação automática concorrente (sem impactar a latência da resposta principal). Na interface, disponibilizar a lista de conversas anteriores na Sidebar com reidratação instantânea via TanStack Query v5 e um mini-mapa lateral direito (`TimelineScrollSpy`) que acompanha a rolagem da página destacando a pergunta ativa e permitindo navegação suave entre turnos.

### 2. Documentos de Apoio & Referências
* `plan/context.md` (Seção 1.2: Checkpointer assíncrono; Seção 2.1: Titulação concorrente e Time Travel; Seção 4: Requisitos Funcionais do Frontend).
* `plan/ai-implementation.md` (Seção 1.4: Geração Concorrente do Título de Conversa - Sub-rotina Desacoplada).
* `plan/tech-stack-plan.md` (Seção 2.2: TanStack Query v5 + sincronização reativa de título com `AnimatedTitle`).
* `ui/ref.md` (Seção 2: Histórico Lateral Direito com Scroll Spy e mini-mapa).
* `plan/frontend-guidelines.md` (Seções 1, 3 e 4: Boas práticas de TanStack Query e rotas tipadas).

### 3. Arquivos Criados e Modificados
* `backend/app/agent/prompts/title_prompt.py` — Prompt ultra-conciso (3 a 5 palavras) para geração rápida de título de conversa.
* `backend/app/agent/service.py` — Sub-rotina `asyncio.create_task` para gerar o título no 1º turno (`thread.title is None`) e emitir evento SSE `title`.
* `backend/app/features/chat/router.py` — Endpoints REST: `GET /chat/threads` (listar conversas com paginação), `GET /chat/threads/{thread_id}` (obter histórico da conversa), `DELETE /chat/threads/{thread_id}` (remover conversa).
* `backend/app/features/chat/schemas.py` — DTOs: `ThreadSummaryDTO`, `ThreadDetailDTO`.
* `frontend/src/features/chat/hooks/useThreadHistory.ts` — Hook TanStack Query v5 gerenciando cache, listagem, exclusão e reidratação de conversas anteriores.
* `frontend/src/features/chat/components/SidebarThreads.tsx` — Lista de conversas anteriores na Sidebar com botão de exclusão e indicador de conversa ativa.
* `frontend/src/features/chat/components/AnimatedTitle.tsx` — Título dinâmico da conversa com animação fluida de revelação (Motion blur-in) e sincronização com `document.title`.
* `frontend/src/features/chat/components/TimelineScrollSpy.tsx` — Painel lateral direito com mini-mapa das perguntas da conversa ativa, highlight dinâmico por Intersection Observer / scroll e navegação suave via `scrollIntoView`.
* `frontend/src/features/chat/ChatContainer.tsx` — Integração de `AnimatedTitle`, `TimelineScrollSpy` e sincronização de `thread_id` na URL.
* `backend/tests/agent/test_thread_persistence.py` — Teste de persistência de estado e reidratação via `AsyncSqliteSaver`.
* `backend/tests/agent/test_title_generation.py` — Teste da sub-rotina de geração concorrente de título.
* `backend/tests/features/test_threads_api.py` — Testes dos endpoints de listagem, recuperação e deleção de threads.
* `frontend/src/features/chat/components/TimelineScrollSpy.test.tsx` — Teste de renderização e clique de navegação do mini-mapa.
* `frontend/src/features/chat/hooks/useThreadHistory.test.ts` — Teste de cache e mutação otimista de threads.

### 4. Descrição Detalhada das Tarefas
* **Backend & Persistência:**
  - Estruturar a tabela de threads e checkpoints gerenciada pelo `AsyncSqliteSaver`.
  - No `AgentService`, verificar se a thread é nova e disparar `asyncio.create_task` para titulação, despachando o evento SSE `title` assim que concluído.
  - Implementar os endpoints REST em `backend/app/features/chat/router.py` para listar threads com timestamps e títulos amigáveis.
* **Frontend:**
  - Implementar `useThreadHistory` com TanStack Query v5 para carregar o histórico de conversas na Sidebar.
  - Desenvolver o componente `AnimatedTitle` que escuta o evento SSE `title`, atualiza otimisticamente a lista da Sidebar via `queryClient.setQueryData` e atualiza `document.title`.
  - Construir o `TimelineScrollSpy` na lateral direita da janela de chat, observando a posição dos blocos de mensagem e aplicando a cor de acento `#FF5E2B` ao turno em evidência.
* **Testes:**
  - Testar a continuidade de contexto: enviar pergunta 1, recuperar o histórico pelo `thread_id` e enviar pergunta 2 verificando que o contexto foi mantido.
  - Testar a deleção de uma thread e a remoção reativa no cache do TanStack Query.

### 5. Comandos de Verificação
```bash
# Backend: Testes de persistência de threads e endpoints
cd backend
uv run ruff check .
uv run pytest tests/agent/test_thread_persistence.py tests/features/test_threads_api.py -v
cd ..

# Frontend: Verificação de build e testes de histórico e scroll spy
cd frontend
bun run lint
bun run build
bun test src/features/chat/hooks/useThreadHistory.test.ts src/features/chat/components/TimelineScrollSpy.test.tsx
cd ..
```

### 6. Checklist Operacional
- [ ] Persistência de checkpoints com `AsyncSqliteSaver` operando por `thread_id`.
- [ ] Geração assíncrona concorrente de título no 1º turno sem penalizar a latência da resposta.
- [ ] Endpoints REST `GET /chat/threads` e `DELETE /chat/threads/{thread_id}` funcionando.
- [ ] Lista de conversas na Sidebar integrada com TanStack Query v5.
- [ ] Componente `AnimatedTitle` com efeito de revelação e sincronização com `document.title`.
- [ ] Mini-mapa lateral direito `TimelineScrollSpy` com scroll spy e navegação suave.
- [ ] Testes do Slice 4 validados no backend e frontend.
- [ ] Status da fatia: `[PENDENTE]`

---

## Slice 5: Busca Semântica Híbrida & Análise Estatística Segura (RAG & Math Sandbox)

### 1. Objetivo e Escopo de Negócio
Expandir o assistente para além do SQL puro, habilitando: 
1. **Busca Semântica (RAG Vetorial):** Utilizar embeddings locais do Hugging Face (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`) para localizar filmes por conceitos subjetivos em sinopses (`dim_movies.sinopse`) e opiniões/sentimentos em resenhas de usuários (`movie_reviews.text`).
2. **Agente Híbrido:** Combinar busca vetorial com consultas relacionais (ex: encontrar filmes sobre "viagem no tempo ou IA rebelde" e filtrar via SQL aqueles com orçamento > US$ 50M e ordenar por nota IMDb).
3. **Sandbox Estatística Segura:** Disponibilizar a tool `@tool` `calculate_data_metrics` com interpretador Python nativo em namespace restrito (módulos `math` e `statistics` com `SAFE_BUILTINS`, sem dependências legadas/deprecadas como `langchain-experimental`) para cálculos de percentis, variâncias ou desvios padrão.
4. **Hub de Sugestões de Prompts:** Exibir pílulas categorizadas de perguntas na interface inicial (Categorias A, B e C).

### 2. Documentos de Apoio & Referências
* `Atividade GenAI.pdf` (Página 2: Agente híbrido com busca semântica em sinopses e resenhas).
* `plan/ai-implementation.md` (Seção 1: Estados `semantic_search_node` e `data_analysis_node`; Seção 2: Tools `search_movie_synopsis_and_reviews` e `calculate_data_metrics`; Seção 4: Catálogo de Perguntas Padronizadas - Categoria C).
* `plan/db-semantics.md` (Seção 2.1 e 2.6: Colunas `sinopse` e `movie_reviews.text`).
* `plan/langchain-langgraph-standards.md` (Seção 2 e 4: Banimento de `langchain-experimental` e implementação canônica da ferramenta de análise de dados segura).

### 3. Arquivos Criados e Modificados
* `backend/app/agent/embeddings/vector_store.py` — Gerenciador de índice vetorial local com Hugging Face embeddings em memória/arquivo para sinopses e avaliações.
* `backend/app/agent/tools/semantic_search.py` — Tool `@tool` `search_movie_synopsis_and_reviews` com busca por similaridade de cosseno.
* `backend/app/agent/tools/data_analysis.py` — Tool `@tool` `calculate_data_metrics` com sandbox fechada (`SAFE_BUILTINS`, `math`, `statistics`).
* `backend/app/agent/nodes/semantic_rag.py` — Nó do LangGraph `semantic_search_node` para rotas `rag` e `hybrid`.
* `backend/app/agent/nodes/data_analysis.py` — Nó `data_analysis_node` para execução de cálculos matemáticos avançados pós-SQL.
* `backend/app/agent/nodes/router_node.py` — Classificador de intenções refinado (`direct`, `sql`, `rag`, `hybrid`).
* `backend/app/agent/graph.py` — Integração de todas as rotas e conexões condicionais na máquina de estados principal.
* `backend/app/features/analytics/schemas.py` — DTOs com catálogo de sugestões rápidas e metadados da base.
* `backend/app/features/analytics/service.py` — Serviço fornecendo perguntas sugeridas por categoria (A, B, C) e resumo de contagens do catálogo.
* `backend/app/features/analytics/router.py` — Endpoints: `GET /analytics/suggestions`, `GET /analytics/schema`.
* `backend/app/features/analytics/router_metadata.py` — Documentação OpenAPI dos endpoints analíticos.
* `backend/main.py` — Registro do roteador de analytics.
* `frontend/src/features/chat/components/SuggestedPrompts.tsx` — Pílulas/chips clicáveis de perguntas sugeridas divididas em abas ou categorias (Finanças, Crítica, Gráficos e Híbrido RAG).
* `frontend/src/features/chat/components/SemanticEvidenceCard.tsx` — Card visual destacando trechos de sinopses e resenhas recuperadas na busca vetorial.
* `backend/tests/agent/test_data_analysis_sandbox.py` — Teste rigoroso de segurança da sandbox matemática (bloqueio de `open`, `__import__`, `os`, `sys`, execução infinita).
* `backend/tests/agent/test_semantic_search.py` — Teste unitário da busca por similaridade de sinopses.
* `backend/tests/agent/test_hybrid_flow.py` — Teste de integração do fluxo híbrido (RAG ➔ injeção de IDs ➔ SQL analítico).
* `backend/tests/features/test_analytics_router.py` — Teste dos endpoints `/analytics/suggestions` e `/analytics/schema`.
* `frontend/src/features/chat/components/SuggestedPrompts.test.tsx` — Teste de clique e injeção do prompt sugerido no campo de texto.

### 4. Descrição Detalhada das Tarefas
* **Agente (RAG & Sandbox):**
  - Implementar o indexador vetorial local em `backend/app/agent/embeddings/vector_store.py` utilizando o modelo `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
  - Criar a tool `search_movie_synopsis_and_reviews` com suporte aos alvos `synopsis` e `reviews`.
  - Implementar `calculate_data_metrics` com sandbox estrita garantindo conformidade com o padrão moderno do LangChain 2026 e zero alertas de deprecation.
  - No `router_node`, classificar perguntas temáticas e subjetivas para `rag` e perguntas conceituais com filtros métricos para `hybrid`.
* **Backend:**
  - Disponibilizar `GET /analytics/suggestions` retornando o catálogo oficial de perguntas categorizadas em A (SQL do Desafio), B (Gráficos) e C (Híbridas/RAG).
* **Frontend:**
  - Construir o componente `SuggestedPrompts` exibido na tela inicial de conversa limpa. Ao clicar em uma sugestão, o texto é automaticamente despachado para envio.
  - Implementar o card de evidência semântica `SemanticEvidenceCard` para renderizar trechos relevantes de resenhas e sinopses nas respostas da rota RAG.
* **Testes:**
  - Testar tentativas de fuga da sandbox em `calculate_data_metrics` (ex: `exec("__import__('os').system('ls')")`) garantindo retorno seguro com mensagem de erro amigável.
  - Testar perguntas canônicas da Categoria C (ex: inteligência artificial rebelde com faturamento > $100M).

### 5. Comandos de Verificação
```bash
# Backend: Teste de segurança da sandbox, testes de RAG e fluxo híbrido
cd backend
uv run ruff check .
uv run pytest tests/agent/test_data_analysis_sandbox.py tests/agent/test_semantic_search.py tests/agent/test_hybrid_flow.py tests/features/test_analytics_router.py -v
cd ..

# Frontend: Verificação de build e testes dos componentes analíticos
cd frontend
bun run lint
bun run build
bun test src/features/chat/components/SuggestedPrompts.test.tsx
cd ..
```

### 6. Checklist Operacional
- [ ] Indexador vetorial local Hugging Face operacional em sinopses e resenhas.
- [ ] Tool `calculate_data_metrics` implementada em sandbox estrita sem `langchain-experimental`.
- [ ] Roteamento inteligente para fluxos `rag` e `hybrid` ativo no LangGraph.
- [ ] Endpoints `/analytics/suggestions` e `/analytics/schema` funcionando com `EndpointDoc`.
- [ ] Componente `SuggestedPrompts` com categorias A, B e C integrado na tela inicial do chat.
- [ ] Card de evidências semânticas `SemanticEvidenceCard` estilizado em Dark Glass.
- [ ] Testes do Slice 5 validados no backend e frontend.
- [ ] Status da fatia: `[PENDENTE]`

---

## Slice 6: Hardening, Validação do Desafio & Preparação de Entrega (Delivery & E2E)

### 1. Objetivo e Escopo de Negócio
Consolidar e auditar integralmente a aplicação em aderência aos requisitos estabelecidos na `Atividade GenAI.pdf`:
1. Validação exaustiva e empírica das **10 perguntas canônicas do catálogo da CineData**.
2. Garantir comportamento resiliente diante da cota diária do OpenRouter (limite de 50 requisições/dia), emitindo diagnóstico amigável com orientação para alternar para Groq ou Local caso a cota se esgote.
3. Tratamento de exceções e `ErrorBoundary` global no frontend para evitar quebras de tela.
4. Elaboração de um `README.md` executivo impecável com passo-a-passo detalhado de execução (backend FastAPI e frontend Vite), arquitetura, decisões técnicas e manual dos modos de operação.
5. Execução limpa da suíte completa de testes, build de produção e linters com zero erros e zero warnings.

### 2. Documentos de Apoio & Referências
* `Atividade GenAI.pdf` (Páginas 1 e 2: Prazo de entrega, critérios de avaliação, categorias de perguntas, nota de limite de 50 reqs/dia).
* `plan/context.md` (Seção 1: Princípios Arquiteturais e Checklist Final).
* `plan/db-semantics.md` (Seção 5: Exemplos Canônicos de Queries para as Perguntas do Desafio).
* `plan/frontend-guidelines.md` (Documento completo: Clean Code e Linting Standards).
* `frontend/LINT_GUIDE.md` (Guia completo de resolução de erros).

### 3. Arquivos Criados e Modificados
* `backend/app/health.py` — Endpoint de integridade `/health` verificando conexão com SQLite e status do provedor configurado.
* `frontend/src/components/common/ErrorBoundary.tsx` — Tratamento de erros de renderização com visual Dark Glass e ação de recuperação.
* `frontend/src/App.tsx` — Limpeza e integração final de layout, rotas e `ErrorBoundary`.
* `README.md` — Documentação executiva completa do projeto: visão geral, arquitetura em fatias verticais, instruções de instalação (`uv`, `bun`/`npm`), configuração de variáveis de ambiente (`.env`), catálogo de perguntas testadas e guia de execução.
* `backend/llama-up.sh` — Script utilitário documentado para inicialização rápida de modelo local caso aplicável.
* `backend/tests/e2e/test_canonical_challenge_queries.py` — Bateria de testes E2E executando as 10 perguntas canônicas da Visagio de ponta a ponta.
* `backend/tests/features/test_health_and_resilience.py` — Teste de comportamento resiliente sob erro 429 (quota OpenRouter) e fallback com mensagens claras.
* `frontend/src/App.test.tsx` — Teste de integração do fluxo completo da aplicação frontend.

### 4. Descrição Detalhada das Tarefas
* **Auditoria de Negócio & Desafio:**
  - Executar as 10 perguntas da `Atividade GenAI.pdf` e confrontar os resultados com os dados do `cinerocket.db`.
  - Garantir que todas as perguntas sobre receita apliquem `WHERE receita_brl > 0 AND orcamento_brl > 0` e que gêneros estejam mapeados para o inglês.
* **Resiliência e Tratamento de Erros:**
  - Implementar interceptor para erros 429 (Too Many Requests) do OpenRouter com aviso claro: *"Cota gratuita diária do OpenRouter atingida (50 reqs). Acesse as configurações no topo para alternar para Groq (Llama 3.3 70B gratuito) ou servidor local."*
* **Frontend & Polimento:**
  - Validar a responsividade da interface (Sidebar colapsável em telas menores, quebra de tabelas e ajuste de gráficos).
  - Configurar `ErrorBoundary` protegendo o chat contra payloads corrompidos.
* **Documentação & Entrega:**
  - Redigir o `README.md` com arquitetura, diagramas de estados Mermaid, guia passo-a-passo de execução e tabela de conformidade com o desafio.

### 5. Comandos de Verificação
```bash
# Backend: Suíte completa de testes e checagem de estilo
cd backend
uv run ruff check .
uv run pytest -v
cd ..

# Frontend: Diagnóstico estrito de ESLint, build de produção e testes
cd frontend
bun run lint
bun run build
bun test
cd ..
```

### 6. Checklist Operacional
- [ ] Todas as 10 perguntas canônicas da Visagio respondidas corretamente com queries validadas.
- [ ] Mensagem de diagnóstico amigável para esgotamento de cota do OpenRouter (429) implementada.
- [ ] `ErrorBoundary` global configurado no frontend.
- [ ] `README.md` completo com instruções passo-a-passo e arquitetura documentada.
- [ ] Suíte de testes completa do backend passando sem falhas (`uv run pytest` em `backend/`).
- [ ] Suíte de testes do frontend passando sem falhas (`bun test` em `frontend/`).
- [ ] Build de produção do frontend gerado com sucesso sem erros de tipagem (`bun run build`).
- [ ] Zero erros de linter (`ruff check .` e `bun run lint`).
- [ ] Status da fatia: `[PENDENTE]`

---

## 📌 Guia de Manutenção e Regras para Atualização Contínua do Plano

1. **Atomicidade:** Sempre que uma fatia vertical for concluída, o agente deve atualizar o checklist desta página antes de declarar a tarefa encerrada.
2. **Registro de Mudanças Inesperadas:** Caso durante a implementação de uma fatia seja identificada a necessidade de adicionar uma nova dependência, criar um arquivo adicional ou alterar a assinatura de um contrato, registre a modificação diretamente na seção da respectiva fatia neste arquivo.
3. **Preservação de Contexto:** Nunca remova fatias concluídas ou seções de referência; mantenha o histórico íntegro para permitir rastreabilidade de decisões e auditoria do projeto.
