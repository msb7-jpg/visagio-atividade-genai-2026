# Guia Canônico de Padrões e Práticas Modernas: LangChain & LangGraph (2026)

Este guia serve como a **referência técnica oficial de desenvolvimento** para a nossa aplicação. Ele documenta as versões mais recentes das bibliotecas, as mudanças fundamentais de arquitetura introduzidas nas versões atuais, a lista de módulos legados/deprecados (o que **NÃO** fazer) e os padrões recomendados de código para garantir zero warnings e máxima manutenibilidade.

---

## 1. Matriz de Versões e Pacotes Oficiais (PyPI 2026)

| Pacote                               | Versão Atual / Recomendada | Papel no Projeto                                                                                    |
| :----------------------------------- | :------------------------- | :-------------------------------------------------------------------------------------------------- |
| **`langchain`**                      | `>= 1.4.3`                 | Orquestração de alto nível, integrações e utilitários.                                              |
| **`langchain-core`**                 | `>= 1.6.6`                 | Interfaces fundamentais (`BaseMessage`, `@tool`, `BaseChatModel`, `Runnable`).                      |
| **`langgraph`**                      | `>= 1.2.12`                | Grafo de estados (`StateGraph`, `START`, `END`, `MessagesState`, `Command`).                        |
| **`langgraph-checkpoint-sqlite`**    | `>= 3.1.1`                 | Checkpointer assíncrono e síncrono para persistência em SQLite (`AsyncSqliteSaver`, `SqliteSaver`). |
| **`langchain-openai`**               | `>= 1.6.6`                 | Integração OpenAI, modelos locais compatíveis (porta 1234) e OpenRouter.                            |
| **`langchain-google-genai`**         | `>= 4.4.0`                 | Conector nativo para Google AI Studio / Gemini API.                                                 |
| **`langchain-huggingface`**          | `>= 1.2.2`                 | Embeddings locais para RAG via Hugging Face Hub / Sentence Transformers.                            |
| **`pydantic` & `pydantic-settings`** | `>= 2.13.5` / `>= 2.15.0`  | Tipagem estrita e carregamento seguro de variáveis de ambiente.                                     |

---

## 2. O Que Mudou: Tabela "NUNCA USE" vs "SEMPRE USE" (Anti-Patterns & Deprecations)

| ❌ Legado / Deprecado / Não Usar                           | ✅ Padrão Canônico Atual                                                      | Por que evitar?                                                                                           |
| :--------------------------------------------------------- | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `langchain_experimental.tools.python.tool.PythonREPLTool`  | `@tool` customizado com sandbox (`calculate_data_metrics`)                    | `langchain-experimental` foi colocado em sunset / deprecado e gera múltiplos warnings com Python moderno. |
| `from langchain.chains import LLMChain, ConversationChain` | `chain = prompt \| model \| StrOutputParser()`                                | Chains legadas foram descontinuadas em favor de pipes LCEL (`Runnable`).                                  |
| `from langchain.agents import initialize_agent, AgentType` | `from langgraph.prebuilt import create_react_agent` ou `StateGraph` explícito | `initialize_agent` é monolítico, não suporta streaming refinado nem checkpointers persistentes.           |
| `from langchain.tools import tool`                         | `from langchain_core.tools import tool`                                       | O decorador `@tool` reside no pacote `langchain_core`.                                                    |
| `from langchain.schema import ...`                         | `from langchain_core.messages import HumanMessage, AIMessage, ToolMessage`    | `langchain.schema` foi decomposto no `langchain_core`.                                                    |
| Herdar de `BaseTool` para ferramentas simples              | Usar o decorador `@tool` com type hints e docstrings claras                   | `@tool` gera esquemas JSON/Pydantic automáticos para Tool Calling.                                        |
| Checkpoints com `MemorySaver` em produção                  | `AsyncSqliteSaver.from_conn_string("...")`                                    | `MemorySaver` guarda dados na RAM e se perde ao reiniciar ou escalar containers.                          |
| `dict` genérico solto como estado                          | `TypedDict` com `Annotated[list, add_messages]` ou herdar de `MessagesState`  | Reducers explícitos evitam sobrescrita acidental de histórico de mensagens.                               |
| Importar `ChatOpenAI` de `langchain.chat_models`           | `from langchain_openai import ChatOpenAI`                                     | Provedores foram desacoplados em pacotes de parceiros (`partner packages`).                               |

---

## 3. Padrões Canônicos de Implementação

### 3.1 Criação de Ferramentas com `@tool`

