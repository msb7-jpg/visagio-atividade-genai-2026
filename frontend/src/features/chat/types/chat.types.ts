/**
 * Constantes de papéis de remetente nas mensagens do chat.
 */
export const MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE]

/**
 * Constantes de status de execução de uma etapa do agente.
 */
export const STEP_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  ERROR: 'error'
} as const

export type StepperNodeStatus = (typeof STEP_STATUS)[keyof typeof STEP_STATUS]

/**
 * Constantes de eventos Server-Sent Events (SSE) despachados pelo backend.
 */
export const SSE_EVENT = {
  SESSION: 'session',
  DONE: 'done',
  TITLE: 'title',
  ERROR: 'error',
  STEP_END: 'step_end',
  THOUGHT: 'thought',
  SQL: 'sql',
  CHART: 'chart',
  DATA: 'data',
  TOKEN: 'token'
} as const

export type SseEventType = (typeof SSE_EVENT)[keyof typeof SSE_EVENT]

/**
 * Constantes para tipos de visualização gráfica suportados.
 */
export const CHART_TYPE = {
  BAR: 'bar',
  LINE: 'line',
  PIE: 'pie',
  DOUGHNUT: 'doughnut'
} as const

export type ChartType = (typeof CHART_TYPE)[keyof typeof CHART_TYPE]

/**
 * Constantes para comandos de barra (slash commands) reconhecidos pelo sistema.
 */
export const SLASH_COMMANDS = {
  CHART: '/chart',
  CLEAR: '/clear'
} as const

export type SlashCommand = (typeof SLASH_COMMANDS)[keyof typeof SLASH_COMMANDS]

/**
 * Estrutura declarativa de um comando de barra para exibição no menu rápido.
 */
export interface SlashCommandDefinition {
  name: string
  label: string
  description: string
}

/**
 * Constantes para identificação de blocos de conteúdo da mensagem.
 */
export const CHAT_BLOCK_TYPE = {
  TEXT: 'text',
  THOUGHT: 'thought',
  SQL: 'sql',
  DATA: 'data',
  CHART: 'chart',
  ERROR: 'error'
} as const

export type ChatBlockType = (typeof CHAT_BLOCK_TYPE)[keyof typeof CHAT_BLOCK_TYPE]

/**
 * Informação detalhada de cada etapa executada pelo pipeline do agente.
 */
export interface AgentStepItem {
  /** Nome identificador do nó (ex: 'sql_generator', 'sql_executor'). */
  step: string
  /** Rótulo legível para exibição ao usuário na timeline. */
  label: string
  /** Status atual de conclusão da etapa. */
  status: StepperNodeStatus
  /** Duração em milissegundos gasta na execução do nó. */
  duration_ms?: number
}

/**
 * Série de dados numéricos pura para renderização no gráfico.
 */
export interface ChartDataset {
  /** Nome descritivo da série métrica. */
  label: string
  /** Valores numéricos correspondentes aos rótulos. */
  data: number[]
}

/**
 * Configuração declarativa de gráfico no padrão simplificado do Chart.js.
 */
export interface ChartJsConfigDTO {
  /** Tipo visual do gráfico. */
  type: ChartType
  /** Título exibido no cabeçalho do card de gráfico. */
  title: string
  /** Categorias do eixo horizontal ou fatias. */
  labels: string[]
  /** Conjuntos de dados numéricos a serem plotados. */
  datasets: ChartDataset[]
}

/**
 * Bloco de texto sintetizado em Markdown.
 */
export interface ChatBlockText {
  /** Identificador único do bloco dentro da mensagem. */
  id: string
  /** Tipo fixo 'text'. */
  type: typeof CHAT_BLOCK_TYPE.TEXT
  /** Conteúdo textual formatado. */
  content: string
}

/**
 * Bloco de raciocínio intermediário emitido pelo agente.
 */
export interface ChatBlockThought {
  /** Identificador único do bloco. */
  id: string
  /** Tipo fixo 'thought'. */
  type: typeof CHAT_BLOCK_TYPE.THOUGHT
  /** Texto com as reflexões e planejamento do modelo. */
  content: string
}

/**
 * Bloco de código contendo consulta SQL executada.
 */
export interface ChatBlockSql {
  /** Identificador único do bloco. */
  id: string
  /** Tipo fixo 'sql'. */
  type: typeof CHAT_BLOCK_TYPE.SQL
  /** Query formatada com quebras de linha e palavras-chave em caixa alta. */
  query: string
  /** Query original gerada pelo modelo sem pós-processamento de formatação. */
  rawQuery?: string
}

/**
 * Bloco de dados tabulares brutos retornados pelo SQLite.
 */
