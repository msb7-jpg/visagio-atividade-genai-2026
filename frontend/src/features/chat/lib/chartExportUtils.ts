/**
 * Utilitários puros para download, cópia e manipulação de imagens a partir de elementos canvas do Chart.js.
 */

/**
 * Sanitiza um título de gráfico para uso como nome de arquivo válido no sistema de arquivos.
 *
 * @param title - Título semântico original do gráfico.
 * @returns String normalizada com hífens e sem caracteres proibidos.
 */
export function sanitizeChartFilename(title?: string): string {
  if (!title || title.trim().length === 0) {
    return 'cinedata-grafico'
  }

  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Dispara o download direto do gráfico renderizado no canvas como imagem PNG em alta resolução.
 *
 * @param canvas - Elemento canvas HTML contendo o gráfico do Chart.js.
 * @param title - Título descritivo para nomeação do arquivo gerado.
 */
export function downloadChartAsPng(canvas: HTMLCanvasElement, title?: string): void {
  const dataUrl = canvas.toDataURL('image/png', 1.0)
  const filename = `${sanitizeChartFilename(title)}.png`

  const downloadLink = document.createElement('a')
  downloadLink.href = dataUrl
  downloadLink.download = filename
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
}

/**
 * Converte o canvas para Blob de imagem PNG e o grava na Área de Transferência nativa do sistema.
 *
 * @param canvas - Elemento canvas HTML contendo o gráfico.
 * @returns Promise booleana indicando se a cópia foi executada com sucesso.
 */
export async function copyChartToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false
  }

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false)
        return
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
        resolve(true)
      } catch {
        resolve(false)
      }
    }, 'image/png')
  })
}

/**
 * Extrai a representação Data URI em base64 do canvas para inclusão inline em payloads.
 *
 * @param canvas - Elemento canvas HTML contendo o gráfico.
 * @returns String contendo o Data URI base64 codificado.
 */
export function getChartDataUri(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png', 1.0)
}
