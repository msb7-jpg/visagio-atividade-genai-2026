import {
  buildHtmlWithEmbeddedChart,
  copyMessageWithChart,
  injectChartDataUriIntoMarkdown
} from '@/features/chat/lib/clipboardRichUtils'
import { describe, expect, it, vi } from 'vitest'

describe('clipboardRichUtils', () => {
  const sampleMarkdown =
    '### Análise de Receita\n\n```chart\n```\n\nConforme demonstrado acima, o faturamento foi de R$ 10M.'
  const sampleDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk'

  describe('injectChartDataUriIntoMarkdown', () => {
    it('substitui o bloco ```chart``` pelo link de imagem com Data URI', () => {
      const result = injectChartDataUriIntoMarkdown(
        sampleMarkdown,
        sampleDataUri,
        'Ranking de Produtoras'
      )

      expect(result).not.toContain('```chart')
      expect(result).toContain('![Ranking de Produtoras](data:image/png;base64,')
    })

    it('anexa a imagem no final do texto se o marcador ```chart``` não existir', () => {
      const plainText = 'Esta é uma análise pura.'
      const result = injectChartDataUriIntoMarkdown(plainText, sampleDataUri, 'Gráfico Extra')

      expect(result).toContain('Esta é uma análise pura.')
      expect(result).toContain('![Gráfico Extra](data:image/png;base64,')
    })
  })

  describe('buildHtmlWithEmbeddedChart', () => {
    it('gera HTML contendo a tag <img> com o data uri e o texto formatado', () => {
      const html = buildHtmlWithEmbeddedChart('Linha 1\nLinha 2', sampleDataUri, 'Meu Gráfico')

      expect(html).toContain('Linha 1<br />Linha 2')
      expect(html).toContain(`<img src="${sampleDataUri}" alt="Meu Gráfico"`)
    })
  })

  describe('copyMessageWithChart', () => {
    it('chama writeText quando não há canvas informado', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy
        }
      })

      const success = await copyMessageWithChart('Apenas texto', null)

      expect(success).toBe(true)
      expect(writeTextSpy).toHaveBeenCalledWith('Apenas texto')
    })
  })
})
