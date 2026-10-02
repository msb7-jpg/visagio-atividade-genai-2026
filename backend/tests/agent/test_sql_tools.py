import pytest

from app.agent.tools.query_runner import execute_sql_query
from app.shared.exceptions import DatabaseReadError


def test_execute_sql_query_success():
    """Valida que uma query SELECT válida retorna registros do cinerocket.db."""
    query = "SELECT titulo, ano_lancamento FROM dim_movies LIMIT 5"
    results = execute_sql_query.invoke({"query": query})

    assert isinstance(results, list)
    assert len(results) > 0
    assert "titulo" in results[0]
    assert "ano_lancamento" in results[0]


def test_execute_sql_query_blocks_forbidden_dml():
    """Valida que comandos de mutação (DROP, DELETE, INSERT, UPDATE) são rejeitados."""
    with pytest.raises(ValueError, match="Operação proibida"):
        execute_sql_query.invoke({"query": "DROP TABLE dim_movies"})

    with pytest.raises(ValueError, match="Operação proibida"):
        execute_sql_query.invoke({"query": "DELETE FROM dim_movies WHERE ano_lancamento = 2020"})

    with pytest.raises(ValueError, match="Operação proibida"):
        execute_sql_query.invoke({"query": "INSERT INTO dim_genres (nome_genero) VALUES ('Teste')"})


def test_execute_sql_query_blocks_non_select():
    """Valida que queries que não começam com SELECT ou WITH são rejeitadas."""
    with pytest.raises(ValueError, match="Apenas consultas que iniciem com SELECT ou WITH"):
        execute_sql_query.invoke({"query": "EXPLAIN QUERY PLAN SELECT 1"})


def test_execute_sql_query_readonly_enforcement():
    """Valida que mesmo se passar pelo filtro regex, o driver SQLite mode=ro bloqueia escrita."""
    # Criação de tabela temporária
    with pytest.raises((ValueError, DatabaseReadError)):
        execute_sql_query.invoke({"query": "CREATE TEMP TABLE t(x);"})
