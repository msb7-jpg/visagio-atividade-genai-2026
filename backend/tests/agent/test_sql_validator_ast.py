from app.agent.nodes.sql_validator import validate_sql_query


def test_validate_sql_valid_queries():
    """Queries analíticas válidas devem passar na validação."""
    q1 = "SELECT titulo, receita_brl FROM dim_movies LIMIT 10"
    is_valid, err = validate_sql_query(q1)
    assert is_valid is True
    assert err is None

    q2 = """
    WITH ranked_movies AS (
        SELECT titulo, f.receita_brl
        FROM dim_movies m
        JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
        WHERE f.receita_brl > 0
    )
    SELECT * FROM ranked_movies LIMIT 5
    """
    is_valid, err = validate_sql_query(q2)
    assert is_valid is True
    assert err is None


def test_validate_sql_blocks_mutations():
    """Queries com DDL/DML devem ser bloqueadas."""
    bad_queries = [
        "DROP TABLE dim_movies",
        "DELETE FROM dim_movies",
        "UPDATE fact_movies_performance SET receita_brl = 0",
        "INSERT INTO dim_movies (titulo) VALUES ('Hacked')",
        "ALTER TABLE dim_movies ADD COLUMN test INT",
        "CREATE TABLE test (id INT)",
    ]

    for q in bad_queries:
        is_valid, err = validate_sql_query(q)
        assert is_valid is False
        assert err is not None


def test_validate_sql_blocks_multiple_statements():
    """Injeção com múltiplos statements deve ser rejeitada."""
    multi = "SELECT * FROM dim_movies; DROP TABLE dim_movies;"
    is_valid, err = validate_sql_query(multi)
    assert is_valid is False
    assert "Múltiplas instruções" in err


def test_validate_sql_blocks_system_tables():
    """Acesso a tabelas internas do SQLite deve ser bloqueado."""
    sys_q = "SELECT name FROM sqlite_master WHERE type='table'"
    is_valid, err = validate_sql_query(sys_q)
    assert is_valid is False
    assert "tabela de sistema" in err