Toda tool deve ter tipagem estrita com Pydantic / Python hints e uma docstring explicativa clara, pois o LLM utiliza a docstring para decidir quando invocá-la.

```python
# app/agent/tools/query_runner.py
import sqlite3
from typing import Any
from langchain_core.tools import tool

@tool
def execute_sql_query(query: str) -> list[dict[str, Any]]:
    """
    Executa uma consulta SQL em modo estritamente READ-ONLY no banco de dados analítico cinerocket.db.
    Retorna uma lista de dicionários contendo os registros encontrados.
    Apenas queries que comecem com SELECT são permitidas.
    """
    clean_query = query.strip()
    if not clean_query.upper().startswith("SELECT"):
        raise ValueError("Apenas consultas SELECT de leitura são autorizadas.")

    # Conexão estritamente Read-Only em nível de SO
    with sqlite3.connect("file:cinerocket.db?mode=ro", uri=True) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(clean_query)
        rows = cur.fetchall()
        return [dict(row) for row in rows]
```

---

### 3.2 Estruturação Canônica de Estado (`AgentState`)

```python
# app/agent/state.py
from typing import Annotated, Literal
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

class AgentState(TypedDict):
    # O reducer add_messages anexa mensagens preservando o histórico da thread
    messages: Annotated[list[BaseMessage], add_messages]

    # Roteamento e dados intermediários de execução
    route: Literal["sql", "rag", "hybrid", "direct"] | None
    generated_sql: str | None
    query_result: list[dict] | None
    error_count: int
    title: str | None  # Título conciso gerado no 1º turno da conversa
```

---

## 4. Implementação Canônica da Ferramenta de Análise de Dados (`Safe Data Analysis Tool`)

Como a biblioteca `langchain-experimental` foi colocada em **modo sunset / descontinuada** (disparando alertas de `DeprecationWarning` no Python moderno e dependendo de funções obsoletas do `asyncio`), a abordagem padrão de engenharia é construir a nossa própria ferramenta com `@tool` do `langchain_core`:

```python
# app/agent/tools/data_analysis.py
import math
import statistics
from typing import Any
from langchain_core.tools import tool

# Builtins estritamente seguros (sem eval, open, import, exec malicioso, os, sys)
SAFE_BUILTINS = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "range": range,
    "round": round,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "zip": zip,
}

@tool
def calculate_data_metrics(code: str) -> str:
    """
    Executa cálculos matemáticos e estatísticos avançados sobre números em Python puro.
    Ideal para calcular percentis, desvios padrão, medianas, taxas compostas de crescimento ou proporções.
    Módulos disponíveis no ambiente: 'math', 'statistics'.
    O código DEVE atribuir o resultado final a uma variável chamada 'result' ou utilizar print().
    """
    local_env: dict[str, Any] = {
        "__builtins__": SAFE_BUILTINS,
        "math": math,
        "statistics": statistics,
    }

    try:
        # Execução isolada em namespace fechado
        exec(code, local_env)
        if "result" in local_env:
            return str(local_env["result"])
        return "Cálculo executado com sucesso."
    except Exception as exc:
        return f"Erro no cálculo: {type(exc).__name__} - {str(exc)}"
```

### Vantagens da Ferramenta Nativa:

1. **Zero Deprecations:** Sem dependência de `langchain-experimental`, mantendo a instalação do projeto enxuta e sem warnings.
2. **Segurança por Padrão:** Não permite acesso ao sistema de arquivos (`open()`), módulos de sistema operacional (`os`, `sys`, `subprocess`) ou conexões de rede (`urllib`, `socket`).
3. **Controle Total:** Tratamento de exceções previsível que retorna mensagens de erro amigáveis para o próprio LLM se autocorrigir caso erre a fórmula matemática.

---

## 6. Checklist de Verificação de Código (Code Review Rules)

- [ ] **Zero Imports Legados:** Certificar-se de que não há nenhum import de `langchain.chains`, `langchain.agents.initialize_agent` ou `langchain.schema`.
- [ ] **Versionamento de Stream:** Chamadas para `astream_events` devem sempre incluir explicitamente o parâmetro `version="v2"`.
- [ ] **Checkpointer Persistente:** Usar sempre `AsyncSqliteSaver` com `thread_id` para garantir retenção de memória e arquitetura stateless.
- [ ] **Fail-Fast no Provedor:** Não silenciar erros 429 ou 401; emitir logs e retornar DTOs de erro claros para a camada HTTP.
- [ ] **Controle de Escrita em Banco:** Todas as conexões analíticas abertas com `cinerocket.db` devem obrigatoriamente usar a flag `mode=ro`.
