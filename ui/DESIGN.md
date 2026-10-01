# MGC AI — Dark Design System & Guidelines

Este documento estabelece as diretrizes visuais e técnicas do sistema de design **MGC AI Dark**, derivado de uma interface moderna, orgânica e minimalista para produtos baseados em inteligência artificial.

---

## 1. Princípios de Design

1. **Simplicidade Orgânica (Sem Aspeto Artificial):** Evite sombras exageradas ou néons saturados sem propósito. Use superfícies em tons de cinza/azul escuro com bordas sutis de baixo contraste para criar profundidade natural.
2. **Foco no Conteúdo:** A interface atua como uma moldura neutra. A atenção do usuário deve ser direcionada para as interações centrais (como o campo de busca/prompt e os CTAs principais).
3. **Iconografia Neutra:** Por padrão, todos os ícones são monocromáticos e desprovidos de cor para manter o ambiente limpo e evitar distrações visuais desnecessárias.
4. **Tipografia Clara & Hierárquica:** Tipografia sans-serif geométrica com pesos bem definidos, espaçamento de linhas generoso e hierarquia visual nítida.

---

## 2. Paleta de Cores (Color Tokens)

### 2.1 Superfícies e Backgrounds (Dark Scale)
* **Background Principal (Canvas):** `#0E1217` (Escuro profundo, tom frio neutro)
* **Sidebar / Painel Lateral:** `#13171E` (Superfície secundária)
* **Card / Card Elevado:** `#1B202B` (Superfície interativa / container de inputs)
* **Hover / Estado Ativo de Superfície:** `#232936`
* **Borda Suave / Divisor:** `#282F3D` ou `rgba(255, 255, 255, 0.07)`

### 2.2 Tipografia & Textos
* **Text Primary (Títulos & Texto Forte):** `#F3F4F6` (Branco levemente suavizado)
* **Text Secondary (Subtítulos & Rótulos):** `#9CA3AF` (Cinza médio neutro)
* **Text Muted / Placeholders:** `#6B7280` (Cinza escuro desbotado)
* **Text Disabled:** `#4B5563`

### 2.3 Cores de Acento (Accents)
As cores de acento devem ser usadas de forma pontual e estratégica.

* **Primary Accent (Warm Orange):** `#FF5E2B` (botões de alta prioridade ou destaques da marca)
* **Primary Accent Hover:** `#E04D1C`
* **Secondary Accent (Glow/Orb):** Gradiante Suave `#00D2FF` -> `#3B82F6` (Exclusivo para elementos visuais de IA / Esfera central)
* **Badge Accent (Planos/Notificações):** `#2563EB` (Azul discreto para tags informativas)

---

## 3. Tipografia

### Font Family
* **Principal:** `Inter`, `SF Pro Display`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
* **Monospace (Código/Parâmetros):** `JetBrains Mono`, `Fira Code`, `monospace`

### Escala Tipográfica
| Nível | Tamanho | Peso | Line Height | Uso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `28px` (1.75rem) | SemiBold (600) | 1.2 | Pergunta Principal ("What can I help with?") |
| **Heading 1** | `20px` (1.25rem) | SemiBold (600) | 1.3 | Títulos de Seção / Modais |
| **Heading 2** | `16px` (1.0rem) | Medium (500) | 1.4 | Títulos de Cards / Seções Menores |
| **Body (Normal)** | `14px` (0.875rem) | Regular (400) | 1.5 | Texto principal de mensagens, conversas e inputs |
| **Body Small** | `13px` (0.8125rem) | Regular (400) | 1.4 | Itens de menu lateral, botões secundários |
| **Caption / Muted** | `11px` (0.6875rem) | Regular (400) | 1.4 | Disclaimer de rodapé, timestamps, labels secundários |

---

## 4. Iconografia

* **Biblioteca Sugerida:** `Lucide Icons` Estilo Outline.
* **Espessura da Borda (Stroke Width):** `1.5px` ou `1.75px` constante.
* **Cor Padrão:** Monocromática (`#9CA3AF`). Ícones **não** possuem cor individual por categoria por padrão.
* **Estado Hover/Ativo:** Mudança sutil para `#FFFFFF` ou para a cor de acento principal quando o botão/ação estiver selecionado.
* **Tamanhos Padrão:**
  * Pequeno (dentro de pills/chips): `14px` x `14px`
  * Médio (menu lateral / botões): `18px` x `18px`
  * Grande (ações destacadas): `20px` x `20px`

