

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    """Configuration class for the RAG agent graph."""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM Settings
    model_name: str = "local/Qwen3.5"
    model_base_url: str = "http://localhost:1234"
    model_health_url: str = "http://localhost:1234/v1/health"
    model_api_key: str = "i_dont_know"

    # Embedding and Document Settings
    embedding_model_name: str = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    doc_splits_path: str = "models/doc_splits.pkl"

    log_level: str = "INFO"

@lru_cache
def get_settings() -> Configuration:
    return Configuration()

