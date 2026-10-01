# Dicionário Semântico e Mapeamento de Domínio: `cinerocket.db`

Este documento serve como a **base de conhecimento canônica (Ground Truth Semântico)** para os prompts do Agente Text-to-SQL e do Agente Híbrido RAG. Ele detalha todas as tabelas, relacionamentos, pegadinhas de dados (gotchas), sinônimos comuns do usuário e padrões de queries otimizadas.

---

## 1. Visão Geral do Modelo Dimensional

O banco `cinerocket.db` segue a modelagem dimensional estrela/floco de neve (**Kimball**) para a camada **Gold** da CineData Analytics:

```
                              ┌──────────────────────┐
                              │     dim_genres       │
                              │  (sk_genre_id, nome) │
                              └──────────▲───────────┘
                                         │
                              ┌──────────┴───────────┐
                              │  bridge_movie_genre  │
                              └──────────▲───────────┘
                                         │
┌──────────────────────┐      ┌──────────┴───────────┐      ┌─────────────────────────┐
│    dim_companies     │◄─────┤      dim_movies      ├─────►│ fact_movies_performance │
│ (sk_company_id, nome)│      │  (Catálogo Central)  │      │(Receita, Orçamento, Lucro│
└──────────────────────┘      └──────────┬───────────┘      │ Popularidade, TMDB/IMDb)│
                                         │                  └─────────────────────────┘
                              ┌──────────┼───────────┐
                              │          │           │
                              ▼          ▼           ▼
                      ┌───────────────┐ ┌──────────┐ ┌────────────────┐
                      │bridge_movie_  │ │dim_      │ │ movie_reviews  │
                      │person         │ │reviews   │ │ (Comentários e │
                      │       ▲       │ │(Médias)  │ │ Textos Longos) │
                      └───────┼───────┘ └──────────┘ └────────────────┘
                              ▼
                      ┌───────────────┐
                      │  dim_people   │
                      │(Atores, Dire- │
                      │tores, Writers)│
                      └───────────────┘
```

---

## 2. Inventário de Tabelas e Colunas

### 2.1 `dim_movies` (95.645 registros)
Tabela dimensional central de filmes.
* **`sk_movie_id`** (`VARCHAR(64)`): Chave primária substituta (hash hex SHA-256). É a chave usada em todas as bridges e fatos.
* **`id_filme`** (`VARCHAR(50)`): Identificador de negócio original (ex: ID TMDB/IMDb numérico como texto).
* **`titulo`** (`VARCHAR(500)`): Título original/comercial do filme (em inglês na maioria dos casos).
* **`data_lancamento`** (`DATE`): Data em formato `YYYY-MM-DD`.
* **`ano_lancamento`** (`INTEGER`): Ano do filme (range: `2016` até `2029`). Indexado via `ix_dim_movies_ano_lancamento`.
* **`duracao_minutos`** (`INTEGER`): Duração do filme em minutos.
* **`idioma_original`** (`VARCHAR(10)`): Sigla do idioma (ex: `en`, `pt`, `es`, `fr`). *Atenção: muitos registros são NULL*.
* **`status_filme`** (`VARCHAR(50)`): Valores: `'Lançado'` (94.304), `'Pós-Produção'` (693), `'Em Produção'` (598), `'Planejado'` (50).
* **`sinopse`** (`VARCHAR(4000)`): Resumo textual da trama em inglês. **Coluna prioritária para busca semântica/vetorial (RAG)**.
* **`url_poster`** (`VARCHAR(2048)`): URL da imagem do poster (TMDB). Útil para o frontend renderizar cards.
* **`url_backdrop`** (`VARCHAR(2048)`): URL da imagem de fundo em alta resolução.

---