export interface ChatBlockData {
  /** Identificador único do bloco. */
  id: string
  /** Tipo fixo 'data'. */
  type: typeof CHAT_BLOCK_TYPE.DATA
  /** Registros retornados em formato de lista de dicionários. */
  rows: Record<string, unknown>[]
}

/**
 * Bloco de visualização gráfica interativa.
 */
export interface ChatBlockChart {
  /** Identificador único do bloco. */
  id: string
  /** Tipo fixo 'chart'. */
  type: typeof CHAT_BLOCK_TYPE.CHART
  /** Especificação do gráfico para o renderizador Chart.js. */
  config: ChartJsConfigDTO
}

/**
 * Bloco de alerta para exibição de erros operacionais ou de negócio.
 */
export interface ChatBlockError {
  /** Identificador único do bloco. */
  id: string
  /** Tipo fixo 'error'. */
  type: typeof CHAT_BLOCK_TYPE.ERROR
  /** Mensagem amigável traduzida para o usuário. */
  message: string
  /** Código semântico padronizado da falha. */
  code?: string
  /** Erro bruto original emitido pelo backend para depuração. */
  rawError?: string
}

/**
 * União discriminada de todos os blocos possíveis em uma mensagem.
 */
export type ChatMessageBlock =
  | ChatBlockText
  | ChatBlockThought
  | ChatBlockSql
  | ChatBlockData
  | ChatBlockChart
  | ChatBlockError

/**
 * Representação completa de uma mensagem no feed de conversa.
 */
export interface ChatMessageItem {
  /** Identificador único da mensagem. */
  id: string
  /** Papel de quem enviou ('user' ou 'assistant'). */
  role: MessageRole
  /** Conteúdo textual consolidado. */
  content: string
  /** Lista ordenada de blocos modulares componentes da resposta. */
  blocks: ChatMessageBlock[]
  /** Etapas de raciocínio intermediárias observadas durante o processamento. */
  steps: AgentStepItem[]
  /** Timestamp em milissegundos da criação da mensagem. */
  timestamp: number
  /** Flag indicando se a resposta ainda está em fluxo de geração via stream. */
  isStreaming?: boolean
  /** Identificador do modelo LLM utilizado para responder. */
  model?: string
  /** Provedor de inferência utilizado. */
  provider?: string
}

/**
 * Resumo de uma conversa para listagem na barra lateral.
 */
export interface ThreadSummary {
  /** Identificador único da sessão/thread. */
  thread_id: string
  /** Título descritivo da conversa. */
  title: string
  /** Timestamp de criação em segundos. */
  created_at: number
  /** Timestamp da última atualização em segundos. */
  updated_at: number
}

/**
 * Detalhes estruturados de uma thread persistida no checkpointer.
 */
export interface ThreadDetail extends ThreadSummary {
  /** Mensagens históricas reconstituídas a partir do checkpoint. */
  messages: {
    id: string
    role: MessageRole
    content: string
    type?: string
    thought?: string
    generated_sql?: string
    chart_spec?: ChartJsConfigDTO
    steps?: AgentStepItem[]
    provider?: string
    model?: string
  }[]
  /** Indica que o backend ainda está gerando a resposta desta thread. */
  is_running?: boolean
}

// -------------------------------------------------------------
// Payloads dos eventos Server-Sent Events (SSE)
// -------------------------------------------------------------

export interface SseSessionPayload {
  thread_id: string
  provider?: string
  model?: string
}

export interface SseStepEndPayload {
  step: string
  label: string
  status: StepperNodeStatus
  duration_ms?: number
}

export interface SseThoughtPayload {
  thought: string
}

export interface SseSqlPayload {
  sql: string
  raw?: string
}

export type SseChartPayload = ChartJsConfigDTO

export interface SseDataPayload {
  rows: Record<string, unknown>[]
}

export interface SseTokenPayload {
  token: string
}

export interface SseTitlePayload {
  thread_id: string
  title: string
}

export interface SseErrorPayload {
  error: string
  error_code?: string
  message: string
}

export interface SseDonePayload {
  status: string
  thread_id: string
}

export interface MovieDetailDTO {
  sk_movie_id: string
  id_filme?: string | null
  titulo: string
  ano_lancamento?: number | null
  duracao_minutos?: number | null
  status_filme?: string | null
  sinopse?: string | null
  url_poster?: string | null
  url_backdrop?: string | null
  generos: string[]
  diretores: string[]
  nota_imdb?: number | null
  qtd_imdb?: number | null
  nota_tmdb?: number | null
  qtd_tmdb?: number | null
  receita_brl?: number | null
  orcamento_brl?: number | null
  lucro_brl?: number | null
}
