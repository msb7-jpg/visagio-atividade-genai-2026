import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('AlertDialog Component', () => {
  it('renderiza o diálogo quando aberto e aciona callbacks de ação e cancelamento', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interromper Sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente interromper o streaming atual?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Interromper Sessão')).toBeInTheDocument()
    expect(
      screen.getByText('Deseja realmente interromper o streaming atual?')
    ).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /confirmar/i })
    fireEvent.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('abre o diálogo a partir do AlertDialogTrigger', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger render={<button type="button">Abrir Diálogo</button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Diálogo Aberto</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.queryByText('Diálogo Aberto')).not.toBeInTheDocument()

    const triggerButton = screen.getByRole('button', { name: /abrir diálogo/i })
    fireEvent.click(triggerButton)

    expect(screen.getByText('Diálogo Aberto')).toBeInTheDocument()
  })
})