### 2.2 `fact_movies_performance` (95.645 registros)
Fato de métricas financeiras e notas públicas. Relação 1:1 com `dim_movies`.
* **`sk_movie_id`** (`VARCHAR(64)`): Chave primária e FK para `dim_movies.sk_movie_id`.
* **`orcamento_usd`** (`NUMERIC(18, 2)`): Orçamento declarado em Dólares. *Pode ser NULL ou 0*.
* **`receita_usd`** (`NUMERIC(18, 2)`): Faturamento de bilheteria em Dólares. *Pode ser NULL ou 0*.
* **`lucro_usd`** (`NUMERIC(18, 2)`): `receita_usd - orcamento_usd`.
* **`orcamento_brl`** (`NUMERIC(18, 2)`): Orçamento convertido para Reais.
* **`receita_brl`** (`NUMERIC(18, 2)`): Faturamento de bilheteria convertido para Reais.
* **`lucro_brl`** (`NUMERIC(18, 2)`): `receita_brl - orcamento_brl`.
* **`popularidade`** (`DOUBLE`): Índice de popularidade calculado pelo TMDB.
* **`nota_tmdb`** (`DOUBLE`): Nota média TMDB (0 a 10).
* **`qtd_tmdb`** (`INTEGER`): Quantidade de votos apurados no TMDB.
* **`nota_imdb`** (`DOUBLE`): Nota média IMDb (0 a 10).
* **`qtd_imdb`** (`INTEGER`): Quantidade de votos apurados no IMDb.

---

### 2.3 `dim_people` (424.656 registros) & `bridge_movie_person` (745.450 registros)
Elenco, diretores e roteiristas envolvidos nos filmes.
* **`dim_people`**:
  * **`sk_person_id`** (`VARCHAR(64)`): PK.
  * **`nome_pessoa`** (`VARCHAR(255)`): Nome completo (ex: `'Christopher Nolan'`, `'Tom Hanks'`). Indexado via `ix_dim_people_nome_pessoa`.
  * **`tipo_pessoa`** (`VARCHAR(20)`): Estritamente 3 categorias:
    1. `'Ator'`
    2. `'Diretor'`
    3. `'Roteirista'`
* **`bridge_movie_person`**:
  * Relação N:N entre `dim_movies` e `dim_people`.
  * PK composta `(sk_movie_id, sk_person_id)`.
  * Possui índice secundário em `sk_person_id`.

---

### 2.4 `dim_genres` (19 registros) & `bridge_movie_genre` (121.521 registros)
Gêneros cinematográficos catalogados.
* **19 Gêneros Disponíveis**: `'Action'`, `'Adventure'`, `'Animation'`, `'Comedy'`, `'Crime'`, `'Documentary'`, `'Drama'`, `'Family'`, `'Fantasy'`, `'History'`, `'Horror'`, `'Music'`, `'Mystery'`, `'Romance'`, `'Science Fiction'`, `'Thriller'`, `'Tv Movie'`, `'War'`, `'Western'`.
* **`bridge_movie_genre`**:
  * Relação N:N entre filmes e gêneros.

---

### 2.5 `dim_companies` (45.941 registros) & `bridge_movie_company` (116.326 registros)
Estúdios e empresas produtoras.
* **`dim_companies`**:
  * **`sk_company_id`** (`VARCHAR(64)`): PK.
  * **`nome_produtora`** (`VARCHAR(255)`): Ex: `'Universal Pictures'`, `'Warner Bros. Pictures'`, `'Marvel Studios'`.
* **`bridge_movie_company`**:
  * Relação N:N entre filmes e produtoras.

---

### 2.6 `dim_reviews` (40.267 registros) & `movie_reviews` (43.666 registros)
Avaliações qualitativas e agregadas de usuários internos do portal.
* **`dim_reviews`**:
  * Tabela agregada por filme (1:1 com `dim_movies` para os filmes avaliados).
  * **`qtd_avaliacoes_usuarios`** (`INTEGER`): Número de avaliações recebidas na plataforma.
  * **`nota_media_usuarios`** (`DOUBLE`): Nota média agregada atribuída pelos usuários da plataforma (0 a 10).
