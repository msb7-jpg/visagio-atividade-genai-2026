import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Concatena e mescla classes Tailwind de forma inteligente resolvendo conflitos.
 *
 * @param inputs - Lista de classes condicionais, strings ou objetos de classe.
 * @returns String consolidada com as classes mescladas.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor numérico em moeda Real Brasileiro (BRL).
 *
 * @param value - Valor numérico a ser formatado.
 * @returns String formatada no padrão R$ 1.234,56.
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata um valor numérico em Dólares Americanos (USD).
 *
 * @param value - Valor numérico a ser formatado.
 * @returns String formatada no padrão $1,234.56.
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

/**
 * Formata um valor numérico decimal genérico no padrão pt-BR com separadores de milhar.
 *
 * @param value - Valor numérico a ser formatado.
 * @returns String formatada com pontos e vírgulas (ex: 1.234,5).
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}
