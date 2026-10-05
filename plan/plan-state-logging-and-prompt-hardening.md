# Plano de Implementação: Telemetria Estruturada de Estado/Erros e Blindagem Rígida do Prompt

## 1. Contexto e Objetivos

Este plano tem como base os padrões arquiteturais em `.agents/skills/backend-coding-standards/SKILL.md` (Clean Architecture, PEP 8/N818, log estruturado, fail-fast, controle de complexidade $\le 10$, anti-god files, zero identificadores de 1 letra) e os aprendizados de otimização documentados em `plan/plan-token-optimization-and-local-llm.md`.

O objetivo é duplo:
1. **Telemetria de Estado e Logs Operacionais no Backend:**
   - Registrar de forma estruturada e visível no terminal/console do backend o ciclo de vida completo do grafo do agente: início da execução, transição de nós, decisões de roteamento, geração e validação de SQL, tempos de execução de nós, resultados de consultas e principalmente **todos os casos de erro e recuperação** (falhas de validação AST, erros de sintaxe SQL, erros de sandbox matemática, falhas de conectividade LLM e bloqueios de segurança).
   - Facilitar o debug em tempo real durante a execução das requisições via SSE e testes.

2. **Blindagem Rigorosa do System Prompt (Restrição de Escopo & Anti-Desvio):**
   - Deixar o system prompt (`synthesizer_prompt.py`, `router_prompt.py` e `catalog_prompt.py`) estritamente blindado contra desvios de finalidade.
   - Proibir o agente de responder a perguntas ou solicitações fora do escopo do CineData Analytics (ex: pedidos para gerar códigos de programação em Python/JS, perguntas de história geral, geografia, redação, matemática pura não relacionada ao catálogo, conselhos gerais, ou qualquer tema alheio à indústria cinematográfica e ao catálogo analítico).
   - Estabelecer uma resposta padrão educada, assertiva e executiva de recusa/redirecionamento quando a mensagem estiver fora do escopo.

---

## 2. Arquitetura de Logs e Telemetria

### 2.1 Enriquecimento do Wrapper de Nós (`app/agent/graph.py`)
No `graph.py`, a função `_wrap_node` já intercepta a execução de cada nó para telemetria de latência e formatação de steps. Vamos aprimorá-la para:
- Emitir log `INFO` na entrada do nó: `[GRAPH] Iniciando nó '%s' (thread_id: %s)`
- Emitir log `INFO` na saída do nó: `[GRAPH] Concluído nó '%s' em %d ms`
- Emitir log `ERROR` ou `WARNING` detalhado se o nó retornar erro (`last_error`, `error_category`) ou lançar exceção.

### 2.2 Logs Específicos por Nó do Grafo
- **`router_node.py`**:
  - Logar a classificação com rota decidida e o motivo/slash command.
  - Se for detectado pedido fora de escopo (ex: classified as direct/out-of-scope), logar `[ROUTER] Rota selecionada: %s`.
- **`sql_generator.py`**:
  - Logar `[SQL_GENERATOR] SQL gerado com sucesso: %s` (ou SQL ausente com a justificativa/categoria de erro).
  - Em caso de segurança/violação: logar `WARNING: [SQL_GENERATOR] Tentativa de operação não autorizada ou fora de escopo: %s`.
- **`sql_validator.py` e `sql_executor.py`**:
  - `sql_executor_node`: logar se a query foi executada com sucesso e a quantidade de linhas retornadas: `[SQL_EXECUTOR] Consulta executada com sucesso (%d linhas retornadas)`.
  - Se houver falha de AST ou SQLite: logar `WARNING: [SQL_EXECUTOR] Falha na execução SQL (tentativa %d): %s`.
- **`corrector.py`**:
  - Logar a tentativa de autocorreção: `[SQL_CORRECTOR] Executando autocorreção para o erro: %s (tentativa %d)`.
- **`data_analysis.py`**:
  - Já possui logs; garantir que exceções na sandbox registrem traceback e input do código gerado com nível `WARNING` ou `ERROR`.
- **`synthesizer.py`**:
  - Logar quando a resposta executiva final for gerada com sucesso e se links de filmes foram enriquecidos.
- **`chat/service.py`**:
  - Logar início do stream, término e erros capturados no pipeline SSE.

---

## 3. Blindagem Rígida dos Prompts (Restrição de Escopo)

### 3.1 `router_prompt.py`
- Reforçar que mensagens fora de escopo (perguntas de história, geração de código, receitas, etc.) devem ser classificadas como `"direct"` para que o sintetizador emita a resposta padrão de recusa educada, sem tentar disparar consultas SQL vazias.

### 3.2 `synthesizer_prompt.py`
- Adicionar uma regra de topo prioritária: **ESTRITO ESCOPO CINEMATOGRÁFICO E RECUSA DE DESVIOS**:
  - O assistente é **exclusivo e restrito** à análise cinematográfica, catálogo de filmes e inteligência de negócios do setor audiovisual.
  - É **TERMINANTEMENTE PROIBIDO** responder a solicitações externas como:
    * Geração ou depuração de código de software (Python, JavaScript, SQL avulso, HTML, etc.).
    * Perguntas de história geral, geografia, política, ciência geral, piadas, redações ou conselhos pessoais.
    * Qualquer assunto não relacionado ao universo cinematográfico ou aos dados do CineData.
  - Caso o usuário faça uma pergunta fora de escopo, responder estritamente com a recusa padrão executiva:
    > "Sou o assistente especializado exclusivamente em análise de dados cinematográficos do CineData Analytics. Não tenho autorização para responder a perguntas fora deste escopo (como geração de código de programação ou conhecimentos gerais). Como posso ajudar você com dados sobre filmes, bilheterias, orçamentos, gêneros ou elenco?"

### 3.3 `catalog_prompt.py`
- Reforçar a regra 5 (SEGURANÇA, ESCOPO E READ-ONLY): não gerar SQL e recusar explicitamente comandos ou pedidos fora da temática cinematográfica.

---

## 4. Plano de Implementação Passo a Passo

1. **Atualizar `backend/app/agent/prompts/synthesizer_prompt.py` & `router_prompt.py` & `catalog_prompt.py`:**
   - Adicionar as diretrizes rígidas de barreira de escopo e resposta de recusa padrão.
2. **Implementar Logs Estruturados no Fluxo do Grafo:**
   - `backend/app/agent/graph.py`: instrumentar `_wrap_node`, `route_decision`, `check_sql_execution` com logs ricos e sem variáveis de 1 letra.
   - `backend/app/agent/nodes/sql_executor.py`: logar sucesso de consulta (total de linhas) e falhas detalhadas com contagem de erros.
   - `backend/app/agent/nodes/sql_generator.py`: logar geração de SQL, thought e categoria de erros com clareza.
   - `backend/app/agent/nodes/corrector.py`: logar tentativas de correção.
   - `backend/app/agent/nodes/synthesizer.py`: logar finalização da síntese.
   - `backend/app/features/chat/service.py`: logar ciclo de vida do stream SSE (início, nós executados, finalização com sucesso/erro).
3. **Adicionar/Atualizar Testes Automatizados:**
   - Teste de recusa de escopo no sintetizador e roteador.
   - Teste de registro de logs e propagação de estado em casos de erro.
   - Executar `uv run pytest` e `uv run ruff check .` para garantir conformidade estrita e 100% de testes passando.
