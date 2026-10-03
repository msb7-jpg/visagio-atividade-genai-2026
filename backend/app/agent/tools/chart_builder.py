from typing import Any, Literal

from langchain_core.tools import tool

from app.agent.schemas.chart_schema import ChartDataset, ChartJsConfigDTO


@tool
def generate_chartjs_spec(
    chart_type: Literal["bar", "line", "pie", "doughnut"],
    title: str,
    labels: list[str],
    datasets: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Gera e valida a especificação declarativa de gráfico (ChartJsConfigDTO)
    para consumo no frontend. O retorno é estritamente estruturado e sem cores ou estilos.
    """
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
        type=chart_type,
        title=title,
        labels=[str(lbl) for lbl in labels],
        datasets=validated_datasets,
    )
    return dto.model_dump()
