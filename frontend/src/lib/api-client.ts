export interface ApiErrorResponse {
  message: string
  code?: string
  status?: number
  details?: unknown
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const url = `${baseUrl}${endpoint}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const response = await fetch(url, {
    ...options,
    headers
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

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}
