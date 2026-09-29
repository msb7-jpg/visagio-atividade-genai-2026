from dataclasses import dataclass


@dataclass(frozen=True)
class Configuration:
    """Configuration class for the RAG agent graph."""

    # LLM Settings
    model_name: str = "local/Qwen3.5"
    model_base_url: str = "http://localhost:1234"
    model_api_key: str = "i_dont_know"

    # Embedding and Document Settings
    embedding_model_name: str = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    doc_splits_path: str = "models/doc_splits.pkl"
