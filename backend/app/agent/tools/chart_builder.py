from typing import Any, Literal

from langchain_core.tools import tool

from app.agent.schemas.chart_schema import ChartDataset, ChartJsConfigDTO
from app.core.constants import ChartType


@tool
def generate_chartjs_spec(
    chart_type: ChartType | Literal["bar", "line", "pie", "doughnut"],
    title: str,
    labels: list[str],
    datasets: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Gera e valida a especificação declarativa de gráfico (ChartJsConfigDTO) para consumo no frontend.

    O retorno é estritamente estruturado e sem cores ou estilos injetados no backend.

    Args:
        chart_type: Tipo visual do gráfico ('bar', 'line', 'pie' ou 'doughnut').
        title: Título semântico do gráfico.
        labels: Rótulos das categorias ou eixo horizontal.
        datasets: Conjunto de séries numéricas com 'label' e 'data'.

    Returns:
        Dicionário serializado em conformidade com o schema ChartJsConfigDTO.
    """
    type_val = chart_type.value if isinstance(chart_type, ChartType) else chart_type

    validated_datasets = [
        ChartDataset(
            label=str(ds.get("label", "Valor")),
            data=[
                float(val) if isinstance(val, (int, float)) else 0.0
                for val in ds.get("data", [])
            ],
        )
        for ds in datasets
    ]

    dto = ChartJsConfigDTO(
        type=type_val,
        title=title,
        labels=[str(lbl) for lbl in labels],
        datasets=validated_datasets,
    )
    return dto.model_dump()
