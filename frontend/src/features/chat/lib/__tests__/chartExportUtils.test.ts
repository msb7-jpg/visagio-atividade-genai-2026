import {
  copyChartToClipboard,
  downloadChartAsPng,
  getChartDataUri,
  sanitizeChartFilename
} from '@/features/chat/lib/chartExportUtils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('chartExportUtils', () => {
  describe('sanitizeChartFilename', () => {
    it('normaliza títulos com acentuação e caracteres especiais', () => {
      expect(sanitizeChartFilename('Top 10 Filmes com Maior Receita (R$)')).toBe(
        'top-10-filmes-com-maior-receita-r'
      )
    })

    it('retorna fallback quando o título for vazio ou indefinido', () => {
      expect(sanitizeChartFilename('')).toBe('cinedata-grafico')
      expect(sanitizeChartFilename(undefined)).toBe('cinedata-grafico')
    })
  })

  describe('downloadChartAsPng', () => {
    let appendChildSpy: ReturnType<typeof vi.spyOn>
    let removeChildSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      appendChildSpy = vi.spyOn(document.body, 'appendChild')
      removeChildSpy = vi.spyOn(document.body, 'removeChild')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('cria link de download e dispara clique com nome formatado', () => {
      const mockCanvas = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockImage')
      } as unknown as HTMLCanvasElement

      downloadChartAsPng(mockCanvas, 'Meu Gráfico')

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 1.0)
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
    })
  })

  describe('getChartDataUri', () => {
    it('retorna a representação base64 correta', () => {
      const mockCanvas = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,12345')
      } as unknown as HTMLCanvasElement

      expect(getChartDataUri(mockCanvas)).toBe('data:image/png;base64,12345')
    })
  })

  describe('copyChartToClipboard', () => {
    it('retorna falso caso navigator.clipboard não esteja disponível', async () => {
      const originalClipboard = navigator.clipboard
      // @ts-expect-error Mock para simular ausência
      delete navigator.clipboard

      const mockCanvas = {} as HTMLCanvasElement
      const result = await copyChartToClipboard(mockCanvas)

      expect(result).toBe(false)
      // Restaura
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true
      })
    })
  })
})
