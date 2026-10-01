# CineData Analytics — Plano Arquitetural e Funcional do Assistente de Inteligência Cinematográfica

## 1. Visão Geral do Sistema (System Overview)

### 1.1 Contexto e Missão
A **CineData Analytics** estruturou um Lakehouse audiovisual com 10 tabelas na camada Gold (modelo dimensional persistido no banco relacional `cinerocket.db`). Embora a base de dados contenha informações ricas sobre mais de 95 mil filmes, faturamento, bilheteria, produtoras, elencos e dezenas de milhares de avaliações de usuários, **usuários de negócio, executivos e analistas não dominam SQL**.

A missão desta solução é criar um **Assistente Inteligente Híbrido** capaz de:
1. Traduzir perguntas em linguagem natural diretamente para consultas SQL analíticas na camada Gold (**Text-to-SQL analítico**).
2. Realizar **buscas semânticas (RAG Vetorial)** em sinopses e avaliações com embeddings gerados localmente via Hugging Face.
3. Unificar ambos os mundos em um **Agente Híbrido** (orquestração multimodal: query analítica estruturada + busca conceitual/semântica).
4. Operar de maneira 100% segura (banco em modo `read-only`), com recuperação automática de falhas de sintaxe e retenção persistente de estado conversacional.

---

### 1.2 Princípios Arquiteturais Cardeais

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Interface Web / Chat)                 │
│  - Histórico de Conversas (Threads) | Streaming SSE token a token      │
│  - Blocos de Mensagem Polimórficos (NodeStepper, Shiki, Markdown, Chart)│
│  - PFP exclusivo do Agente | Timeline Lateral Direita (Scroll Spy)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP REST + SSE (Event Streaming)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 CAMADA HTTP FASTAPI (Transporte Puro & Stateless)      │
│  - Endpoints REST e SSE (/chat/stream, /chat/threads)                  │
│  - Validação de entrada Pydantic, serialização e CORS                  │
│  - Injeção de dependência da interface do serviço de agente           │
│  - ZERO import de LangChain / LangGraph nos roteadores                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Chamada da Interface: run_turn_stream(AgentInput)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│           FACHADA DE SERVIÇO DO AGENTE (AgentService / Ports)          │
│  - Ponto único de entrada: traduz requisições para o fluxo do grafo    │
│  - Checkpointer assíncrono (AsyncSqliteSaver) por thread_id           │
│  - Formatação e beautify de SQL via sqlparse no backend               │
│  - Traduz eventos internos (astream_events) para DTOs puros AgentEvent│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Orquestração interna encapsulada
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│             CORE DO AGENTE (LangGraph StateGraph Isolado)              │
│  - Grafo de Estados com Subgrafos especializados                       │
│  - Self-Correction Loop para correção autônoma de SQL                  │
│  - Hugging Face Embeddings para busca híbrida semântica                │
│  - Conexão estrita Read-Only ao SQLite (URI mode=ro)                   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Leitura somente-leitura segura
                                     ▼
                  [(cinerocket.db — SQLite Camada Gold)]
