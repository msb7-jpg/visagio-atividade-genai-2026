"""Catálogo estático canônico de sugestões e perguntas analíticas do CineData."""

from app.features.analytics.schemas import CategoryPromptsDTO, PromptSuggestionDTO

CANONICAL_PROMPT_CATEGORIES: list[CategoryPromptsDTO] = [
    CategoryPromptsDTO(
        id="text-to-sql",
        label="Consultas SQL (Desafio)",
        badge="Text-to-SQL",
        icon_name="Database",
        description="Perguntas canônicas de bilheteria, margem de lucro, diretores, elenco e popularidade.",
        prompts=[
            PromptSuggestionDTO(
                title="Top 10 Bilheteria (R$)",
                prompt="Quais são os 10 filmes com maior receita em R$?",
                sub_category="Finanças",
                icon_name="TrendingUp",
            ),
            PromptSuggestionDTO(
                title="Lucro Médio por Gênero",
                prompt="Qual o lucro médio por gênero de filme?",
                sub_category="Finanças",
                icon_name="Film",
            ),
            PromptSuggestionDTO(
                title="Maior Margem de Lucro",
                prompt="Quais filmes possuem a maior margem de lucro percentual?",
                sub_category="Finanças",
                icon_name="TrendingUp",
            ),
            PromptSuggestionDTO(
                title="Top 5 Mais Populares",
                prompt="Quais são os 5 filmes mais populares de acordo com o TMDB?",
                sub_category="Popularidade",
                icon_name="Sparkles",
            ),
            PromptSuggestionDTO(
                title="Divergência TMDB vs IMDb",
                prompt="Quais filmes apresentam a maior divergência entre a nota TMDB e a nota IMDb?",
                sub_category="Crítica",
                icon_name="SlidersHorizontal",
            ),
            PromptSuggestionDTO(
                title="Evolução Temporal IMDb",
                prompt="Qual a nota média IMDb dos filmes por ano de lançamento?",
                sub_category="Crítica",
                icon_name="LineChart",
            ),
            PromptSuggestionDTO(
                title="Ator Mais Produtivo",
                prompt="Qual ator possui mais participações em filmes nos últimos 5 anos?",
                sub_category="Elenco",
                icon_name="Search",
            ),
            PromptSuggestionDTO(
                title="Diretores com Maior Média",
                prompt="Quais diretores têm a maior nota média com pelo menos 5 filmes dirigidos?",
                sub_category="Elenco",
                icon_name="Sparkles",
            ),
            PromptSuggestionDTO(
                title="Produtora Mais Lucrativa",
                prompt="Qual produtora obteve o maior lucro total acumulado em R$?",
                sub_category="Finanças",
                icon_name="TrendingUp",
            ),
            PromptSuggestionDTO(
                title="Filmes Mais Avaliados",
                prompt="Quais são os filmes mais avaliados pelos usuários internos do portal?",
                sub_category="Crítica",
                icon_name="Search",
            ),
        ],
    ),
    CategoryPromptsDTO(
        id="charts",
        label="Gráficos & Visualizações",
        badge="Chart.js",
        icon_name="BarChart3",
        description="Rankings visuais, séries temporais e proporções renderizadas com react-chartjs-2.",
        prompts=[
            PromptSuggestionDTO(
                title="Ranking de Produtoras",
                prompt="Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo.",
                sub_category="Barras",
                icon_name="BarChart3",
            ),
            PromptSuggestionDTO(
                title="Faturamento Top Sci-Fi",
                prompt="Mostre um gráfico comparativo de faturamento dos top 5 filmes de ficção científica.",
                sub_category="Barras",
                icon_name="BarChart3",
            ),
            PromptSuggestionDTO(
                title="Evolução de Notas IMDb",
                prompt="Trace um gráfico de linhas com a evolução da nota média dos filmes no IMDb ao longo dos anos.",
                sub_category="Linhas",
                icon_name="LineChart",
            ),
            PromptSuggestionDTO(
                title="Volume de Lançamentos",
                prompt="Exiba um gráfico de linha comparando a quantidade de lançamentos por ano entre 2016 e 2026.",
                sub_category="Linhas",
                icon_name="LineChart",
            ),
            PromptSuggestionDTO(
                title="Distribuição por Gênero",
                prompt="Exiba um gráfico de pizza com a distribuição percentual de filmes pelos 5 principais gêneros.",
                sub_category="Pizza",
                icon_name="PieChart",
            ),
            PromptSuggestionDTO(
                title="Status dos Filmes",
                prompt="Qual a proporção de filmes lançados vs em produção no catálogo? Exiba em um gráfico de rosca.",
                sub_category="Rosca",
                icon_name="PieChart",
            ),
        ],
    ),
    CategoryPromptsDTO(
        id="hybrid-rag",
        label="Busca Semântica Híbrida (RAG)",
        badge="Vetor + SQL",
        icon_name="Sparkles",
        description="Busca conceitual por sinopse e sentimentos em resenhas combinada com métricas relacionais.",
        prompts=[
            PromptSuggestionDTO(
                title="Sci-Fi: Viagem no Tempo",
                prompt=(
                    "Encontre filmes que falem sobre viagens no tempo ou realidades paralelas "
                    "e mostre o orçamento e a nota IMDb de cada um."
                ),
                sub_category="Conceito",
                icon_name="Sparkles",
            ),
            PromptSuggestionDTO(
                title="Sentimentos: Plot Twist",
                prompt=(
                    "Procure resenhas em que os usuários tenham elogiado a reviravolta no final (plot twist) "
                    "e me diga qual foi a nota desses filmes."
                ),
                sub_category="Resenhas",
                icon_name="Search",
            ),
            PromptSuggestionDTO(
                title="IA Rebelde e Bilheteria",
                prompt=(
                    "Identifique filmes sobre inteligência artificial ou ciborgues que tenham faturado "
                    "mais de 100 milhões de dólares."
                ),
                sub_category="Híbrido",
                icon_name="TrendingUp",
            ),
            PromptSuggestionDTO(
                title="Superação e Desafios",
                prompt=(
                    "Busque filmes com sinopses sobre superação de perdas familiares ou desafios esportivos "
                    "com nota de usuário acima de 8.0."
                ),
                sub_category="Conceito",
                icon_name="Sparkles",
            ),
        ],
    ),
    CategoryPromptsDTO(
        id="general",
        label="Geral & Assistência",
        badge="Direct AI",
        icon_name="HelpCircle",
        description="Esclarecimentos sobre as capacidades do agente, arquitetura e catálogo do Lakehouse.",
        prompts=[
            PromptSuggestionDTO(
                title="O que você faz?",
                prompt="Olá! Quais análises você consegue realizar sobre o catálogo de cinema do CineData?",
                sub_category="Sistema",
                icon_name="HelpCircle",
            ),
            PromptSuggestionDTO(
                title="Estrutura do Banco",
                prompt="Quais são as tabelas e dados disponíveis no cinerocket.db?",
                sub_category="Estrutura",
                icon_name="Database",
            ),
            PromptSuggestionDTO(
                title="Como funciona o RAG?",
                prompt="Como você combina a busca semântica em sinopses com as consultas analíticas de SQL?",
                sub_category="Inteligência",
                icon_name="Sparkles",
            ),
        ],
    ),
]
