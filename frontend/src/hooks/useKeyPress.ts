import { useEventListener } from '@reactuses/core'

/**
 * Registra um ouvinte de evento keydown para uma tecla específica e executa o callback ao ser pressionada.
 *
 * @param targetKey - Identificador da tecla do teclado (ex: 'Escape', 'Enter').
 * @param callback - Função a ser executada quando a tecla alvo for acionada.
 */
export function useKeyPress(targetKey: string, callback: () => void): void {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === targetKey) {
      callback()
    }
  }

  useEventListener('keydown', handleKeyPress)
}