```

1. **Stateless no Servidor HTTP (FastAPI):** O FastAPI não armazena histórico conversacional em memória RAM. Toda a memória de execução e histórico de diálogo é delegada ao mecanismo de persistência e checkpointers.
2. **Desacoplamento Rigoroso (Ports & Adapters / Clean Architecture):** O FastAPI não conhece nós, transições, ferramentas ou mensagens internas do LangGraph. A camada web apenas injeta o `AgentService` e consome um fluxo assíncrono de eventos tipados (`AgentEvent`), sem importar qualquer módulo de IA.
3. **Segurança por Isolamento Físico e Lógico:** Conexão com o banco analítico configurada estritamente com `mode=ro` (Read-Only) em nível de driver SQLite, impedindo fisicamente comandos destrutivos (`DROP`, `DELETE`, `UPDATE`, `INSERT`).
4. **Execução Fluida e Automatizada:** Sem pausas manuais ou telas de confirmação no fluxo padrão. O agente executa diretamente as leituras analíticas sob rigorosa segurança read-only e proteção sintática.
5. **Autocorreção em Malha Fechada (Self-Correction Loop):** Se a query gerada disparar um erro de sintaxe ou coluna inexistente, o agente captura a mensagem de diagnóstico do SQLite, analisa o erro e gera uma versão corrigida antes de responder ao usuário.

---

## 2. Experiência do Usuário (UX) & Casos de Uso

### 2.1 Jornada do Usuário
1. **Início da Interação e Descoberta:**
   - O usuário acessa a plataforma e vê um painel com histórico de sessões anteriores (threads salvas) e um novo chat limpo.
   - O chat sugere "Pílulas de Perguntas Prontas" categorizadas (Bilheteria, Desempenho de Diretores, Tendências de Gênero, Filmes Populares).
2. **Envio da Pergunta & Feedback em Tempo Real (Live Reasoning & Chain Visualization):**
   - O usuário digita ou clica em uma pergunta.
   - O sistema exibe um **Painel de Raciocínio Dinâmico (Chain of Thought & Node Stepper)** atualizado via streaming em tempo real:
     - 🧭 **Grafo / Trilha de Execução Dinâmica:** Exibe os nós do grafo conforme são ativados e concluídos em tempo real (ex.: `[Classificador de Intenção] ➔ [Gerador SQL] ➔ [Executor Read-Only] ➔ [Interpretador Analítico] ➔ [Sintetizador]`).
     - ⚡ **Indicadores de Estado dos Nós:**
       - ⏳ *Pendente:* Nó ainda não alcançado na cadeia.
       - 🔄 *Em Execução:* Spinner dinâmico indicando o que o modelo está fazendo exatamente naquele instante (ex.: *"Varrendo sinopses vetoriais"*, *"Executando agregação SQL no cinerocket.db"*, *"Calculando variância estatística"*).
       - ✅ *Concluído:* Nó finalizado com tempo de execução aferido em milissegundos.
       - ⚠️ *Autocorreção:* Se houver erro de sintaxe, o stepper mostra uma curva de retry (*"Corrigindo cláusula GROUP BY..."*).
     - 💬 **Streaming de Pensamento (Log Expansível):** Cada nó pode emitir logs intermediários que o usuário pode inspecionar ou ocultar enquanto o texto final é gerado.

3. **Apresentação Rápida e Multifacetada:**
   - **Resposta Textual:** Resposta executiva clara, objetiva e explicativa (com valores em R$, US$ e formatação legível).
   - **Trilha da Cadeia Percorrida (Breadcrumb/Stepper Final):** Fica fixada de forma recolhível no topo da resposta para auditoria completa de como o agente chegou àquela conclusão.
   - **Bloco de Evidência / Transparência (Inspecionável):** O usuário pode expandir o accordion para ver a consulta SQL gerada, dados retornados, tempo total e tabelas envolvidas.
   - **Apresentação Tabular/Visual:** Quando a resposta envolver rankings ou comparações numéricas (ex: Top 10 filmes), os dados estruturados são exibidos em formato de tabela interativa ou sugestão gráfica.
4. **Histórico e Retomada de Contexto (Time Travel & Rehydration):**
   - O usuário pode trocar de aba, fechar o navegador e voltar mais tarde: seu `thread_id` recupera exatamente a linha do tempo do raciocínio.
   - O usuário pode inclusive retroceder a um ponto anterior da conversa e reformular uma pergunta ramificando o histórico.

---

### 2.2 Funcionalidades do Sistema

#### A. Módulo Text-to-SQL Analítico
Capaz de responder a todas as categorias do catálogo da CineData Analytics:
* **Bilheteria e Finanças:**
  - Identificação de Top filmes por receita (convertida ou nativa em R$ / USD).
  - Cálculo de lucro médio e margem de lucro (`(receita - orcamento) / receita`) filtrando valores zerados ou nulos.
* **Popularidade e Engajamento:**
  - Filmes mais populares da história ou por década.
  - Divergência entre notas de críticos e bases públicas (TMDB vs IMDb vs Avaliações internas).
  - Evolução temporal da nota média IMDb por ano de lançamento.
* **Elenco e Equipe:**
  - Identificação de atores mais produtivos por recorte temporal (últimos 5 anos).
  - Médias de diretores com corte mínimo de obras dirigidas.
  - Análise de parcerias recorrentes (dupla ator-diretor que mais produziu filmes em conjunto).
* **Gêneros e Produtoras:**
  - Distribuição volumétrica de filmes por gênero (`bridge_movie_genre`).
  - Total de faturamento e lucro acumulado por estúdio / produtora (`dim_companies`).
* **Avaliações dos Usuários:**
  - Cruzamento de engajamento do público (`dim_reviews`, `movie_reviews`) com métricas mundiais.

#### B. Módulo de Busca Semântica Híbrida (Vetor + SQL)
* **Embeddings locais leves (via Hugging Face):** Utilização de modelos eficientes (ex: `sentence-transformers/all-MiniLM-L6-v2` ou modelo multilíngue) para vetorizar sinopses e sentimentos de reviews.
* **Agente Híbrido:** Capacidade de responder a perguntas subjetivas combinadas com métricas analíticas. Exemplo: *"Encontre filmes sobre viagens no tempo ou inteligência artificial que tenham faturado mais de 100 milhões de dólares e nota IMDb acima de 7.5"*. O agente usa a busca semântica para filtrar filmes por afinidade temática e o SQL para filtrar/ordenar por métricas financeiras.

#### C. Módulo de Execução Analítica e Estatística (Interpretador Python Nativo & Seguro)
* **Substituição do Legado:** Como a biblioteca `langchain-experimental` (onde ficava o `PythonREPLTool`) está oficialmente **deprecada e sendo descontinuada** (gerando múltiplos warnings de obsolescência com Python 3.12+), a nossa arquitetura implementa uma **ferramenta nativa `@tool` com sandbox estrita**.
* **Processamento Analítico em Memória:**
  1. O agente executa a query SQL enxuta para extrair o conjunto de dados necessário do `cinerocket.db`.
  2. A ferramenta recebe o código Python para calcular agregações que seriam complexas em SQL (ex: variância, percentis, taxas de crescimento compostas, correlações ou modelagens matemáticas).
  3. A execução é feita através de um subprocesso efêmero ou ambiente isolado com namespace restrito (`{"__builtins__": safe_builtins, "math": math, "statistics": statistics}`), sem acesso a escrita em disco, sem rede e com timeout determinístico (ex: 3 segundos).
  4. Retorno estruturado e confiável com precisão matemática para a síntese final do agente.

#### D. Módulo de Segurança e Guardrails
* **Sanitização de Consultas:** Parser AST que rejeita preventivamente comandos que não comecem com `SELECT` ou cláusulas perigosas.
* **Diagnóstico Claro de Erros de Provedor:** Caso o provedor configurado pelo usuário (OpenRouter, Google AI Studio ou Local) retorne falha (ex: cota esgotada HTTP 429, chave inválida 401 ou conexão recusada no servidor local), o sistema expõe uma mensagem de erro clara e amigável orientando o usuário a ajustar suas credenciais ou reiniciar seu endpoint local, sem qualquer fallback mágico oculto.

---

## 3. Arquitetura e Engenharia de Backend

### 3.1 Padrão Estrutural: Vertical Slice & Clean Separation

O backend seguirá rigorosamente o blueprint de projetos anteriores, organizado em fatias verticais, com o motor de IA estritamente isolado da camada de transporte HTTP:

```text
backend/
├── app/
│   ├── core/                      # Configurações globais, Logging, Segurança
│   │   ├── config.py              # Pydantic Settings (chaves, URLs, caminhos de DB)
│   │   └── logging.py             # Setup de logs estruturados
│   ├── db/
│   │   ├── session.py             # Conexões assíncronas (SQLite read-only)
│   │   └── checkpointer.py        # Conexão de persistência do LangGraph (SqliteSaver / AsyncSqliteSaver)
│   ├── shared/
│   │   ├── docs.py                # EndpointDoc imutável para OpenAPI
│   │   ├── exceptions.py          # Exceções nativas de domínio
│   │   └── pagination.py          # Helpers genéricos de paginação
│   ├── agent/                     # <--- NÚCLEO DE IA PURA (DESACOPLADO DE FASTAPI)
│   │   ├── graph.py               # Definição do StateGraph (LangGraph)
│   │   ├── state.py               # State TypedDict / Pydantic com schema de estado
│   │   ├── nodes/                 # Nós atômicos do grafo
│   │   │   ├── router_node.py     # Classifica a intenção (SQL, RAG Semântico ou Híbrido)
│   │   │   ├── sql_generator.py   # Geração da query SQL a partir do schema
│   │   │   ├── sql_validator.py   # Validação sintática e verificação de read-only
│   │   │   ├── sql_executor.py    # Execução segura no cinerocket.db
│   │   │   ├── semantic_rag.py    # Busca vetorial Hugging Face na sinopse/reviews
│   │   │   ├── synthesizer.py     # Geração da resposta final explicativa
│   │   │   └── corrector.py       # Self-Correction Loop (diagnóstico e regeneração)
│   │   ├── tools/                 # Ferramentas registradas para tool-calling
│   │   │   ├── query_runner.py    # Ferramenta controlada de execução SQL read-only
│   │   │   ├── semantic_search.py # Ferramenta de busca vetorial RAG com embeddings
│   │   │   ├── chart_builder.py   # Ferramenta de geração do schema declarativo Chart.js
│   │   │   └── data_analysis.py   # Interpretador nativo seguro de código Python (sem dependência legada)
│   │   └── embeddings/            # Módulo Hugging Face para indexação semântica
│   └── features/                  # <--- VERTICAL SLICES EXPOSTAS VIA HTTP
│       ├── chat/                  # Slice de conversação
│       │   ├── router.py          # Endpoints HTTP: POST /chat/stream, GET /chat/{thread_id}
│       │   ├── router_metadata.py # OpenAPI EndpointDoc
│       │   ├── schemas.py         # DTOs: ChatRequestDTO, ChatEventDTO, ThreadStateDTO
│       │   └── service.py         # Orquestração da thread com o Agente
│       ├── analytics/             # Slice para metadados da base, perguntas sugeridas e métricas
│       │   ├── router.py          # GET /analytics/schema, GET /analytics/suggestions
│       │   └── service.py
│       └── settings/              # Slice para configuração dinâmica e validação de provedores de IA
│           ├── router.py          # GET /settings/provider, POST /settings/provider, POST /settings/test-provider
│           ├── schemas.py         # ProviderConfigDTO, TestProviderRequestDTO, TestProviderResponseDTO
│           └── service.py         # Validação ativa de credenciais, ping de modelos e verificação de URLs
└── tests/
```

### 3.2 Arquitetura Agnóstica de Provedores LLM & Configuração Dinâmica na Interface

Um dos maiores diferenciais da plataforma é a **capacidade de alternar e configurar provedores de IA diretamente pela interface web**, além do arquivo `.env`, contando com um **mecanismo de validação e dry-run em tempo real**.

```
                  ┌──────────────────────────────────────────────┐
                  │              UI Settings / .env              │
                  │  LLM_PROVIDER: "groq" | "local" |            │
                  │        "openrouter" | "google" | "openai"    │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       app.core.llm_factory.get_chat_model()  │
                  └──────────────────────┬───────────────────────┘
          ┌───────────────┼──────────────┼───────────────┼───────────────┐
          ▼               ▼              ▼               ▼               ▼
     [ChatGroq]     [ChatOpenAI]   [ChatOpenAI]    [ChatGoogle]    [ChatOpenAI]
    (Ultra-Fast)       (Local)     (OpenRouter)     (AI Studio)      (Oficial)
    • Groq API      • localhost    • openrouter.ai • Gemini 2.0    • OpenAI
    • Llama 3.3 70B • 1234 / Ollama• Modelos :free • Chave Google  • GPT-4o-mini
    • GROQ_API_KEY  • Sem chave    • OPENROUTER_KEY• GOOGLE_API_KEY• OPENAI_KEY
