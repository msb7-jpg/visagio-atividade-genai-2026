/**
 * Formato padrão esperado no corpo de respostas de erro da API FastAPI.
 */
interface ApiErrorResponse {
  /** Mensagem descritiva do erro. */
  message: string
  /** Código semântico padronizado do erro. */
  code?: string
  /** Código de status HTTP retornado pelo servidor. */
  status?: number
  /** Detalhes adicionais ou exceções de validação serializadas. */
  details?: unknown
}

/**
 * Exceção customizada emitida por requisições HTTP falhas no cliente.
 */
export class ApiError extends Error {
  /** Código numérico de status HTTP (ex: 400, 404, 500). */
  status: number
  /** Código de erro padronizado para tratamento programático na UI. */
  code?: string
  /** Informações suplementares enviadas pelo backend. */
  details?: unknown

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Opções de configuração para o cliente HTTP base.
 */
export type ApiClientOptions = Omit<RequestInit, 'body'> & {
  /** Corpo serializável em JSON a ser transmitido na requisição. */
  body?: unknown
}

/**
 * Recupera a URL base da API a partir de variáveis de ambiente do Vite ou fallback local.
 *
 * @returns String contendo a URL base do backend (ex: 'http://localhost:8000').
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
}

/**
 * Executa requisições HTTP retornando diretamente o objeto Response cru para cenários
 * como streams SSE, downloads de blob ou controle fino de buffers.
 *
 * @param endpoint - Rota relativa da API (ex: '/chat/stream').
 * @param options - Opções de headers, método HTTP e corpo da requisição.
 * @returns Promessa contendo a instância de Response do fetch.
 * @throws ApiError se a resposta HTTP não for bem-sucedida (ok === false).
 */
export async function apiFetch(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    let errorMessage = response.statusText
    let errorCode: string | undefined
    let errorDetails: unknown

    try {
      const errorJson = (await response.json()) as Partial<ApiErrorResponse>
      if (errorJson.message) {
        errorMessage = errorJson.message
      }
      errorCode = errorJson.code
      errorDetails = errorJson.details
    } catch {
      // Falha ao parsear JSON de erro; mantém fallback de statusText
    }

    throw new ApiError(
      errorMessage || `Request failed with status ${response.status}`,
      response.status,
      errorCode,
      errorDetails
    )
  }

  return response
}

/**
 * Cliente HTTP tipado para consumo de endpoints JSON padrão.
 *
 * @typeParam T - Tipo esperado do corpo de resposta desserializado.
 * @param endpoint - Rota relativa da API (ex: '/threads').
 * @param options - Opções de requisição HTTP.
 * @returns Promessa com o payload deserializado no tipo genérico T.
 * @throws ApiError se a chamada HTTP falhar.
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, options)

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}
