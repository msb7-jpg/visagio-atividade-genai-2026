from app.agent.tools.query_runner import execute_sql_query


def test_canonical_q1_top_10_receitas():
    """Q1: Quais são os 10 filmes com maior faturamento de bilheteria?"""
    query = """
    SELECT m.titulo, m.ano_lancamento, f.receita_brl
    FROM dim_movies m
    JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
    WHERE f.receita_brl IS NOT NULL AND f.receita_brl > 0
    ORDER BY f.receita_brl DESC
    LIMIT 10;
    """
    rows = execute_sql_query.invoke({"query": query})
    assert len(rows) == 10
    assert rows[0]["receita_brl"] >= rows[1]["receita_brl"]


def test_canonical_q2_lucro_medio_por_genero():
    """Q2: Qual o lucro médio por gênero de filme?"""
    query = """
    SELECT g.nome_genero, AVG(f.lucro_brl) AS lucro_medio_brl, COUNT(m.sk_movie_id) AS total_filmes
    FROM dim_genres g
    JOIN bridge_movie_genre b ON g.sk_genre_id = b.sk_genre_id
    JOIN dim_movies m ON b.sk_movie_id = m.sk_movie_id
    JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
    WHERE f.receita_brl > 0 AND f.orcamento_brl > 0
    GROUP BY g.nome_genero
    ORDER BY lucro_medio_brl DESC;
    """
    rows = execute_sql_query.invoke({"query": query})
    assert len(rows) > 0
    assert "nome_genero" in rows[0]
    assert "lucro_medio_brl" in rows[0]


def test_canonical_q3_diretores_melhor_media():
    """Q3: Quais são os 5 diretores com melhor média de notas no IMDb?"""
    query = """
    SELECT p.nome_pessoa AS diretor,
           AVG(f.nota_imdb) AS media_imdb,
           COUNT(m.sk_movie_id) AS qtd_filmes
    FROM dim_people p
    JOIN bridge_movie_person bp ON p.sk_person_id = bp.sk_person_id
    JOIN dim_movies m ON bp.sk_movie_id = m.sk_movie_id
    JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
    WHERE p.tipo_pessoa = 'Diretor'
      AND f.nota_imdb IS NOT NULL
      AND f.qtd_imdb >= 1000
    GROUP BY p.sk_person_id, p.nome_pessoa
    HAVING qtd_filmes >= 3
    ORDER BY media_imdb DESC
    LIMIT 5;
    """
    rows = execute_sql_query.invoke({"query": query})
    assert len(rows) == 5
    assert rows[0]["media_imdb"] >= rows[1]["media_imdb"]


def test_canonical_q4_ator_mais_filmes():
    """Q4: Qual ator participou do maior número de filmes?"""
    query = """
    SELECT p.nome_pessoa AS ator, COUNT(bp.sk_movie_id) AS total_filmes
    FROM dim_people p
    JOIN bridge_movie_person bp ON p.sk_person_id = bp.sk_person_id
    WHERE p.tipo_pessoa = 'Ator'
    GROUP BY p.sk_person_id, p.nome_pessoa
    ORDER BY total_filmes DESC
    LIMIT 1;
    """
    rows = execute_sql_query.invoke({"query": query})
    assert len(rows) == 1
    assert rows[0]["total_filmes"] > 0


def test_canonical_q5_filmes_maior_margem_lucro():
    """Q5: Filmes com maior margem de lucro (receita e orçamento informados) com projeção mandatória de título."""
    query = """
    SELECT 
        m.titulo,
        m.ano_lancamento,
        m.sk_movie_id,
        f.orcamento_brl,
        f.receita_brl,
        ROUND(((CAST(f.receita_brl AS FLOAT) - f.orcamento_brl) / f.receita_brl) * 100, 2) AS margem_lucro_pct
    FROM fact_movies_performance f
    JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
    WHERE f.receita_brl > 0 AND f.orcamento_brl > 0
    ORDER BY margem_lucro_pct DESC
    LIMIT 10;
    """
    rows = execute_sql_query.invoke({"query": query})
    assert len(rows) == 10
    assert "titulo" in rows[0]
    assert "sk_movie_id" in rows[0]
    assert "margem_lucro_pct" in rows[0]
    assert len(rows[0]["titulo"]) > 0
    assert rows[0]["margem_lucro_pct"] >= rows[1]["margem_lucro_pct"]
