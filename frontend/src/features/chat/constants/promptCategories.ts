import type { LucideIcon } from 'lucide-react'
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
    description: 'Agregações relacionais, rankings financeiros e métricas de elenco.',
    prompts: [
      { title: 'Top 10 Bilheteria', prompt: 'Quais são os 10 filmes com maior receita em R$?', subCategory: 'Finanças', icon: TrendingUp },
      { title: 'Lucro por Gênero', prompt: 'Qual o lucro médio por gênero de filme?', subCategory: 'Finanças', icon: Film },
      { title: 'Margem de Lucro', prompt: 'Quais filmes possuem a maior margem de lucro percentual?', subCategory: 'Finanças', icon: TrendingUp },
      { title: 'Divergência Crítica', prompt: 'Quais filmes apresentam a maior divergência entre a nota TMDB e a nota IMDb?', subCategory: 'Crítica', icon: SlidersHorizontal },
      { title: 'Diretores Prolíficos', prompt: 'Quais diretores têm a maior média de notas com mais de 3 filmes?', subCategory: 'Equipe', icon: Sparkles },
      { title: 'Atores em Destaque', prompt: 'Qual ator participou do maior número de produções no catálogo?', subCategory: 'Equipe', icon: Search }
    ]
  },
  {
    id: 'charts',
    label: 'Gráficos & Visualizações',
    badge: 'Chart.js',
    icon: BarChart3,
    description: 'Comparações visuais com geração dinâmica de gráficos interativos.',
    prompts: [
      { title: 'Gráfico Top Produtoras', prompt: 'Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo.', subCategory: 'Barras', icon: BarChart3 },
      { title: 'Distribuição por Gênero', prompt: 'Faça um gráfico de pizza mostrando a quantidade de filmes por gênero.', subCategory: 'Pizza', icon: PieChart },
      { title: 'Evolução de Notas', prompt: 'Mostre em um gráfico de linhas a evolução da média de notas dos filmes lançados ano a ano.', subCategory: 'Linhas', icon: LineChart }
    ]
  },
  {
    id: 'general',
    label: 'Geral & Conversação',
    badge: 'Direct AI',
    icon: Sparkles,
    description: 'Interações diretas com o assistente, esclarecimento de métricas e capacidades.',
    prompts: [
      { title: 'O que você faz?', prompt: 'Olá! Quais análises você consegue realizar sobre o catálogo de cinema?', subCategory: 'Boas-vindas', icon: Sparkles },
      { title: 'Esquema do Banco', prompt: 'Quais são as tabelas e dados disponíveis no CineData?', subCategory: 'Estrutura', icon: Database },
      { title: 'Modelos Suportados', prompt: 'Quais modelos e provedores de IA estão disponíveis nas configurações?', subCategory: 'Sistema', icon: SlidersHorizontal }
    ]
  }
]
