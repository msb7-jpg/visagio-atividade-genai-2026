import {
  BarChart3,
  Database,
  Film,
  LineChart,
  PieChart,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp
} from 'lucide-react'

export interface PromptExample {
  title: string
  prompt: string
  subCategory?: string
  icon?: any
}

export interface PromptCategory {
  id: string
  label: string
  badge: string
  icon: any
  description: string
  prompts: PromptExample[]
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'text-to-sql',
    label: 'Consultas SQL',
    badge: 'Text-to-SQL',
    icon: Database,
    description: 'Agregações relacionais, rankings financeiros e métricas de elenco.',
    prompts: [
      { title: 'Top 10 Bilheteria', prompt: 'Quais são os 10 filmes com maior receita em R$?', subCategory: 'Finanças', icon: TrendingUp },
      { title: 'Lucro por Gênero', prompt: 'Qual o lucro médio por gênero de filme?', subCategory: 'Finanças', icon: Film },
      { title: 'Margem de Lucro', prompt: 'Quais filmes possuem a maior margem de lucro percentual?', subCategory: 'Finanças', icon: TrendingUp },
      { title: 'Divergência Crítica', prompt: 'Quais filmes apresentam a maior divergência entre a nota TMDB e a nota IMDb?', subCategory: 'Crítica', icon: SlidersHorizontal },
      { title: 'Produtoras de Topo', prompt: 'Qual produtora obteve o maior lucro total acumulado?', subCategory: 'Produtoras', icon: Database }
    ]
  },
  {
    id: 'charts',
    label: 'Visualizações',
    badge: 'Chart.js',
    icon: BarChart3,
    description: 'Gere gráficos interativos automaticamente a partir dos dados calculados.',
    prompts: [
      { title: 'Ranking de Produtoras', prompt: 'Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo.', subCategory: 'Barras', icon: BarChart3 },
      { title: 'Evolução de Notas IMDb', prompt: 'Trace a evolução da nota média dos filmes no IMDb ao longo dos anos.', subCategory: 'Linhas', icon: LineChart },
      { title: 'Distribuição de Gêneros', prompt: 'Exiba um gráfico de pizza com a distribuição percentual de filmes pelos 5 principais gêneros.', subCategory: 'Pizza/Rosca', icon: PieChart },
      { title: 'Faturamento Sci-Fi', prompt: 'Mostre um gráfico comparativo de faturamento dos top 5 filmes de ficção científica.', subCategory: 'Barras', icon: BarChart3 }
    ]
  },
  {
    id: 'semantic',
    label: 'Busca Semântica',
    badge: 'Vetor + SQL',
    icon: Sparkles,
    description: 'Embeddings neurais combinados com filtros e métricas estruturadas.',
    prompts: [
      { title: 'Viagem no Tempo & Multiverso', prompt: 'Encontre filmes que falem sobre viagens no tempo ou realidades paralelas e mostre o orçamento e a nota IMDb de cada um.', subCategory: 'Conceitos Sci-Fi', icon: Sparkles },
      { title: 'Plot Twists Elogiados', prompt: 'Procure resenhas em que os usuários tenham elogiado a reviravolta no final (plot twist) e me diga qual foi a nota desses filmes.', subCategory: 'Análise de Reviews', icon: Search },
      { title: 'IA & Bilheteria Alta', prompt: 'Identifique filmes sobre inteligência artificial ou ciborgues que tenham faturado mais de 100 milhões de dólares.', subCategory: 'Temas Distópicos', icon: Sparkles },
      { title: 'Dramas de Superação', prompt: 'Busque filmes com sinopses sobre superação pessoal e mostre a média de avaliação.', subCategory: 'Dramas', icon: Film }
    ]
  }
]
