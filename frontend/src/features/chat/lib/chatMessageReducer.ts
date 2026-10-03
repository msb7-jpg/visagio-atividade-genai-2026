import type {
  AgentStepItem,
  ChartJsConfigDTO,
  ChatMessageBlock,
  ChatMessageItem
} from '@/features/chat/types/chat.types'

function upsertBlock(blocks: ChatMessageBlock[], newBlock: ChatMessageBlock): ChatMessageBlock[] {
  return [...blocks.filter(block => block.type !== newBlock.type), newBlock]
}

function markLastStepFailed(steps: AgentStepItem[], fallbackLabel: string): AgentStepItem[] {
  if (steps.length === 0) 
    return [{ 
      step: 'error', 
      label: fallbackLabel, 
      status: 'error' 
    }]
  
  return steps.with(-1, { ...steps.at(-1)!, status: 'error' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (msg: ChatMessageItem, payload: any) => ChatMessageItem

const handleSession: EventHandler = (msg, payload) => ({
  ...msg,
  provider: payload.provider ?? msg.provider,
  model: payload.model ?? msg.model
})

const handleStepEnd: EventHandler = (msg, payload) => {
  const stepItem: AgentStepItem = {
    step: payload.step,
    label: payload.label,
    status: payload.status,
    duration_ms: payload.duration_ms
  }
  return {
    ...msg,
    steps: [...msg.steps.filter(step => step.step !== payload.step), stepItem]
  }
}

const handleThought: EventHandler = (msg, payload) => {
  if (!payload.thought) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `th-${Date.now()}`,
      type: 'thought',
      content: payload.thought
    })
  }
}

const handleSql: EventHandler = (msg, payload) => {
  if (!payload.sql) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `sql-${Date.now()}`,
      type: 'sql',
      query: payload.sql,
      rawQuery: payload.raw
    })
  }
}

const handleChart: EventHandler = (msg, payload: ChartJsConfigDTO) => {
  if (!payload.type || !payload.datasets) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `chart-${Date.now()}`,
      type: 'chart',
      config: payload
    })
  }
}

const handleData: EventHandler = (msg, payload) => {
  if (!payload.rows) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `data-${Date.now()}`,
      type: 'data',
      rows: payload.rows
    })
  }
}

const handleToken: EventHandler = (msg, payload) => {
  if (!payload.token) return msg
  return {
    ...msg,
    content: payload.token,
    blocks: upsertBlock(msg.blocks, {
      id: `text-${Date.now()}`,
      type: 'text',
      content: payload.token
    })
  }
}

const handleError: EventHandler = (msg, payload) => {
  const errorMsg = payload.message || payload.error || 'Erro no processamento da solicitação.'
  const errorCode = payload.error_code || 'AGENT_ERROR'
  const rawError = payload.error || errorMsg

  return {
    ...msg,
    content: errorMsg,
    blocks: upsertBlock(msg.blocks, {
      id: `err-${Date.now()}`,
      type: 'error',
      message: errorMsg,
      code: errorCode,
      rawError: rawError !== errorMsg ? rawError : undefined
    }),
    steps: markLastStepFailed(msg.steps, 'Falha na execução do modelo')
  }
}

const EVENT_HANDLERS: Record<string, EventHandler> = {
  session: handleSession,
  step_end: handleStepEnd,
  thought: handleThought,
  sql: handleSql,
  chart: handleChart,
  data: handleData,
  token: handleToken,
  error: handleError
}

export function applySseEventToMessage(
  msg: ChatMessageItem,
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any
): ChatMessageItem {
  const handler = EVENT_HANDLERS[event]
  return handler ? handler(msg, parsed) : msg
}

export function applyNetworkErrorToMessage(
  msg: ChatMessageItem,
  errorMsg: string
): ChatMessageItem {
  return {
    ...msg,
    content: errorMsg,
    blocks: upsertBlock(msg.blocks, {
      id: `err-${Date.now()}`,
      type: 'error',
      message: errorMsg,
      code: 'NETWORK_ERROR'
    }),
    steps: markLastStepFailed(msg.steps, 'Falha de conexão')
  }
}
