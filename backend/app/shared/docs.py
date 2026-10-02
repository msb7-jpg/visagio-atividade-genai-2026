from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EndpointDoc:
    """Metadados imutáveis para documentação padronizada do OpenAPI/Swagger."""

    summary: str
    description: str
    response_description: str = "Operação realizada com sucesso"
    responses: dict[int | str, dict[str, Any]] | None = None
