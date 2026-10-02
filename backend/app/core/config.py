from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações globais da aplicação CineData Analytics."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Aplicação
    app_name: str = "CineData Analytics API"
    environment: str = "development"
    debug: bool = True
    port: int = 8000
    host: str = "0.0.0.0"

    # Bancos de Dados
    # O cinerocket.db reside na raiz do repositório
    sqlite_db_path: str = str(
        (Path(__file__).resolve().parent.parent.parent.parent / "cinerocket.db").resolve()
    )
    # Persistência de checkpoints do LangGraph
    checkpointer_db_path: str = str(
        (Path(__file__).resolve().parent.parent.parent / "conversations.db").resolve()
    )

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
    return Settings()
