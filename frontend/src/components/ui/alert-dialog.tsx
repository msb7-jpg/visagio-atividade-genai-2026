import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import * as React from 'react'

/**
 * Componente raiz de controle e estado do diálogo de alerta.
 *
 * @param props - Propriedades nativas do AlertDialogPrimitive.Root.
 * @returns Elemento JSX do container do diálogo.
 */
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props): React.JSX.Element {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

/**
 * Gatilho de abertura do diálogo de alerta.
 *
 * @param props - Propriedades nativas do AlertDialogPrimitive.Trigger.
 * @returns Elemento JSX do gatilho.
 */
function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

/**
 * Portal para renderização do diálogo de alerta no body do documento.
 *
 * @param props - Propriedades nativas do AlertDialogPrimitive.Portal.
 * @returns Elemento JSX do portal.
 */
function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

/**
 * Pano de fundo (backdrop) com desfoque e fade para o diálogo de alerta.
 *
 * @param props - Propriedades nativas do backdrop.
 * @returns Elemento JSX do overlay.
 */
function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/60 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className
      )}
      {...props}
    />
  )
}

/**
 * Painel central de conteúdo do diálogo de alerta com animações de zoom e escala.
 *
 * @param props - Propriedades contendo conteúdo, classes e tamanho.
 * @returns Elemento JSX do popup modal.
 */
function AlertDialogContent({
  className,
  size = 'default',
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: 'default' | 'sm'
}): React.JSX.Element {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          'group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-sidebar p-6 text-foreground shadow-2xl duration-150 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

/**
 * Cabeçalho do diálogo de alerta para título e descrição.
 *
 * @param props - Propriedades div HTML.
 * @returns Elemento JSX do cabeçalho.
 */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-left', className)}
      {...props}
    />
  )
}

/**
 * Rodapé do diálogo de alerta com ações de confirmação e cancelamento.
 *
 * @param props - Propriedades div HTML.
 * @returns Elemento JSX do rodapé.
 */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5 pt-2',
        className
      )}
      {...props}
    />
  )
}

/**
 * Elemento de mídia opcional para exibir ícone de destaque no cabeçalho do diálogo.
 *
 * @param props - Propriedades div HTML.
 * @returns Elemento JSX da mídia.
 */
function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        'mb-1 inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-primary',
        className
      )}
      {...props}
    />
  )
}

/**
 * Título semântico do diálogo de alerta.
 *
 * @param props - Propriedades nativas do AlertDialogPrimitive.Title.
 * @returns Elemento JSX do título.
 */
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-sm font-semibold text-foreground', className)}
      {...props}
    />
  )
}

/**
 * Descrição explicativa do diálogo de alerta.
 *
 * @param props - Propriedades nativas do AlertDialogPrimitive.Description.
 * @returns Elemento JSX da descrição.
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-xs leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

/**
 * Botão de confirmação de ação do diálogo de alerta.
 *
 * @param props - Propriedades do componente Button.
 * @returns Elemento JSX do botão de confirmação.
 */
function AlertDialogAction({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <Button
      data-slot="alert-dialog-action"
      variant={variant}
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * Botão de cancelamento e fechamento do diálogo de alerta.
 *
 * @param props - Propriedades de fechamento e estilo do botão.
 * @returns Elemento JSX do botão de cancelamento.
 */
function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger
}
