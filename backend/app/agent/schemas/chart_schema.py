from typing import Literal

from pydantic import BaseModel, Field


class ChartDataset(BaseModel):
    """Série de dados puramente numérica e semântica. Zero estilos ou cores."""

    label: str = Field(
        ...,
        description="Nome da série de dados (ex: 'Receita em R$', 'Quantidade de Filmes')",
    )
    data: list[float | int] = Field(
        ..., description="Lista ordenada de valores numéricos"
    )


class ChartJsConfigDTO(BaseModel):
    """
    Payload semântico e declarativo gerado pelo Agente para renderização no frontend
    via react-chartjs-2. Zero estilização ou regras visuais no backend.
    """

    type: Literal["bar", "line", "pie", "doughnut"] = Field(
        ..., description="Tipo de visualização recomendado para os dados"
    )
    title: str = Field(..., description="Título semântico claro do gráfico")
    labels: list[str] = Field(
        ...,
        description="Rótulos das categorias ou eixo horizontal (ex: nomes de filmes, anos)",
    )
    datasets: list[ChartDataset] = Field(
        ..., description="Conjunto de métricas numéricas a serem plotadas"
    )
