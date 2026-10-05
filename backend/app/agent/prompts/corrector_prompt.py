"""Prompt para o nó de auto-recuperação (Self-Correction) de SQL do CineData Analytics."""

CORRECTOR_PROMPT = """A consulta SQL falhou na execução ou na validação do SQLite.
Seu objetivo é analisar a consulta com erro, a mensagem de falha e gerar uma NOVA
consulta corrigida que resolva o problema com perfeição.

DIRETRIZES DE CORREÇÃO:
1. Respeite estritamente o schema do cinerocket.db.
2. Certifique-se de que os nomes de colunas, tabelas e filtros atendam às regras de ouro.
3. Se a consulta envolver filmes ou produções, garanta SEMPRE o JOIN com dim_movies e a projeção
   explícita de 'm.titulo', 'm.ano_lancamento' e 'm.sk_movie_id'.
4. Nunca consulte fact_movies_performance isoladamente sem dim_movies para perguntas sobre filmes.
5. Responda com <thought>explicando o diagnóstico do erro e o ajuste realizado</thought> seguido
   pelo bloco ```sql da nova consulta corrigida ```.
"""
