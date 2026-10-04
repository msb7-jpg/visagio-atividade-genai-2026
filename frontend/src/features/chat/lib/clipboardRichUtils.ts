import { getChartDataUri } from './chartExportUtils'

/**
 * Utilitários para formatação e cópia de conversas enriquecidas com gráficos embutidos em Data URI.
 */

/**
 * Substitui marcadores de bloco de gráfico (formato 'chart') no texto Markdown pela representação de imagem com Data URI inline.
 *
 * @param content - Conteúdo textual em Markdown original da mensagem.
 * @param dataUri - String codificada base64 da imagem gerada pelo canvas.
 * @param title - Título descritivo do gráfico.
 * @returns Texto Markdown contendo a imagem embutida.
 */
export function injectChartDataUriIntoMarkdown(
  content: string,
  dataUri: string,
  title = 'Visualização Gráfica'
): string {
  const chartImageMarkdown = `\n\n![${title}](${dataUri})\n\n`
  const chartCodeBlockRegex = /```chart[\s\S]*?```/i

  if (chartCodeBlockRegex.test(content)) {
    return content.replace(chartCodeBlockRegex, chartImageMarkdown.trim())
  }

  return `${content.trim()}${chartImageMarkdown}`
}

/**
 * Monta representação HTML básica contendo o texto e a tag de imagem com o Data URI.
 *
 * @param plainText - Texto da mensagem em formato legível.
 * @param dataUri - Data URI base64 da imagem.
 * @param title - Título descritivo da imagem.
 * @returns String contendo HTML rico para inserção no clipboard.
 */
export function buildHtmlWithEmbeddedChart(
  plainText: string,
  dataUri: string,
  title = 'Visualização Gráfica'
): string {
  const sanitizedText = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />')

  return `<div><p>${sanitizedText}</p><p><img src="${dataUri}" alt="${title}" style="max-width: 100%; border-radius: 8px;" /></p></div>`
}

/**
 * Realiza a cópia da mensagem para a Área de Transferência, embutindo o gráfico como imagem inline se houver canvas.
 *
 * @param content - Texto puro da resposta a ser copiado.
 * @param canvasElement - Elemento canvas opcional contendo o gráfico da mensagem.
 * @param chartTitle - Título semântico opcional do gráfico.
 * @returns Promise booleana indicando sucesso na cópia.
 */
export async function copyMessageWithChart(
  content: string,
  canvasElement?: HTMLCanvasElement | null,
  chartTitle?: string
): Promise<boolean> {
  if (!navigator.clipboard) {
    return false
  }

  // Caso não haja elemento de gráfico na mensagem, cópia padrão de texto puro
  if (!canvasElement) {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch {
      return false
    }
  }

  try {
    const dataUri = getChartDataUri(canvasElement)
    const effectiveTitle = chartTitle || 'Gráfico CineData'
    const markdownWithImage = injectChartDataUriIntoMarkdown(content, dataUri, effectiveTitle)
    const htmlWithImage = buildHtmlWithEmbeddedChart(content, dataUri, effectiveTitle)

    if (typeof ClipboardItem !== 'undefined') {
      const textBlob = new Blob([markdownWithImage], { type: 'text/plain' })
      const htmlBlob = new Blob([htmlWithImage], { type: 'text/html' })

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob
        })
      ])
      return true
    }

    await navigator.clipboard.writeText(markdownWithImage)
    return true
  } catch {
    // Fallback seguro para texto plano caso o clipboard complexo seja bloqueado
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch {
      return false
    }
  }
}
