export type MessageRole = 'user' | 'assistant'

export type StepperNodeStatus = 'pending' | 'active' | 'done' | 'error'

export interface AgentStepItem {
  step: string
  label: string
  status: StepperNodeStatus
  duration_ms?: number
}

export interface ChatBlockText {
  id: string
  type: 'text'
  content: string
}

export interface ChatBlockThought {
  id: string
  type: 'thought'
  content: string
}

export interface ChatBlockSql {
  id: string
  type: 'sql'
  query: string
  rawQuery?: string
}

export interface ChatBlockData {
  id: string
  type: 'data'
  rows: Record<string, unknown>[]
}

export interface ChatBlockError {
  id: string
  type: 'error'
  message: string
  code?: string
  rawError?: string
}

export type ChatMessageBlock =
  | ChatBlockText
  | ChatBlockThought
  | ChatBlockSql
  | ChatBlockData
  | ChatBlockError

export interface ChatMessageItem {
  id: string
  role: MessageRole
  content: string
  blocks: ChatMessageBlock[]
  steps: AgentStepItem[]
  timestamp: number
  isStreaming?: boolean
  model?: string
  provider?: string
}

