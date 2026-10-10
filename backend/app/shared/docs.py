from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class EndpointDoc:
    """Metadados imutáveis para documentação padronizada do OpenAPI/Swagger."""

    summary: str
    description: str
    response_description: str = "Operação realizada com sucesso"
    responses: dict[int | str, dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Converte metadados em dicionário para kwargs de decorador FastAPI."""
        from dataclasses import asdict

        raw = asdict(self)
        return {key: value for key, value in raw.items() if value is not None}
