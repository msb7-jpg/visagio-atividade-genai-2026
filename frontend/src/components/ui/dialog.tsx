import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from '@phosphor-icons/react'
import * as React from 'react'

/**
 * Componente raiz de gerenciamento de estado e contexto para diálogos modais.
 *
 * @param props - Propriedades nativas do DialogPrimitive.Root.
 * @returns Elemento JSX do container do diálogo.
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props): React.JSX.Element {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * Gatilho de abertura do diálogo modal associado ao evento de clique.
 *
 * @param props - Propriedades nativas do DialogPrimitive.Trigger.
 * @returns Elemento JSX do gatilho.
 */
function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props): React.JSX.Element {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/**
 * Portal para renderização do modal no final do body do documento HTML.
 *
 * @param props - Propriedades nativas do DialogPrimitive.Portal.
 * @returns Elemento JSX do portal.
 */
function DialogPortal({ ...props }: DialogPrimitive.Portal.Props): React.JSX.Element {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/**
 * Elemento interativo para fechar o diálogo modal.
 *
 * @param props - Propriedades nativas do DialogPrimitive.Close.
 * @returns Elemento JSX de fechamento.
 */
function DialogClose({ ...props }: DialogPrimitive.Close.Props): React.JSX.Element {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/**
 * Pano de fundo escurecido com desfoque (backdrop) para o diálogo modal.
 *
 * @param props - Propriedades nativas do backdrop.
 * @returns Elemento JSX da camada de sobreposição.
 */
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className
      )}
      {...props}
    />
  )
}

/**
 * Painel de conteúdo centralizado do diálogo modal com animações de zoom e fade.
 *
 * @param props - Propriedades contendo conteúdo, classes e botão de fechar.
 * @returns Elemento JSX do popup do diálogo.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}): React.JSX.Element {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-none bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/**
 * Cabeçalho do diálogo para abrigar o título e a descrição.
 *
 * @param props - Propriedades div HTML.
 * @returns Elemento JSX do cabeçalho.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1 text-left', className)}
      {...props}
    />
  )
}

/**
 * Rodapé do diálogo para abrigar botões de ação e cancelamento.
 *
 * @param props - Propriedades div HTML.
 * @returns Elemento JSX do rodapé.
 */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}): React.JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

/**
 * Título semântico com tipografia destacada para acessibilidade do diálogo.
 *
 * @param props - Propriedades nativas do DialogPrimitive.Title.
 * @returns Elemento JSX do título.
 */
function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-sm font-medium', className)}
      {...props}
    />
  )
}

/**
 * Descrição textual de contexto e instruções do diálogo para leitores de tela.
 *
 * @param props - Propriedades nativas do DialogPrimitive.Description.
 * @returns Elemento JSX da descrição.
 */
function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
