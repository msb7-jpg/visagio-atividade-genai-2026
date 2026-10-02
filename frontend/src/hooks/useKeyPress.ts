import { useEventListener } from "@reactuses/core"

/**
 * Registers a keydown listener for a specific key and invokes the callback when it matches.
 *
 * @param targetKey - The keyboard key to listen for.
 * @param callback - The function to call when the target key is pressed.
 */
export const useKeyPress = (targetKey: string, callback: () => void) => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === targetKey) {
      callback()
    }
  }

  useEventListener('keydown', handleKeyPress)
}
