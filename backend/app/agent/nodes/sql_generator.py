import re
from typing import Any

from langchain_core.messages import SystemMessage

from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model

CINEDATA_CATALOG_PROMPT = """Você é o Agente Analítico Especialista em SQL do CineData Analytics.
Sua missão é responder perguntas com consultas SQL precisas, otimizadas e compatíveis com SQLite.

SCHEMA DO BANCO CINEDATA (cinerocket.db):
1. dim_movies:
   - sk_movie_id (VARCHAR PK), id_filme (VARCHAR), titulo (VARCHAR)
   - data_lancamento (DATE), ano_lancamento (INTEGER, 2016-2029), duracao_minutos (INTEGER)
   - status_filme ('Lançado', 'Pós-Produção', 'Em Produção'), sinopse (VARCHAR)

2. fact_movies_performance (1:1 com dim_movies):
   - sk_movie_id (VARCHAR PK / FK), orcamento_usd, receita_usd, lucro_usd (NUMERIC)
   - orcamento_brl, receita_brl, lucro_brl (NUMERIC)
   - popularidade (DOUBLE), nota_tmdb (DOUBLE), nota_imdb (DOUBLE), qtd_imdb (INTEGER)
   * REGRA DE OURO FINANÇAS: Para cálculos monetários, bilheteria, orçamentos e lucros médios:
     SEMPRE filtre WHERE receita_brl > 0 AND orcamento_brl > 0.

3. dim_people & bridge_movie_person:
   - dim_people: sk_person_id (PK), nome_pessoa (VARCHAR)
   - dim_people.tipo_pessoa ('Ator', 'Diretor', 'Roteirista')
   - bridge_movie_person: sk_movie_id, sk_person_id
   * REGRA DE OURO PESSOAS: Sempre filtre dim_people.tipo_pessoa ('Ator', 'Diretor', 'Roteirista').

4. dim_genres & bridge_movie_genre:
   - dim_genres: sk_genre_id (PK), nome_genero (VARCHAR)
   - bridge_movie_genre: sk_movie_id, sk_genre_id
   * REGRA DE OURO GÊNEROS: Nomes em INGLÊS ('Action', 'Adventure', 'Animation', 'Comedy',
     'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
     'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'Tv Movie', 'War', 'Western').
     Traduza termos do usuário (ex: 'Comédia' -> 'Comedy', 'Terror' -> 'Horror').

5. dim_companies & bridge_movie_company:
   - dim_companies: sk_company_id (PK), nome_produtora (VARCHAR)
   - bridge_movie_company: sk_movie_id, sk_company_id

6. dim_reviews & movie_reviews:
   - dim_reviews: sk_movie_id (PK), qtd_avaliacoes_usuarios (INTEGER), nota_media_usuarios (DOUBLE)
   - movie_reviews: sk_movie_id, name, rating (0-10), text (VARCHAR), created_at (DATETIME)

INSTRUÇÕES DE RESPOSTA:
1. Pense brevemente sobre a consulta analítica e estruture a query.
2. Formate sua resposta SEMPRE com o bloco de raciocínio delimitado por <thought>...</thought>
   e a query SQL delimitada por ```sql ... ```.
3. Gere apenas consultas SELECT ou CTEs (WITH). Não use comandos destrutivos.
4. Inclua ordenações e LIMIT coerentes (padrão top 10 a 20 quando aplicável).
"""



def extract_thought_and_sql(text: str) -> tuple[str | None, str | None]:
    """Extrai blocos <thought> e ```sql do output do modelo."""
    # Extrai o pensamento entre as tags <thought>
    thought_match = re.search(r"<thought>(.*?)</thought>", text, re.DOTALL | re.IGNORECASE)
    thought = getattr(thought_match, "group", lambda _: "")(1).strip() or None

    # Extrai o bloco de código Markdown ```sql ou genérico
    sql_match = re.search(r"```(?:sql)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    
    if sql_match:
        return thought, sql_match.group(1).strip() or None

    # Fallback: Se não houver markdown, limpa o texto e valida se inicia com SELECT/WITH
    clean_text = text.strip()
    if clean_text.upper().startswith(("SELECT", "WITH")):
        return thought, clean_text

    return thought, None

async def sql_generator_node(state: AgentState) -> dict[str, Any]:
    """
    Nó gerador de SQL que injeta o catálogo semântico compacto e gera o SQL.
    """
    messages = state["messages"]
    llm = get_chat_model(temperature=0.0)

    system_msg = SystemMessage(content=CINEDATA_CATALOG_PROMPT)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    raw_content = response.content if isinstance(response.content, str) else str(response.content)

    thought, sql = extract_thought_and_sql(raw_content)

    return {
        "thought": thought,
        "generated_sql": sql,
        "error_count": 0,
        "last_error": None,
    }
