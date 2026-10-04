# Plano de Implementação: Slice 5 (Busca Semântica Híbrida & Math Sandbox com sqlite-vec)

Este documento detalha o planejamento da execução do **Slice 5**, aplicando rigorosamente os padrões de arquitetura e refatoração consolidados nos Slices anteriores (conforme os guias em `plan/walkthrough-slice-refactoring-and-fencing.md`, `plan/frontend-guidelines.md` e `plan/langchain-langgraph-standards.md`).

## 1. Backend: Arquitetura Canônica LangChain 2026 e RAG com `sqlite-vec`

O Slice 5 introduz a inteligência de processamento semântico integrada nativamente ao banco de dados relacional e a execução segura de código matemático.

### 1.1 Coluna `fact_movies_performance.genai_context` e Vetorização Nativa (`sqlite-vec` + `numpy`)
Substituindo a necessidade de índices vetoriais isolados em arquivos temporários (`vector_cache.npz`), tabelas duplicadas ou heurísticas de keyword matching, a busca semântica reside diretamente na tabela fato `fact_movies_performance` do banco SQLite (`cinerocket.db`), utilizando a extensão oficial de alta performance **`sqlite-vec`** combinada com **`numpy`**:

1. **Script de Geração de Contexto (`backend/scripts/generate_genai_context.py`):**
   * Script desacoplado (sem dependência de PySpark, utilizando o pipeline relacional nativo Python/SQLite) para pré-computar e manter a coluna analítica `fact_movies_performance.genai_context` e a tabela virtual KNN `vec_movies`.
   * **Tipagem Estrita com Dataclass:**
     * Utiliza `MovieContextRecord` (`@dataclass(frozen=True, slots=True)`), banindo completamente `dict[str, Any]` do pipeline de dados.
   * **Extração da Tabela Fato e Dimensões:**
     * Concatena dados ricos da `fact_movies_performance` cruzados com `dim_movies`, `bridge_movie_genre` + `dim_genres`, e `bridge_movie_person` + `dim_people`.
     * Campos agregados: Título, Ano de Lançamento, Duração, Gêneros, Diretores, Elenco Principal, Sinopse, Popularidade, Notas IMDb/TMDB, Faturamento (R$), Orçamento (R$) e Lucro (R$).
     * **Coluna `genai_context`:** Texto semântico estruturado para consumo de embeddings e do LLM:
       ```text
       Título: {titulo} ({ano_lancamento})
       Gêneros: {generos} | Direção: {diretores} | Elenco: {elenco}
       Sinopse: {sinopse}
       Métricas: Popularidade {popularidade} | IMDb {nota_imdb} | TMDB {nota_tmdb} | Bilheteria R$ {receita_brl} | Lucro R$ {lucro_brl}
       ```
   * **Geração de Embeddings e Armazenamento Vetorial:**
     * Vetorização em lote via `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensões float32) e `numpy`.
     * Atualização direta da coluna `fact_movies_performance.genai_context = ? WHERE sk_movie_id = ?`.
     * Criação e população da tabela virtual `vec_movies USING vec0(sk_movie_id TEXT PRIMARY KEY, embedding float[384])` via `sqlite-vec` para aceleração KNN vetorial SIMD com latência sub-milissegundo (< 10ms).

2. **Schema Relacional no SQLite:**
   ```sql
   -- Coluna contextual diretamente na tabela fato existente:
   ALTER TABLE fact_movies_performance ADD COLUMN genai_context TEXT;

   -- Índice vetorial virtual acelerado por SIMD via sqlite-vec:
   CREATE VIRTUAL TABLE IF NOT EXISTS vec_movies USING vec0(
       sk_movie_id TEXT PRIMARY KEY,
       embedding float[384]
   );
   ```

3. **Novo Gerenciador `vector_store.py` (Busca Semântica Unificada):**
   * **Remoção de Alvos Artificiais (`target`):** Como busca semântica é unificada sobre o contexto do catálogo de filmes, não há bifurcação heurística entre sinopses e resenhas. A busca atua de forma direta sobre os embeddings de `genai_context`.
   * **Tipagem Estrita com `TypedDict`:**
     ```python
     class MovieSearchResult(TypedDict):
         sk_movie_id: str
         titulo: str
         ano_lancamento: int | None
         generos: str | None
         diretores: str | None
         popularidade: float | None
         nota_imdb: float | None
         score_similaridade: float
         trecho_relevante: str
     ```
   * Conecta ao `cinerocket.db` em modo seguro `mode=ro` com a extensão `sqlite-vec` carregada via `conn.enable_load_extension(True); sqlite_vec.load(conn)`.
   * **Assinatura do Método:**
     ```python
     def search(self, query: str, top_k: int = 5) -> list[MovieSearchResult]:
     ```
   * **Execução da Consulta Vetorial:** Converte a query do usuário em embedding (384 float32) via `EmbeddingModelManager` e executa consulta nativa KNN unindo o índice virtual à tabela fato e dimensões:
     ```sql
     SELECT 
         f.sk_movie_id,
         m.titulo,
         m.ano_lancamento,
         COALESCE(m.sinopse, '') AS sinopse,
         f.popularidade,
         f.nota_imdb,
         f.genai_context,
         v.distance
     FROM vec_movies v
     JOIN fact_movies_performance f ON v.sk_movie_id = f.sk_movie_id
     JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
     WHERE v.embedding MATCH ? AND k = ?
     ORDER BY v.distance ASC;
     ```
   * **Tolerância a Falhas / Fallback:** Caso a tabela virtual ainda não tenha sido gerada no ambiente, o `VectorStore` realiza graceful fallback tipado via filtragem relacional em `dim_movies` e `fact_movies_performance`.

4. **Ferramenta `@tool` (`semantic_search.py`):**
   * Encapsula a chamada ao `VectorStore` e disponibiliza para o agente e para o nó `semantic_rag` os contextos recuperados com a tipagem estrita `list[MovieSearchResult]`.
   * Sem parâmetro `target`, operando de forma direta: `search_movie_synopsis_and_reviews(query: str, top_k: int = 5)`.

---

### 1.2 Sandbox Matemática Segura (`backend/app/agent/tools/data_analysis.py`)
Conforme a diretriz anti-bypass e anti-obsolescência (remoção de `langchain-experimental`):
* `sandbox_env.py`: Isola a função de `exec()`.
* O dicionário de `SAFE_BUILTINS` bloqueia acesso a módulos de sistema (`os`, `sys`, `__import__`, `open`).
* A tool `calculate_data_metrics` executa código Python seguro gerado pelo LLM para responder agregações numéricas complexas e análises que o SQL não resolva diretamente.

---

### 1.3 Grafo do LangGraph (`backend/app/agent/`)
* **`nodes/router_node.py`:** O classificador distingue rotas: `sql`, `rag`, `hybrid` (RAG + SQL) e `direct`.
* **`nodes/semantic_rag.py` e `nodes/data_analysis.py`:** Nós de processamento integrados em `graph.py`, lidando com emissão de passos para a UI e síntese de respostas fundamentadas em evidências tipadas.

---

### 1.4 API Analítica (`backend/app/features/analytics/`)
* Vertical Slice (`router.py`, `schemas.py`, `service.py`) para a rota `/analytics`.
* **`GET /analytics/suggestions`:** Catálogo de perguntas canônicas do desafio (Categorias A, B e C), eliminando dados mocados no frontend.
* **`GET /analytics/schema`:** Metadados do banco `cinerocket.db` (incluindo contagem de filmes vetorizados).

---

## 2. Frontend: Fencing, Headless Hooks e Modularização

### 2.1 Refatoração do `SuggestionsExplorer.tsx`
* **`features/analytics/api/analyticsQueryKeys.ts`**: Centralizador das chaves TanStack Query.
* **`features/analytics/hooks/useAnalyticsSuggestionsQuery.ts`**: Hook TanStack Query (`useQuery`) atômico para leitura das sugestões da API.
* **Fencing/Renderização Otimizada**: Exibição de Skeletons Dark Glass durante o carregamento inicial.

### 2.2 Novo Bloco de Evidência: `SemanticEvidenceCard.tsx`
* Componente em `features/chat/components/renderers/SemanticEvidenceCard.tsx` para exibição de evidências de RAG semântico (título, similaridade, trecho do contexto).
* Teste unitário co-localizado em `__tests__/SemanticEvidenceCard.test.tsx`.

---

## 3. Estratégia de Testes

* **Backend (`tests/agent/`):**
  * `test_data_analysis_sandbox.py`: Validações de segurança para sandbox matemática.
  * `test_semantic_search.py`: Verificação da busca vetorial com `sqlite-vec`, `genai_context` e similaridade cosseno (sem alvo/target).
  * `test_hybrid_flow.py`: Orquestração RAG ➔ SQL unificada.
* **Frontend:**
  * Atualizar `SuggestionsExplorer.test.tsx` garantindo integração com TanStack Query.