* **`movie_reviews`**:
  * Tabela granular com as resenhas textuais individuais.
  * **`name`** (`VARCHAR(120)`): Nome do usuário avaliador.
  * **`rating`** (`DOUBLE`): Nota atribuída de 0 a 10 (`CHECK rating >= 0 AND rating <= 10`).
  * **`text`** (`VARCHAR(4000)`): Resenha textual escrita em português (ex: *"Adorei cada minuto..."*, *"Horrível! Perda de tempo."*). Coluna candidata para análise de sentimento e busca semântica em opiniões do público.
  * **`created_at`** (`DATETIME`): Data da avaliação.

---

## 3. Mapeamento Semântico e Sinônimos para o Agente

O Agente LLM deve ser instruído com estas regras de equivalência de termos em linguagem natural:

| Termo do Usuário | Mapeamento no Banco de Dados | Regra / Observação |
| :--- | :--- | :--- |
| **"Receita"**, **"Faturamento"**, **"Bilheteria"** | `f.receita_brl` ou `f.receita_usd` | Se o usuário pedir explicitamente em Reais (R$), usar `receita_brl`. Caso contrário, indicar ambas ou a moeda solicitada. Sempre filtrar `WHERE receita_brl IS NOT NULL AND receita_brl > 0`. |
| **"Orçamento"**, **"Custo"**, **"Investimento"** | `f.orcamento_brl` ou `f.orcamento_usd` | Filtrar `WHERE orcamento_brl IS NOT NULL AND orcamento_brl > 0`. |
| **"Lucro"** | `f.lucro_brl` ou `f.lucro_usd` | Lucro absoluto já pré-calculado na tabela fato (`receita - orcamento`). |
| **"Margem de Lucro"** | `(CAST(f.lucro_brl AS FLOAT) / f.receita_brl)` | Apenas para filmes com `receita_brl > 0` e `orcamento_brl > 0` para evitar divisão por zero ou margens distorcidas de 100%. |
| **"Filmes mais populares"** | `f.popularidade DESC` | Utilizar a coluna `f.popularidade` na tabela `fact_movies_performance`. |
| **"Divergência entre TMDB e IMDb"** | `ABS(f.nota_tmdb - f.nota_imdb)` | Ambas as notas estão na escala 0 a 10. Requer `f.nota_tmdb IS NOT NULL AND f.nota_imdb IS NOT NULL`. |
| **"Divergência Usuários vs IMDb"** | `ABS(r.nota_media_usuarios - f.nota_imdb)` | Cruzar `dim_reviews r` com `fact_movies_performance f`. Recomenda-se filtrar filmes com um mínimo de avaliações (ex: `r.qtd_avaliacoes_usuarios >= 5` ou `f.qtd_imdb >= 1000`). |
| **"Atores"** | `dim_people.tipo_pessoa = 'Ator'` | **Nunca** filtrar apenas pelo nome sem checar `tipo_pessoa = 'Ator'`. |
| **"Diretores"** | `dim_people.tipo_pessoa = 'Diretor'` | Filtrar estritamente `tipo_pessoa = 'Diretor'`. |
| **"Roteiristas"** | `dim_people.tipo_pessoa = 'Roteirista'` | Filtrar estritamente `tipo_pessoa = 'Roteirista'`. |
| **"Produtora"**, **"Estúdio"** | `dim_companies.nome_produtora` | Cruzar via `bridge_movie_company`. |
| **"Gênero"** | `dim_genres.nome_genero` | Os nomes dos gêneros no banco estão em **inglês** (`'Action'`, `'Horror'`, `'Comedy'`, etc.). O agente deve traduzir perguntas como "Comédia" para `'Comedy'`. |
| **"Últimos 5 anos"** | `m.ano_lancamento >= 2021` | Considerando que os dados cobrem até 2026, ou dinamicamente `(SELECT MAX(ano_lancamento) FROM dim_movies) - 5`. |

