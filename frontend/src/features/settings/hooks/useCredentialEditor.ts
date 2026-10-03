import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Objeto de retorno do hook useCredentialEditor para controle de edição de chave secreta.
 */
export interface UseCredentialEditorResult {
  /** Se `true`, exibe o campo de texto livre para digitação de nova chave ao invés da máscara com asteriscos. */
  isEditingKey: boolean
  /** Altera diretamente o modo de edição da chave. */
  setIsEditingKey: Dispatch<SetStateAction<boolean>>
  /** Atualiza o estado de edição quando o provedor selecionado for alterado. */
  handleProviderChanged: (provider: string, isSaved: boolean) => void
}

/**
 * Hook para controlar a visibilidade e alternância entre credenciais mascaradas e edição de nova chave de API.
 *
 * @param initialProvider - Provedor inicialmente ativo no formulário.
 * @param savedProviders - Lista de provedores com credenciais já cadastradas no SQLite.
 * @returns Objeto com o estado de edição e callbacks de alternância.
 */
export function useCredentialEditor(
  initialProvider: string,
  savedProviders: string[]
): UseCredentialEditorResult {
  const [isEditingKey, setIsEditingKey] = useState<boolean>(
    !savedProviders.includes(initialProvider)
  )

  const handleProviderChanged = (_provider: string, isSaved: boolean) => {
    setIsEditingKey(!isSaved)
  }

  return {
    isEditingKey,
    setIsEditingKey,
    handleProviderChanged
  }
}
