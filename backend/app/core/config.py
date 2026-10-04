from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Garante que variáveis do .env sejam populadas em os.environ em qualquer ponto de entrada
_backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"
if _backend_env.exists():
    load_dotenv(dotenv_path=_backend_env)
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env)


class Settings(BaseSettings):
    """Configurações globais da aplicação CineData Analytics."""

    model_config = SettingsConfigDict(
        env_file=str(_backend_env) if _backend_env.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Segredos e Criptografia
    secret_key: str = "cinedata-analytics-default-secret-key-change-me"  # ruff: ignore[hardcoded-password-string]

    # Aplicação
    app_name: str = "CineData Analytics API"
    environment: str = "development"
    debug: bool = True
    port: int = 8000
    host: str = "0.0.0.0"  # ruff: ignore[hardcoded-bind-all-interfaces] - servidor FastAPI escuta em todas as interfaces locais/containers

    # Bancos de Dados
    # O cinerocket.db reside na raiz do repositório
    sqlite_db_path: str = str((Path(__file__).resolve().parent.parent.parent.parent / "cinerocket.db").resolve())
    # Persistência de checkpoints do LangGraph
    checkpointer_db_path: str = str((Path(__file__).resolve().parent.parent.parent / "conversations.db").resolve())

    # Configuração Padrão do Provedor de LLM
    llm_provider: str = "local"  # "groq" | "local" | "openrouter" | "google" | "openai"
    llm_model: str = "Qwen3.5-4B-Q4_K_M"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_timeout_seconds: int = 30

    # Embeddings locais (RAG)
    embedding_model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    # Logging
    log_level: str = "INFO"


# Alias para compatibilidade anterior se necessário
Configuration = Settings


@lru_cache
def get_settings() -> Settings:
    """
    Retorna a instância singleton de configurações da aplicação com cache em memória.

    Returns:
        Objeto Settings populado com variáveis de ambiente ou valores padrão.
    """
    return Settings()