---

## 4. Cuidados e Regras de Ouro de Performance (Gotchas)

1. **Volume Massivo na Bridge de Pessoas:**
   - A tabela `bridge_movie_person` tem **745.450 linhas** e `dim_people` tem **424.656 linhas**.
   - **Cuidado com Self-Joins não filtrados:** Cruzamentos do tipo `bridge_movie_person` com ela mesma para encontrar duplas ator-diretor sem filtros prévios podem travar a execução por escanear centenas de milhões de pares na memória.
   - **Boa prática:** Para consultas de ator/diretor, sempre aplicar filtros prévios de ano (`m.ano_lancamento`), limites com subqueries ou restringir ao ator/diretor pesquisado.
2. **Campos Numéricos Nulos / Zerados:**
   - 95% dos filmes catalogados não possuem dados de bilheteria e orçamento preenchidos (`orcamento_usd IS NULL` ou `receita_usd IS NULL`).
   - Para perguntas de finanças ("Maior margem", "Lucro médio"), é **mandatório** incluir:
     ```sql
     WHERE f.receita_brl IS NOT NULL AND f.receita_brl > 0 
       AND f.orcamento_brl IS NOT NULL AND f.orcamento_brl > 0
     ```
3. **Traduzir Gêneros para Inglês:**
   - Usuário pergunta: *"Qual produtora teve maior lucro em filmes de Terror?"*
   - O agente deve saber que "Terror" mapeia para `'Horror'` em `dim_genres.nome_genero`.
4. **Distinção entre `dim_reviews` e `movie_reviews`:**
   - Para médias ou totais de votos do portal: usar `dim_reviews` (tabela agregada 1:1, muito mais rápida).
   - Para ler resenhas completas, comentários específicos de pessoas ou fazer RAG/busca por sentimento textual: usar `movie_reviews`.
5. **Modo Read-Only no Driver:**
   - O driver SQLite deve ser conectado sempre via URI:
     ```python
     sqlite3.connect("file:cinerocket.db?mode=ro", uri=True)
     ```
   - Nenhuma query `CREATE`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `ALTER` é permitida.

---

## 5. Exemplos Canônicos de Queries para as Perguntas do Desafio

### Q1. Top 10 filmes com maior receita em R$:
```sql
SELECT 
    m.titulo, 
    m.ano_lancamento, 
    f.receita_brl, 
    f.lucro_brl
FROM fact_movies_performance f
JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
WHERE f.receita_brl IS NOT NULL AND f.receita_brl > 0
ORDER BY f.receita_brl DESC
LIMIT 10;
```

### Q2. Lucro médio por gênero (apenas filmes com receita informada):
```sql
SELECT 
    g.nome_genero,
    COUNT(m.sk_movie_id) as total_filmes,
    ROUND(AVG(f.lucro_brl), 2) as lucro_medio_brl
FROM dim_genres g
JOIN bridge_movie_genre bmg ON g.sk_genre_id = bmg.sk_genre_id
JOIN dim_movies m ON bmg.sk_movie_id = m.sk_movie_id
JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
WHERE f.receita_brl IS NOT NULL AND f.receita_brl > 0
GROUP BY g.nome_genero
ORDER BY lucro_medio_brl DESC;
```

### Q3. Filmes com maior margem de lucro (com receita e orçamento informados):
```sql
SELECT 
    m.titulo,
    m.ano_lancamento,
    f.orcamento_brl,
    f.receita_brl,
    ROUND(((CAST(f.receita_brl AS FLOAT) - f.orcamento_brl) / f.receita_brl) * 100, 2) as margem_lucro_pct
FROM fact_movies_performance f
JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
WHERE f.receita_brl > 0 AND f.orcamento_brl > 0
ORDER BY margem_lucro_pct DESC
LIMIT 10;
```

