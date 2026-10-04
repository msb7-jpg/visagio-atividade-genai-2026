"""Testes de integração para o endpoint GET /analytics/movies/{movie_id}."""

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_get_movie_details_success():
    """Valida o retorno estruturado de detalhes de um filme existente."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Busca detalhes pelo sk_movie_id de Avatar: The Way of Water
        avatar_sk = "bb227566b3010c6af047a841f656ef46167596e6234afaa7c71e8fd88c5526ee"
        response = await client.get(f"/analytics/movies/{avatar_sk}")
        assert response.status_code == 200
        data = response.json()

        assert data["titulo"] == "Avatar: The Way Of Water"
        assert data["ano_lancamento"] == 2022
        assert data["duracao_minutos"] == 192
        assert data["url_poster"] is not None
        assert "Science Fiction" in data["generos"]
        assert "James Cameron" in data["diretores"]
        assert data["nota_imdb"] is not None
        assert data["nota_tmdb"] is not None
        assert data["receita_brl"] is not None


@pytest.mark.asyncio
async def test_get_movie_details_by_id_filme():
    """Valida que a busca também funciona usando o id_filme."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/analytics/movies/76600")
        assert response.status_code == 200
        data = response.json()
        assert data["titulo"] == "Avatar: The Way Of Water"


@pytest.mark.asyncio
async def test_get_movie_details_by_title_fallback():
    """Valida que a busca também resolve por título exato ou normalizado quando o LLM emite movie:Titulo."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Busca com título direto
        response = await client.get("/analytics/movies/Avatar:%20The%20Way%20Of%20Water")
        assert response.status_code == 200
        data = response.json()
        assert data["titulo"] == "Avatar: The Way Of Water"

        # Busca com título contendo hifen nao-quebravel (\u2011)
        response_spider = await client.get("/analytics/movies/Spider\u2011Man:%20No%20Way%20Home")
        assert response_spider.status_code == 200
        data_spider = response_spider.json()
        assert data_spider["titulo"] == "Spider-man: No Way Home"


@pytest.mark.asyncio
async def test_get_movie_details_not_found():
    """Valida que IDs inexistentes retornam 404."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/analytics/movies/id_que_nao_existe_123456789")
        assert response.status_code == 404
        assert "não encontrado" in response.json()["detail"]