```

#### 1. Provedores Suportados e Modelos Padrão
* **Groq (`groq` - Recomendado para Performance):**
  - Conector nativo via `langchain-groq` (ou endpoint compatível OpenAI `https://api.groq.com/openai/v1`).
  - Modelo padrão: `llama-3.3-70b-versatile` (latência ultrabaixa, taxa de ~500 tokens/s, excelente para Tool Calling e streaming suave).
  - Credencial: `GROQ_API_KEY`.
* **Modo Local (`local` - Privacidade & Offline):**
  - Endpoint padrão: `http://localhost:1234/v1` (LM Studio, llama.cpp, Ollama, vLLM).
  - Credencial: arbitrária / não necessária.
* **OpenRouter (`openrouter` - Multi-Modelos & Modelos Gratuitos):**
  - Endpoint: `https://openrouter.ai/api/v1` com suporte a headers (`HTTP-Referer`, `X-Title`).
  - Modelos com cota gratuita (`:free`), como `meta-llama/llama-3.3-70b-instruct:free`.
* **Google AI Studio (`google` - Janela Longa & Raciocínio):**
  - Conector: `langchain-google-genai` (`ChatGoogleGenerativeAI`).
  - Modelo: `gemini-2.0-flash` ou `gemini-2.5-flash`.
