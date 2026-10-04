import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Brain,
  Database,
  Film,
  Layers,
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
  icon?: LucideIcon
}

export interface PromptCategory {
  id: string
  label: string
  badge: string
  icon: LucideIcon
  description: string
  prompts: PromptExample[]
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'text-to-sql',
    label: 'Consultas SQL',
    badge: 'Text-to-SQL',
    icon: Database,
    description: 'Agregações relacionais, estatísticas de bilheteria, popularidade e métricas de elenco.',
    prompts: [
      { title: 'Top 10 Bilheteria', prompt: 'Quais são os 10 filmes com maior receita em R$?', subCategory: 'Finanças', icon: TrendingUp },
      { title: 'Lucro Médio por Gênero', prompt: 'Qual o lucro médio por gênero de filme?', subCategory: 'Finanças', icon: Film },
      { title: 'Margem de Lucro', prompt: 'Quais filmes possuem a maior margem de lucro percentual?', subCategory: 'Finanças', icon: TrendingUp },
      { title: 'Top 5 Populares TMDB', prompt: 'Quais são os 5 filmes mais populares de acordo com o TMDB?', subCategory: 'Popularidade', icon: Sparkles },
      { title: 'Divergência Crítica', prompt: 'Quais filmes apresentam a maior divergência entre a nota TMDB e a nota IMDb?', subCategory: 'Crítica', icon: SlidersHorizontal },
      { title: 'Média IMDb por Ano', prompt: 'Qual a nota média IMDb dos filmes por ano de lançamento?', subCategory: 'Crítica', icon: LineChart },
      { title: 'Ator Mais Ativo', prompt: 'Qual ator possui mais participações em filmes nos últimos 5 anos?', subCategory: 'Elenco', icon: Search },
      { title: 'Diretores Prolíficos', prompt: 'Quais diretores têm a maior nota média com pelo menos 5 filmes dirigidos?', subCategory: 'Elenco', icon: Sparkles },
      { title: 'Maior Lucro Produtora', prompt: 'Qual produtora obteve o maior lucro total acumulado?', subCategory: 'Produtoras', icon: Database }
    ]
  },
  {
    id: 'charts',
    label: 'Gráficos & Visualizações',
    badge: 'Chart.js',
    icon: BarChart3,
    description: 'Geração dinâmica de gráficos de barras, linhas e rosca/pizza para análises visuais.',
    prompts: [
      { title: 'Top Produtoras', prompt: 'Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo.', subCategory: 'Barras', icon: BarChart3 },
      { title: 'Distribuição por Gênero', prompt: 'Exiba um gráfico de pizza com a distribuição percentual de filmes pelos 5 principais gêneros.', subCategory: 'Pizza/Rosca', icon: PieChart },
      { title: 'Evolução Nota IMDb', prompt: 'Trace a evolução da nota média dos filmes no IMDb ao longo dos anos.', subCategory: 'Linhas', icon: LineChart },
      { title: 'Faturamento Sci-Fi', prompt: 'Mostre um gráfico comparativo de faturamento dos top 5 filmes de ficção científica.', subCategory: 'Barras', icon: BarChart3 },
      { title: 'Lançamentos 2016-2026', prompt: 'Exiba um gráfico de linha comparando a quantidade de lançamentos por ano entre 2016 e 2026.', subCategory: 'Linhas', icon: LineChart },
      { title: 'Status de Produção', prompt: 'Qual a proporção de filmes lançados vs em produção no catálogo?', subCategory: 'Pizza/Rosca', icon: PieChart }
    ]
  },
  {
    id: 'semantic-direct',
    label: 'Busca Semântica Direta',
    badge: 'Vetor / Direct',
    icon: Search,
    description: 'Busca por similaridade de embeddings diretamente em temas, sinopses e resenhas sem SQL posterior.',
    prompts: [
      { title: 'Viagens no Tempo', prompt: 'Encontre filmes que falem sobre viagens no tempo ou realidades paralelas.', subCategory: 'Conceitos', icon: Sparkles },
      { title: 'Reviews com Plot Twist', prompt: 'Procure resenhas em que os usuários tenham elogiado a reviravolta no final (plot twist).', subCategory: 'Sentimentos', icon: Search },
      { title: 'IA e Ciborgues', prompt: 'Identifique filmes sobre inteligência artificial ou ciborgues.', subCategory: 'Temas', icon: Brain },
      { title: 'Superação e Esportes', prompt: 'Busque filmes com sinopses sobre superação de perdas familiares ou desafios esportivos.', subCategory: 'Dramas', icon: Film }
    ]
  },
  {
    id: 'semantic-hybrid',
    label: 'Busca Semântica Híbrida',
    badge: 'Vetor + SQL',
    icon: Layers,
    description: 'Busca por similaridade vetorial combinada com consultas relacionais adicionais no banco de dados.',
    prompts: [
      { title: 'Sci-Fi: Orçamento e Nota', prompt: 'Encontre filmes que falem sobre viagens no tempo ou realidades paralelas e mostre o orçamento e a nota IMDb de cada um.', subCategory: 'Híbrida', icon: Database },
      { title: 'Plot Twist e Notas', prompt: 'Procure resenhas em que os usuários tenham elogiado a reviravolta no final (plot twist) e me diga qual foi a nota desses filmes.', subCategory: 'Híbrida', icon: SlidersHorizontal },
      { title: 'IA: Faturamento > $100M', prompt: 'Identifique filmes sobre inteligência artificial ou ciborgues que tenham faturado mais de 100 milhões de dólares.', subCategory: 'Híbrida', icon: TrendingUp },
      { title: 'Dramas: Nota > 8.0', prompt: 'Busque filmes com sinopses sobre superação de perdas familiares ou desafios esportivos com nota de usuário acima de 8.0.', subCategory: 'Híbrida', icon: Sparkles }
    ]
  }
]
