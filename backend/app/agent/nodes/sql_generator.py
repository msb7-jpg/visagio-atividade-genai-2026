import re

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.state import AgentState, AgentStateUpdate
from app.core.constants import SqlErrorCategory
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

INSTRUÇÕES DE RESPOSTA E CONTEXTO TEMPORAL:
0. Pense brevemente sobre a consulta analítica e estruture a query.
1. CONTEXTO TEMPORAL DO DATASET:
   - O catálogo histórico cobre principalmente produções lançadas entre 2016 e 2024 (com dados consolidados até 2024).
   - Filmes com anos posteriores (2025 a 2029) representam projetos futuros em planejamento ou pós-produção
     cadastrados antecipadamente.
2. Formate sua resposta SEMPRE com o bloco de raciocínio delimitado por <thought>...</thought>
   e a query SQL delimitada por ```sql ... ```.
3. Gere apenas consultas SELECT ou CTEs (WITH). O banco é ESTRITAMENTE DE LEITURA (READ-ONLY).
4. Se o usuário solicitar qualquer operação de alteração, deleção, limpeza ou destruição de dados/tabelas
   (ex.: DELETE, DROP, TRUNCATE, UPDATE, ALTER), NUNCA gere o SQL. Em vez disso, explique no bloco <thought>
   e no texto que o CineData opera apenas em modo de consulta e que comandos de escrita/limpeza são expressamente
   proibidos por segurança.
5. Inclua ordenações e LIMIT coerentes (padrão top 10 a 20 quando aplicável).
"""


def extract_thought_and_sql(text: str) -> tuple[str | None, str | None]:
    """
    Extrai blocos <thought> e ```sql do output gerado pelo modelo.

    Args:
        text: Saída textual bruta emitida pelo LLM.

    Returns:
        Tupla (pensamento_extraido, codigo_sql_extraido).
    """
    thought_match = re.search(r"<thought>(.*?)</thought>", text, re.DOTALL | re.IGNORECASE)
    thought = getattr(thought_match, "group", lambda _: "")(1).strip() or None

    sql_match = re.search(r"```(?:sql)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if sql_match:
        return thought, sql_match.group(1).strip() or None

    clean_text = text.strip()
    if clean_text.upper().startswith(("SELECT", "WITH")):
        return thought, clean_text

    return thought, None


async def sql_generator_node(
    state: AgentState, config: RunnableConfig | None = None
) -> AgentStateUpdate:
    """
    Nó gerador de SQL que injeta o catálogo semântico compacto e sintetiza a consulta analítica.

    Args:
        state: Estado do LangGraph contendo o histórico de mensagens.
        config: Configuração do runner com provedor e credenciais ativas.

    Returns:
        Atualização parcial do estado contendo thought, generated_sql e eventuais categorias de erro.
    """
    messages = state["messages"]
    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.0,
    )

    system_msg = SystemMessage(content=CINEDATA_CATALOG_PROMPT)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    raw_content = response.content if isinstance(response.content, str) else str(response.content)

    thought, sql = extract_thought_and_sql(raw_content)

    last_error: str | None = None
    error_category: SqlErrorCategory | None = None

    if not sql:
        last_user_msg = ""
        for m in reversed(messages):
            if getattr(m, "type", "") == "human" or m.__class__.__name__ == "HumanMessage":
                last_user_msg = str(m.content).lower()
                break

        destructive_terms = (
            "limpar", "apagar", "deletar", "drop", "delete", "truncate",
            "remover tabelas", "excluir", "zerar", "destruir", "modificar",
        )
        if any(term in last_user_msg for term in destructive_terms):
            error_category = SqlErrorCategory.SECURITY_VIOLATION
            last_error = (
                "Operação não permitida por política de segurança: O banco CineData opera "
                "estritamente em modo de leitura (Read-Only). Consultas destrutivas, de exclusão "
                "ou de modificação (como DROP, DELETE, TRUNCATE) são bloqueadas."
            )
        else:
            error_category = SqlErrorCategory.UNSUPPORTED_REQUEST
            clean_raw = raw_content.strip()
            if thought and len(clean_raw) > len(thought):
                explanation = re.sub(r"<thought>.*?</thought>", "", clean_raw, flags=re.DOTALL | re.IGNORECASE).strip()
            else:
                explanation = clean_raw

            if explanation and len(explanation) > 10:
                last_error = f"Não foi possível gerar consulta SQL para este pedido: {explanation}"
            else:
                last_error = "Nenhum código SQL foi gerado para atender à solicitação."

    return {
        "thought": thought,
        "generated_sql": sql,
        "error_count": 0,
        "last_error": last_error,
        "error_category": error_category,
    }
