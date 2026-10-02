from typing import Literal

from pydantic import BaseModel, Field

ProviderType = Literal["groq", "local", "openrouter", "google", "openai"]


class ProviderConfigDTO(BaseModel):
    """Configuração persistente ou ativa do provedor de LLM."""

    provider: ProviderType = Field(..., description="Nome do provedor de inteligência artificial")
    model: str = Field(..., description="Identificador do modelo no provedor")
    api_key: str | None = Field(default=None, description="Chave de API (mascarada ao ler)")
    base_url: str | None = Field(
        default=None, description="URL base customizada (essencial para 'local')"
    )
    timeout_seconds: int = Field(
        default=30, ge=1, le=120, description="Tempo limite em segundos para requisições"
    )
    saved_providers: list[str] = Field(
        default_factory=list,
        description="Lista de provedores que já possuem configuração salva no banco",
    )


class TestProviderRequestDTO(BaseModel):
    """Requisição efêmera para teste dinâmico de conectividade sem persistência obrigatória."""

    provider: ProviderType = Field(
        ..., description="Nome do provedor de inteligência artificial a testar"
    )
    model: str | None = Field(
        default=None, description="Modelo específico a testar (usa padrão caso omitido)"
    )
    api_key: str | None = Field(
        default=None, description="Chave de API a ser validada durante a probe"
    )
    base_url: str | None = Field(default=None, description="URL base do endpoint a ser testado")
    timeout_seconds: int = Field(
        default=5, ge=1, le=15, description="Timeout estrito para a probe de conectividade"
    )


class TestProviderResponseDTO(BaseModel):
    """Resposta com diagnóstico estruturado da probe de conectividade."""

    success: bool = Field(..., description="Indica se a comunicação com o modelo foi bem-sucedida")
    latency_ms: float = Field(..., description="Latência da requisição em milissegundos")
    model: str = Field(..., description="Nome do modelo testado")
    message: str = Field(
        ..., description="Mensagem descritiva de diagnóstico (sucesso ou causa amigável da falha)"
    )
    error_code: str | None = Field(
        default=None, description="Código padronizado do erro quando aplicável"
    )