---

## 5. Componentes Principais

### 5.1 Menu Lateral (Sidebar)
* **Largura Fixed:** `240px` a `260px`
* **Estilo:** Sem borda vertical rígida; diferenciação apenas por cor de fundo (`#13171E` vs `#0E1217`).
* **Itens de Navegação:**
  * Padding: `8px 12px`
  * Raio da Borda: `8px`
  * Cor Padrão: Texto `#9CA3AF` + Ícone `#9CA3AF`
  * Hover: Background `#1B202B` + Texto `#FFFFFF`
* **Botão "New Chat":**
  * Fundo `#1B202B`, Borda `1px solid rgba(255,255,255,0.08)`
  * Ícone sutil à esquerda, alinhamento centralizado.

### 5.2 Card do Input de Prompt (Caixa de Pesquisa Central)
* **Background:** `#1B202B`
* **Borda:** `1px solid #282F3D`
* **Border Radius:** `16px`
* **Padding:** `16px`
* **Placeholder:** `#6B7280`, tamanho `14px`
* **Controles Integrados:**
  * Alinhados no rodapé do input.
  * Botões em formato "Pill/Chip" (Caso Existam).
  * Botão de ação principal: Pílula preenchida com a cor `#FF5E2B`, texto e ícone brancos.

### 5.3 Chips & Pills (Ações Secundárias / Sugestões)
* **Border Radius:** `9999px` (Totalmente arredondado)
* **Estilo Normal:**
  * Background: `transparent` ou `#13171E`
  * Borda: `1px solid #282F3D`
  * Texto: `#9CA3AF` (`13px`, Medium)
  * Hover: Borda `#4B5563`, Texto `#F3F4F6`
* **Estilo Preenchido (Ex: Voice CTA):**
  * Background: `#FF5E2B`
  * Borda: Nenhuma
  * Texto: `#FFFFFF` (`13px`, Medium)

### 5.4 Card Promocional / Upgrade (Banner Lateral)
* **Background:** `#1B202B` com gradiente interno muito sutil de sobreposição.
* **Borda:** `1px solid rgba(255,255,255,0.06)`
* **Border Radius:** `12px`
* **Badge Interno:** Ícone azul com fundo azul translúcido (`rgba(37, 99, 235, 0.15)`).

---

## 6. Layout, Espaçamento & Estrutura

### Raio de Arredondamento (Border Radius Scale)
* **Pequeno (Badges, Tooltips):** `6px`
* **Médio (Menus, Itens da Sidebar):** `8px`
* **Grande (Cards, Modais, Caixa de Input):** `16px`
* **Full (Pills, Botões Arredondados):** `9999px`

### Espaçamento (Padding & Margins)
* **Grid Base:** Sistema baseado em múltiplos de `4px` (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
* **Margem da Tela:** Mínimo de `24px` ao redor da área de conteúdo principal.

---

## 7. Animações e Micro-interações

* **Transição Padrão:** `all 0.2s ease-in-out` (Transições curtas e diretas para hover e estados ativos).
* **Feedback Touch/Clique:** Redução sutil de escala (`transform: scale(0.98)`) em botões principais ao clicar.
* **Elemento IA (Orb Central):** Animação sutil de pulso suave na opacidade ou rotação de gradiente muito lenta (4-6 segundos) para dar sensação de "vida", sem poluir visualmente a tela.

---

## 8. Considerações de Acessibilidade (a11y)

* **Contraste de Texto:** O texto principal (`#F3F4F6`) sobre o fundo (`#0E1217`) garante uma taxa de contraste superior a **12:1** (superando com folga a especificação WCAG AAA).
* **Estados de Foco (Focus States):** Qualquer elemento interativo focado via teclado deve exibir um anel de foco visível com tom neutro ou acentuado (`outline: 2px solid #3B82F6`, `outline-offset: 2px`).