### Q4. Top 5 filmes mais populares:
```sql
SELECT 
    m.titulo,
    m.ano_lancamento,
    f.popularidade,
    f.nota_imdb,
    f.nota_tmdb
FROM fact_movies_performance f
JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
WHERE f.popularidade IS NOT NULL
ORDER BY f.popularidade DESC
LIMIT 5;
```

### Q5. Filmes com maior divergência entre nota TMDB e nota IMDb:
```sql
SELECT 
    m.titulo,
    f.nota_tmdb,
    f.nota_imdb,
    ROUND(ABS(f.nota_tmdb - f.nota_imdb), 2) as divergencia
FROM fact_movies_performance f
JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
WHERE f.nota_tmdb IS NOT NULL 
  AND f.nota_imdb IS NOT NULL
  AND f.qtd_tmdb >= 50
  AND f.qtd_imdb >= 100
ORDER BY divergencia DESC
LIMIT 10;
```

### Q6. Nota média IMDb por ano de lançamento:
```sql
SELECT 
    m.ano_lancamento,
    COUNT(m.sk_movie_id) as total_filmes,
    ROUND(AVG(f.nota_imdb), 2) as media_imdb
FROM dim_movies m
JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
WHERE f.nota_imdb IS NOT NULL 
  AND m.ano_lancamento IS NOT NULL
GROUP BY m.ano_lancamento
ORDER BY m.ano_lancamento ASC;
```

### Q7. Ator com mais participações nos últimos 5 anos:
```sql
SELECT 
    p.nome_pessoa as ator,
    COUNT(DISTINCT bmp.sk_movie_id) as total_filmes
FROM dim_people p
JOIN bridge_movie_person bmp ON p.sk_person_id = bmp.sk_person_id
JOIN dim_movies m ON bmp.sk_movie_id = m.sk_movie_id
WHERE p.tipo_pessoa = 'Ator'
  AND m.ano_lancamento >= 2021
GROUP BY p.nome_pessoa
ORDER BY total_filmes DESC
LIMIT 1;
```

### Q8. Diretores com maior nota média IMDb (mínimo de 5 filmes):
```sql
SELECT 
    p.nome_pessoa as diretor,
    COUNT(DISTINCT m.sk_movie_id) as qtd_filmes,
    ROUND(AVG(f.nota_imdb), 2) as media_imdb
FROM dim_people p
JOIN bridge_movie_person bmp ON p.sk_person_id = bmp.sk_person_id
JOIN dim_movies m ON bmp.sk_movie_id = m.sk_movie_id
JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
WHERE p.tipo_pessoa = 'Diretor' 
  AND f.nota_imdb IS NOT NULL
GROUP BY p.nome_pessoa
HAVING qtd_filmes >= 5
ORDER BY media_imdb DESC
LIMIT 10;
```

### Q9. Produtora com maior lucro total em R$:
```sql
SELECT 
    c.nome_produtora,
    COUNT(DISTINCT m.sk_movie_id) as total_filmes,
    SUM(f.lucro_brl) as lucro_total_brl
FROM dim_companies c
JOIN bridge_movie_company bmc ON c.sk_company_id = bmc.sk_company_id
JOIN dim_movies m ON bmc.sk_movie_id = m.sk_movie_id
JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
WHERE f.lucro_brl IS NOT NULL
GROUP BY c.nome_produtora
ORDER BY lucro_total_brl DESC
LIMIT 1;
```

### Q10. Filmes mais avaliados pelos usuários internos:
```sql
SELECT 
    m.titulo,
    m.ano_lancamento,
    r.qtd_avaliacoes_usuarios,
    r.nota_media_usuarios
FROM dim_reviews r
JOIN dim_movies m ON r.sk_movie_id = m.sk_movie_id
ORDER BY r.qtd_avaliacoes_usuarios DESC
LIMIT 10;
```
