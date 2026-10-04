import {
  AmbientGlow,
  CollapsibleMotion,
  DirectionalSlide,
  FloatingItem,
  SlidingIndicator,
  StaggerItem
} from '@/components/animations'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Camada de Primitivas Atômicas de Animação Motion', () => {
  describe('AmbientGlow', () => {
    it('renderiza o elemento de iluminação de fundo com atributos acessíveis', () => {
      render(<AmbientGlow size="lg" />)
      const glow = screen.getByTestId('ambient-glow')
      expect(glow).toBeInTheDocument()
      expect(glow).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('FloatingItem', () => {
    it('envolve o elemento filho no wrapper de levitação física', () => {
      render(
        <FloatingItem amplitude={8}>
          <span>Elemento Flutuante</span>
        </FloatingItem>
      )
      expect(screen.getByTestId('floating-item')).toBeInTheDocument()
      expect(screen.getByText('Elemento Flutuante')).toBeInTheDocument()
    })
  })

  describe('DirectionalSlide', () => {
    it('renderiza o conteúdo sob a chave ativa correspondente', () => {
      render(
        <DirectionalSlide activeKey="tab-1" direction="horizontal">
          <div>Conteúdo da Aba 1</div>
        </DirectionalSlide>
      )
      expect(screen.getByText('Conteúdo da Aba 1')).toBeInTheDocument()
    })
  })

  describe('SlidingIndicator', () => {
    it('renderiza o indicador com atributos de layout compartilhados', () => {
      render(<SlidingIndicator layoutId="activeTabPill" />)
      const indicator = screen.getByTestId('sliding-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('CollapsibleMotion', () => {
    it('renderiza o conteúdo quando isExpanded for verdadeiro', () => {
      render(
        <CollapsibleMotion isExpanded>
          <div>Conteúdo Expandido</div>
        </CollapsibleMotion>
      )
      expect(screen.getByText('Conteúdo Expandido')).toBeInTheDocument()
    })

    it('não renderiza o conteúdo quando isExpanded for falso', () => {
      render(
        <CollapsibleMotion isExpanded={false}>
          <div>Conteúdo Recolhido</div>
        </CollapsibleMotion>
      )
      expect(screen.queryByText('Conteúdo Recolhido')).not.toBeInTheDocument()
    })
  })

  describe('StaggerItem', () => {
    it('renderiza o item com wrapper acelerado por hardware', () => {
      render(
        <StaggerItem delay={0.1}>
          <span>Passo Sequencial</span>
        </StaggerItem>
      )
      expect(screen.getByTestId('stagger-item')).toBeInTheDocument()
      expect(screen.getByText('Passo Sequencial')).toBeInTheDocument()
    })
  })
})
