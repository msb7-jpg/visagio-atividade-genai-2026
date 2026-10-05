import { clsx, type ClassValue } from 'clsx'
import type React from 'react'
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
 * Trata eventos de teclado para elementos interativos acessíveis (Enter ou Espaço).
 *
 * @param event - Evento de teclado originado da interação.
 * @param callback - Função disparada ao acionar a tecla de seleção.
 */
export function handleKeyboardClick(
  event: React.KeyboardEvent,
  callback: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    callback()
  }
}
