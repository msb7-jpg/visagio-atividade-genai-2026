# CineData Analytics — Referências e Especificações de UX & Chat

Este documento consolida os requisitos específicos de experiência do usuário (UX) observados para a interface conversacional, detalhando a identidade visual do agente, a navegação lateral por scroll spy e os padrões de renderização de blocos.

---

## 1. Avatar e Identidade Visual do Agente (PFP - Profile Picture)

O agente atua como um parceiro analítico inteligente e possui sua própria identidade visual na conversa, espelhando o formato de um usuário participante:

* **Posicionamento:** Alinhado à esquerda na mensagem do assistente, em oposição às mensagens do usuário (ou no cabeçalho do card de resposta).
* **Identidade Visual:**
  * **Ícone Central:** Ícone vetorial com tema de inteligência cinematográfica (ex: `Sparkles`, `Bot` ou claquete analítica via Lucide).
  * **Superfície & Glow:** Círculo ou squircle com fundo `#1B202B`, borda sutil `1px solid rgba(255, 255, 255, 0.1)` e halo/glow interno suave (`box-shadow: 0 0 12px rgba(255, 94, 43, 0.25)`).
  * **Indicador de Status (Live Badge):** Mini badge no canto inferior do avatar:
    * 🟢 *Verde / Pulsando:* Agente gerando resposta ou executando nó do grafo em tempo real.
    * ⚪ *Neutro / Estático:* Agente em prontidão para o próximo prompt.
* **Componente:** `AgentAvatar.tsx`.

---

## 2. Histórico Lateral Direito com Scroll Spy (Conversation Mini-Map)

Ao lado direito do feed de mensagens principal, o usuário tem à disposição uma **timeline vertical contextual** que atua como sumário da conversa ativa:

* **Objetivo:** Permitir navegação rápida e orientação espacial em threads com múltiplas perguntas analíticas extensas (gráficos, tabelas, consultas).
* **Comportamento (Scroll Spy):**
  * À medida que o usuário rola o chat para cima ou para baixo, o item da timeline correspondente à mensagem visível no viewport é destacado (**highlighted** com a cor de acento `#FF5E2B` ou gradiente âmbar e texto branco `#F3F4F6`).
  * Os itens que não estão em foco permanecem translúcidos (`text-[#9CA3AF]` ou opacidade `0.5`).
  * **Interatividade:** Clicar em qualquer pílula ou nó da timeline realiza scroll suave (`scrollIntoView({ behavior: 'smooth' })`) direto para aquela pergunta/resposta.
* **Conteúdo de cada nó na timeline:**
  * Número do turno ou timestamp.
  * Resumo curto da pergunta (ex: *"Top 10 Filmes por Lucro"*, *"Margem Sci-Fi 2024"*).
  * Tag de tipo de resposta gerada (ex: `[SQL]`, `[Chart]`, `[RAG]`).
* **Componente:** `TimelineScrollSpy.tsx`.

---

## 3. Estrutura Hierárquica dos Blocos de Mensagem (Polymorphic Message)

Uma mensagem do assistente organiza os diferentes tipos de dados em uma hierarquia visual limpa e escaneável:

1. **Cabeçalho da Mensagem:** `AgentAvatar` + Nome ("CineData Agent") + Timestamp.
2. **Trilha de Execução Dinâmica (`NodeStepper`):**
   * Chips sequenciais exibindo os nós percorridos pelo LangGraph com duração em ms (ex: `[Intenção] ➔ [SQL Gen] ➔ [SQLite (14ms)] ➔ [Sintetizador]`).
3. **Inspecionador de Raciocínio (`ThoughtInspector` - Accordion Recolhido):**
   * Contém o raciocínio intermediário e a query SQL pura.
4. **Bloco de Código SQL com Shiki (`SqlCodeBlock`):**
   * Syntax highlighting fiel ao tema dark (grammars TextMate).
   * Numeração de linhas, badge `Read-Only (cinerocket.db)` e botão `Copiar SQL` com feedback visual de 2s.
5. **Resposta Executiva em Markdown (`MarkdownRenderer`):**
   * `react-markdown` + `remark-gfm` com classes `@tailwindcss/typography` (`prose prose-invert`).
   * Tabelas inline, ênfases, listas ordenadas e links destacados.
6. **Visualização de Dados (Gráfico Chart.js - `ChartRenderer`):**
   * Renderizado quando o payload declarativo `ChartJsConfigDTO` for emitido pelo agente.
7. **Tabela Analítica Paginada (`TableRenderer`):**
   * Registros brutos do SQLite exibidos com ordenação por coluna e botão de exportação `CSV` / `JSON`.
