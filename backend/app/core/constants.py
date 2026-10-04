from enum import StrEnum

# Scalar value types returned by analytical SQLite queries (PEP 695 type syntax)
type SqlScalar = str | int | float | bool | None
type QueryResultRow = dict[str, SqlScalar]


class LLMProvider(StrEnum):
    """Provedores de Large Language Models suportados pelo sistema."""

    GROQ = "groq"
    LOCAL = "local"
    OPENROUTER = "openrouter"
    GOOGLE = "google"


SUPPORTED_PROVIDERS: tuple[str, ...] = tuple(p.value for p in LLMProvider)


class AgentNode(StrEnum):
    """Nós do grafo de execução orquestrado via LangGraph."""

    ROUTER = "router"
    SEMANTIC_SEARCH = "semantic_search"
    SQL_GENERATOR = "sql_generator"
    SQL_VALIDATOR = "sql_validator"
    SQL_EXECUTOR = "sql_executor"
    SQL_CORRECTOR = "sql_corrector"
    DATA_ANALYSIS = "data_analysis"
    CHART_GENERATOR = "chart_generator"
    SYNTHESIZER = "synthesizer"


NODE_LABELS: dict[str, str] = {
    AgentNode.ROUTER.value: "Classificando intenção",
    AgentNode.SEMANTIC_SEARCH.value: "Buscando contexto semântico (RAG)",
    AgentNode.SQL_GENERATOR.value: "Escrevendo consulta SQL",
    AgentNode.SQL_EXECUTOR.value: "Executando no cinerocket.db",
    AgentNode.SQL_CORRECTOR.value: "Auto-corrigindo consulta SQL",
    AgentNode.DATA_ANALYSIS.value: "Executando sandbox estatística",
    AgentNode.CHART_GENERATOR.value: "Avaliando visualização gráfica",
    AgentNode.SYNTHESIZER.value: "Formatando análise executiva",
}


class SSEEventType(StrEnum):
    """Tipos de eventos Server-Sent Events (SSE) despachados ao cliente."""

    SESSION = "session"
    DONE = "done"
    TITLE = "title"
    ERROR = "error"
    STEP_END = "step_end"
    THOUGHT = "thought"
    SQL = "sql"
    SEMANTIC = "semantic"
    CHART = "chart"
    DATA = "data"
    TOKEN = "token"  # ruff: ignore[hardcoded-password-string]


class ChartType(StrEnum):
    """Tipos de visualização gráfica suportados pelo renderer do frontend."""

    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    DOUGHNUT = "doughnut"


class StepStatus(StrEnum):
    """Status de execução de uma etapa do agente."""

    PENDING = "pending"
    ACTIVE = "active"
    DONE = "done"
    ERROR = "error"


class SqlErrorCategory(StrEnum):
    """Categorização de erros sintáticos ou de segurança em consultas SQL."""

    SECURITY_VIOLATION = "SECURITY_VIOLATION"
    RECOVERABLE_SYNTAX = "RECOVERABLE_SYNTAX"
    UNSUPPORTED_REQUEST = "UNSUPPORTED_REQUEST"


class StreamErrorCode(StrEnum):
    """Códigos padronizados de erro emitidos no stream SSE."""

    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"
    UNAUTHORIZED = "UNAUTHORIZED"
    CONNECTION_REFUSED = "CONNECTION_REFUSED"
    DATABASE_ERROR = "DATABASE_ERROR"
    SQL_SYNTAX_ERROR = "SQL_SYNTAX_ERROR"
    AGENT_ERROR = "AGENT_ERROR"