* **OpenAI Oficial (`openai`):**
  - Modelo: `gpt-4o-mini` ou `gpt-4o`.

#### 2. Mecanismo de Teste e Validação em Tempo Real (`POST /settings/test-provider`)
Antes de salvar a configuração, a interface permite ao usuário disparar um teste de conectividade:
* **Validação de API Key:** Instancia um cliente isolado efêmero com timeout estrito de 5 segundos e envia uma requisição de probe mínima (ex: `HumanMessage(content="ping")` ou inspeção de modelos).
* **Validação de URL Local:** Se for provedor local, testa a resolução de DNS, conexão TCP e resposta HTTP da porta especificada.
* **Resposta Estruturada com Diagnóstico Claro:**
  - **Sucesso:** `{ "success": true, "latency_ms": 145, "model": "llama-3.3-70b-versatile", "message": "Provedor respondendo perfeitamente!" }`
  - **Erro:** Captura HTTP 401 (chave inválida), HTTP 429 (cota esgotada) ou Connection Refused (porta local offline) e retorna um diagnóstico amigável em português para a interface, sem derrubar a aplicação.

---

### 3.3 Capacidades Técnicas LangGraph e Referências Oficiais

| Capacidade | Implementação na Arquitetura | Referência da Documentação |
| :--- | :--- | :--- |
| **Estrutura da Aplicação** | Estruturação desacoplada de grafos compilados isolados da camada HTTP. | [LangGraph Application Structure](https://docs.langchain.com/oss/python/langgraph/application-structure) |
| **Persistence & Checkpointers** | Persistência do estado do agente por `thread_id` utilizando `AsyncSqliteSaver`, permitindo reidratação sob demanda sem estado em RAM. | [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) & [Checkpointers](https://docs.langchain.com/oss/python/langgraph/concepts#checkpointers) |
| **Time Travel** | Capacidade de consultar checkpoints históricos de uma conversa e fazer fork/re-execução a partir de um estado prévio. | [LangGraph Time Travel](https://docs.langchain.com/oss/python/langgraph/time-travel) |
| **Event Streaming** | Emissão de tokens de texto, status de pensamento e eventos intermediários via SSE (`astream_events`). | [LangGraph Streaming](https://docs.langchain.com/oss/python/langgraph/streaming) |
| **SQL Agent & Self-Correction** | Agente especialista em Text-to-SQL com malha fechada de captura de erros de sintaxe e retentativa autônoma. | [LangChain SQL Agent](https://docs.langchain.com/oss/python/langchain/sql-agent) & [Text-to-SQL Reference](https://github.com/langchain-ai/text-to-sql-agent) |
| **Safe Python Code Interpreter (Nativo)** | Substituição moderna e sem warnings do deprecado `PythonREPLTool`. Execução isolada em sandbox para análises estatísticas e cálculos numéricos pesados. | [LangChain Tools & Custom Tool Definition](https://docs.langchain.com/oss/python/langchain/tools) |
| **Agente Híbrido RAG** | Integração de modelo de embeddings Hugging Face para buscar conceitos nas sinopses combinado com queries relacionais. | [RAG Text-to-SQL System](https://photokheecher.medium.com/building-a-smart-text-to-sql-system-with-rag-and-langchain-1958c041d4f4) |

---

## 4. O que é Necessário para o Frontend (Requisitos & Contratos)

> *Nota: Os requisitos abaixo definem a experiência de interface e os contratos de dados necessários, mantendo a implementação técnica desacoplada e flexível para os padrões já estabelecidos no seu ecossistema.*

### 4.1 Requisitos Funcionais do Frontend
1. **Gerenciamento de Sessão Conversacional:**
   - Capacidade de criar novas conversas gerando um `thread_id` único (UUID v4) ou listar conversas anteriores armazenadas via TanStack Query v5.
2. **Consumo de Streaming em Tempo Real (SSE Tipado via `useAgentStream`):**
   - Suporte a leitura de eventos de fluxo (`text/event-stream`), despachando cada evento para blocos polimórficos de mensagem:
     - `step_start`: Transição e início de nó no grafo (ex: `{"step": "sql_generator", "label": "Gerando Consulta SQL"}`).
     - `step_end`: Conclusão do nó com duração (ex: `{"step": "sql_generator", "duration_ms": 320, "status": "completed"}`).
     - `thought`: Texto de raciocínio intermediário e logs explicativos.
     - `sql`: Código SQL formatado pelo backend (`sqlparse`), pronto para exibição com Shiki.
     - `token`: Pedaços incrementais de texto para renderização progressiva em Markdown.
     - `chart`: Payload declarativo `ChartJsConfigDTO` para renderização imediata com `react-chartjs-2`.
     - `data`: Registros analíticos tabulares (`columns`, `rows`) retornados pelo SQLite.
     - `error`: Mensagens de erro com diagnóstico amigável e indicador de autocorreção.
     - `done`: Finalização do ciclo do turno.
3. **Componente Visual de Trilha/Cadeia (Node Stepper & Thought Inspector):**
   - Exibir visualmente os passos do agente em tempo real no topo da mensagem enquanto o streaming ocorre.
   - Indicador de pulso/carregamento no nó ativo e checklist verde nos nós concluídos com tempo medido em ms.
   - Estado expansível (accordion) para inspecionar logs ou saídas parciais de cada nó.
4. **Renderização de Respostas Ricas (Polymorphic Message Blocks):**
   - **Formatação Markdown:** `react-markdown` + `remark-gfm` com suporte a tabelas GFM, links seguros e tipografia refinada via `@tailwindcss/typography` (`prose prose-invert`).
   - **Syntax Highlighting de SQL (`shiki`):** Renderização de alta fidelidade visual (TextMate grammars), fundo escuro `#13171E`, numeração de linhas, botão "Copiar SQL" com feedback visual de 2s e badge de segurança "Read-Only / SQLite".
   - **Renderizador Tabular Dinâmico:** Componente paginado com ordenação de colunas e botão de exportação para CSV ou JSON.
5. **Renderizador Declarativo de Gráficos (`react-chartjs-2`):**
   - O backend envia um payload Pydantic declarativo unificado (`ChartJsConfigDTO`) via tool `generate_chartjs_spec` contendo apenas `type`, `title`, `labels` e `datasets` (valores e labels de métricas). Zero estilização ou posicionamento no backend.
   - O frontend renderiza o componente `<Chart type={config.type} data={config.data} options={options} />`, aplicando o tema Dark Glass.
6. **Elementos de Identidade e Navegação (UX & ui/ref.md):**
   - **PFP Exclusivo do CineData Agent (`AgentAvatar`):** Avatar próprio do assistente com glow cinematográfico suave, diferenciando as respostas da IA com presença orgânica.
   - **Timeline Lateral Direita (`TimelineScrollSpy`):** Painel lateral direito resumindo as perguntas e tópicos da conversa ativa; aplica highlight dinâmico no item correspondente à medida que o usuário rola a página verticalmente.
7. **Hub / Tela de Perguntas Pré-Configuradas:**
   - Drawer ou aba no chat com as 3 categorias de perguntas rápidas:
     - 📊 *Perguntas com Gráficos Declarativos (Rankings, Linhas Temporais, Pizza de Gêneros)*.
     - 🔍 *Perguntas Canônicas Text-to-SQL do Desafio (Bilheteria, Margem de Lucro, Elenco, Produtoras)*.
     - 🧠 *Perguntas de Busca Semântica Híbrida (Conceitos temáticos em sinopses e sentimentos em avaliações)*.

---

## 5. Referências e Guias Complementares do Projeto

* 🏛️ **Arquitetura Base Anterior & Blueprint:** [arquitetura-anterior.md](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/arquitetura-anterior.md)
* 🧠 **Arquitetura de IA, Máquina de Estados & Tools:** [ai-architecture.md](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/plan/ai-architecture.md)
* 📊 **Dicionário Semântico e Modelagem de Dados:** [db-semantics.md](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/plan/db-semantics.md)
* 🛠️ **Guia Canônico de Padrões LangChain & LangGraph (2026):** [langchain-langgraph-standards.md](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/plan/langchain-langgraph-standards.md)
* 🎨 **Diretriz de Design & UI:** [Dark Glassmorphism](https://freedesignmd.com/lexicon/dark-glassmorphism)