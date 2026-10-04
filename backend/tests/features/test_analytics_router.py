"""Testes de integração para os endpoints HTTP do router de analytics."""

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_get_suggestions_catalog():
    """Valida o endpoint GET /analytics/suggestions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/analytics/suggestions")
        assert response.status_code == 200
        data = response.json()

        assert "categories" in data
        assert "total_prompts" in data
        assert data["total_prompts"] > 0

        categories = data["categories"]
        cat_ids = [cat["id"] for cat in categories]
        assert "text-to-sql" in cat_ids
        assert "charts" in cat_ids
        assert "hybrid-rag" in cat_ids


@pytest.mark.asyncio
async def test_get_database_schema_summary():
    """Valida o endpoint GET /analytics/schema."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/analytics/schema")
        assert response.status_code == 200
        data = response.json()

        assert data["database_name"] == "cinerocket.db"
        assert data["mode"] == "READ_ONLY"
        assert len(data["tables"]) > 0

        table_names = [t["table_name"] for t in data["tables"]]
        assert "dim_movies" in table_names
        assert "fact_movies_performance" in table_names
        assert "dim_people" in table_names
        assert "dim_genres" in table_names
