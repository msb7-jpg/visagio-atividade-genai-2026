export const settingsQueryKeys = {
  all: ['settings'] as const,
  provider: () => [...settingsQueryKeys.all, 'provider'] as const
}
