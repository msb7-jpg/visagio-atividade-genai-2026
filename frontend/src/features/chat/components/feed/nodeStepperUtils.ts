import { STEP_STATUS, type AgentStepItem } from '@/features/chat/types/chat.types'

/**
 * Normaliza e sintetiza os passos de execução do agente para exibição no stepper.
 *
 * Converte passos incompletos em erro quando o stream é finalizado prematuramente
 * e adiciona passos simulados em loading durante a transmissão ativa.
 *
 * @param steps - Lista de etapas do agente recebidas via SSE.
 * @param isStreaming - Flag indicando se a resposta do agente ainda está em streaming ativo.
 * @returns Lista normalizada de passos prontos para renderização visual.
 */
export function resolveDisplaySteps(
  steps: AgentStepItem[],
  isStreaming: boolean
): AgentStepItem[] {
  let displaySteps = [...steps]

  // Se o streaming foi interrompido (ou a página foi recarregada) e algum passo ficou pendente ou ativo
  if (!isStreaming && displaySteps.length > 0) {
    displaySteps = displaySteps.map((stepItem, idx) => {
      if (stepItem.status === STEP_STATUS.ACTIVE || stepItem.status === STEP_STATUS.PENDING) {
        return {
          ...stepItem,
          status: STEP_STATUS.ERROR,
          label: idx === displaySteps.length - 1 && !stepItem.label.includes('interromp')
            ? `${stepItem.label} (interrompido)`
            : stepItem.label
        }
      }
      return stepItem
    })
  }

  // Se estiver em streaming e ainda não recebemos nenhum passo do backend
  if (isStreaming && displaySteps.length === 0) {
    displaySteps.push({
      step: 'initial-step',
      label: 'Iniciando raciocínio analítico...',
      status: STEP_STATUS.ACTIVE
    })
  } else if (isStreaming && displaySteps.length > 0) {
    const lastStep = displaySteps[displaySteps.length - 1]
    if (lastStep.status === STEP_STATUS.DONE) {
      displaySteps.push({
        step: 'next-pending-step',
        label: 'Carregando...',
        status: STEP_STATUS.ACTIVE
      })
    }
  }

  // Fencing defensivo (UI-level): deduplica etapas de interrupção para evitar repetição visual
  let hasInterrupted = false
  displaySteps = displaySteps.filter((stepItem) => {
    const isInterruptedStep =
      stepItem.step === 'interrupted' ||
      stepItem.label.toLowerCase().includes('interrompid')

    if (isInterruptedStep) {
      if (hasInterrupted) {
        return false
      }
      hasInterrupted = true
    }
    return true
  })

  return displaySteps
}
