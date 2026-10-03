import pytest
from pydantic import ValidationError

from app.agent.schemas.chart_schema import ChartDataset, ChartJsConfigDTO
from app.agent.tools.chart_builder import generate_chartjs_spec


def test_chart_schema_validation_success():
    dataset = ChartDataset(label="Receita (R$)", data=[1000.0, 2500.5, 3000.0])
    dto = ChartJsConfigDTO(
        type="bar",
        title="Top 3 Produtoras",
        labels=["Warner", "Universal", "Disney"],
        datasets=[dataset],
    )
    assert dto.type == "bar"
    assert len(dto.labels) == 3
    assert len(dto.datasets) == 1
    assert dto.datasets[0].data == [1000.0, 2500.5, 3000.0]


def test_chart_schema_invalid_type():
    with pytest.raises(ValidationError):
        ChartJsConfigDTO(
            type="scatter",  # Inválido (apenas bar, line, pie, doughnut)
            title="Inválido",
            labels=["A", "B"],
            datasets=[ChartDataset(label="X", data=[1, 2])],
        )


def test_generate_chartjs_spec_tool():
    result = generate_chartjs_spec.invoke({
        "chart_type": "pie",
        "title": "Distribuição de Gêneros",
        "labels": ["Action", "Comedy", "Drama"],
        "datasets": [
            {"label": "Filmes", "data": [45, 30, 25]},
        ],
    })

    assert isinstance(result, dict)
    assert result["type"] == "pie"
    assert result["title"] == "Distribuição de Gêneros"
    assert result["labels"] == ["Action", "Comedy", "Drama"]
    assert len(result["datasets"]) == 1
    assert result["datasets"][0]["data"] == [45.0, 30.0, 25.0]
