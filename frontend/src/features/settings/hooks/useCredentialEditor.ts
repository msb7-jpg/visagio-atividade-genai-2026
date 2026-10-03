import { useState } from 'react'

export function useCredentialEditor(
  initialProvider: string,
  savedProviders: string[]
) {
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
