# Plano de Implementação: Observabilidade, Logs Estruturados de Grafo e Rigidez do System Prompt (Guardrails)

Baseado em [`.agents/skills/backend-coding-standards/SKILL.md`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/SKILL.md) e [`plan/plan-token-optimization-and-local-llm.md`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/plan/plan-token-optimization-and-local-llm.md).

---

## 1. Contexto e Objetivos

1. **Observabilidade e Logs Estruturados de Grafo & Estados do Sistema:**
   - Atualmente, as transições dos nós do LangGraph ocorrem de forma pouco detalhada no log do terminal backend.
   - Quando o grafo é executado, precisamos de logs estruturados e informativos no terminal (stdout) com formato padronizado que indiquem:
     - Início e conclusão de cada nó com latência (`duration_ms`), status (`done` / `error`) e thread ID.
     - Decisões tomadas nas conditional edges (`route_decision`, `semantic_decision`, `check_sql_execution`).
     - SQL gerado, tempo de execução da query, contagem de linhas retornadas, ou erro detalhado (validação AST, sintaxe SQLite, violação de segurança).
     - RAG semântico: termos buscados, número de candidatos encontrados e scores.
     - Sandbox de dados estatísticos: se ativado ou ignorado, código executado e resultado.
     - Gráficos: decisão tomada (gerar ou não), tipo e número de pontos.
     - Síntese executiva: tokens/tamanho do payload contextual TOON e tempo de resposta.
   - No `AgentChatService.stream_chat`: log de lifecycle da thread (início, titulação concorrente, encerramento ou erros capturados).
   - Respeito aos padrões de [`.agents/skills/backend-coding-standards/SKILL.md`](file:///home/miguelsb/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/SKILL.md): não usar nomes de variáveis de 1 letra, tipagem estrita, early returns, fail-fast e sem mascarar exceções.

2. **Blindagem e Rigidez dos Prompts (Guardrails Anti-Desvio):**
   - O assistente CineData Analytics deve ser estritamente especializado no domínio cinematográfico, inteligência de negócios de cinema e funcionamento da plataforma CineData.
   - Proibir expressamente desvios para tarefas fora do escopo, como:
     - Pedidos para gerar código de programação em linguagens arbitrárias (ex: Python, JavaScript, Java, C++, scripts genéricos).
     - Perguntas de história geral, geografia, política, ciência ou tópicos não relacionados à indústria cinematográfica ou aos dados do catálogo.
     - Roleplay genérico, conversas abertas não relacionadas a cinema, redação criativa ou desvio de persona.
   - Reforçar o **Router Prompt** (`router_prompt.py`) para classificar ou tratar desvios, ou direcionar para recusa polida e direta.
   - Reforçar o **Synthesizer Prompt** (`synthesizer_prompt.py`) com uma diretriz rígida de escopo: ao detectar perguntas fora de escopo (perguntas de código, história geral, curiosidades não relacionadas), recusar com polidez e firmeza em português, reafirmando sua especialidade exclusiva como Assistente Analítico do CineData.
   - Reforçar o **Catalog / SQL Prompt** (`catalog_prompt.py`) garantindo que o agente não invente ou tente modelar domínios alheios aos dados cinematográficos.

---

## 2. Detalhamento Arquitetural das Modificações

### 2.1 Padronização e Enriquecimento do Logging (`app/core/logger.py`)
- Configurar formatador de logs limpo, legível e informativo, incluindo timestamp ISO/legível, nível de log, nome do módulo/logger e mensagem.
- Garantir suporte a cores ANSI no console de desenvolvimento ou formato unificado sem truncamentos indesejados.

### 2.2 Observabilidade nos Nós e Arestas do Grafo (`app/agent/graph.py` e `app/agent/nodes/*`)
- **`app/agent/graph.py`:**
  - `_wrap_node`: Logar `[GRAPH NODE START] node={node_name}` e ao concluir `[GRAPH NODE DONE] node={node_name} duration={duration_ms}ms`. Em caso de exceção no nó, registrar `[GRAPH NODE ERROR] node={node_name} duration={duration_ms}ms error={exc}` com stacktrace se apropriado.
  - `route_decision`: Logar decisão de roteamento e motivo.
  - `semantic_decision`: Logar decisão pós-busca semântica.
  - `check_sql_execution`: Logar transição baseada no resultado da query e no estado de erro (ex: indo para corrector, sandbox, gráfico ou sintetizador).
- **`app/agent/nodes/sql_generator.py`:**
  - Logar SQL gerado (ou recusa de segurança / unsupported request).
- **`app/agent/nodes/sql_executor.py`:**
  - Logar início da validação AST e execução da query, tempo e quantidade de registros retornados (`rows_count`) ou detalhes do erro SQLite/AST.
- **`app/agent/nodes/corrector.py`:**
  - Logar tentativa de autocorreção (tentativa X de 3) com o erro sendo corrigido e nova query gerada.
- **`app/agent/nodes/chart_generator.py`:**
  - Logar decisão do gerador de gráfico: se ativado ou recusado, e configuração resumida.
- **`app/agent/nodes/data_analysis.py`:**
  - Logar se os cálculos estatísticos em sandbox foram disparados, status e resultado.
- **`app/agent/nodes/synthesizer.py`:**
  - Logar início e conclusão da síntese, quantidade de registros injetados no formato TOON e enriquecimento de links.

### 2.3 Rigidez e Guardrails nos Prompts
- **`app/agent/prompts/synthesizer_prompt.py`:**
  - Adicionar seção mandatória: `DIRETRIZ ESTRITA DE ESCOPO E GUARDRAILS (PROIBIÇÃO DE DESVIOS)`:
    - O agente é 100% focado no universo cinematográfico, mercado de filmes, dados do catálogo CineData e recursos da plataforma.
    - É terminantemente proibido responder a pedidos fora do escopo, como:
      1. Geração de código-fonte de programação (Python, JavaScript, shell scripts, etc.).
      2. Perguntas de história geral, geografia, física, política ou conhecimentos gerais não relacionados a cinema.
      3. Redação de redações escolares, poemas, receitas culinárias ou qualquer tópico alheio.
    - Caso o usuário faça solicitações desse tipo, o assistente deve responder com cortesia e concisão:
      *"Como Assistente Executivo da CineData Analytics, meu foco é exclusivamente a análise de dados cinematográficos, inteligência de mercado de filmes e nosso catálogo. Não gero códigos genéricos nem respondo sobre temas fora deste escopo. Como posso auxiliá-lo com dados ou métricas cinematográficas?"*
- **`app/agent/prompts/router_prompt.py`:**
  - Atualizar para classificar claramente dúvidas fora do escopo cinematográfico diretamente para `direct`, onde o sintetizador aplicará o guardrail polido sem desperdiçar chamadas de SQL ou vetores.
- **`app/agent/prompts/catalog_prompt.py`:**
  - Reafirmar que se a pergunta não for do domínio de filmes ou se pedir códigos genéricos, não deve gerar SQL.

---

## 3. Plano de Validação e Testes

1. **Testes Unitários:**
   - Adicionar testes cobrindo recusa de perguntas fora de escopo em `tests/agent/test_prompts_and_synthesizer.py`.
   - Garantir que testes existentes do LangGraph e da API de chat continuam passando 100%.
2. **Execução de Verificação:**
   - Executar `uv run ruff check .` para garantir conformidade estrita com o linter.
   - Executar `uv run pytest -v` para validação de regressão completa.
