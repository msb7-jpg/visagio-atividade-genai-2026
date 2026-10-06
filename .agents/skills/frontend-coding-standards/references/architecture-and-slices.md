# Referência: Arquitetura Orientada a Features (Vertical Slices), Anti-God Components e Headless Hooks

Este guia estabelece os limites arquiteturais, a organização de diretórios e o princípio da responsabilidade única (SRP) para componentes e hooks em React 19 e TypeScript.

---

## 1. Arquitetura Orientada a Features (Vertical Slices)

### 1.1 Organização Semântica de Diretórios
Abandone pastas horizontais desorganizadas (`components/`, `hooks/`, `utils/` contendo dezenas de arquivos aleatórios). Agrupe o código por funcionalidade ou domínio de negócio:

```text
src/
├── features/
│   ├── chat/
│   │   ├── components/         # Subdividido por papel: feed/, forms/, layout/, renderers/
│   │   │   ├── ChatFeed.tsx
│   │   │   ├── ChatMessageItem.tsx
│   │   │   └── ChatInputForm.tsx
│   │   ├── hooks/              # useChatStreamQuery, useSendMessageMutation
│   │   ├── types/              # DTOs e contratos exclusivos do chat
│   │   └── utils/              # Parsers ou helpers específicos da feature
│   └── settings/
│       ├── components/
│       └── hooks/
└── components/                 # Primitivas transversais reutilizáveis
    ├── ui/                     # Design System (button, dialog, input, tooltip-card)
    └── animations/             # Wrappers declarativos de motion
```

### 1.2 Regras Fundamentais de Importação e Tipos
1. **Sem Barrel Files (`index.ts`):** É expressamente proibido criar arquivos `index.ts` que apenas agregam e re-exportam componentes de uma pasta. Eles geram acoplamento oculto, ciclos de dependência (`circular imports`) e impedem o tree-shaking eficiente do Vite. Importe diretamente o arquivo do componente (ex: `import { ChatFeed } from '@/features/chat/components/ChatFeed'`).
2. **Single Source of Truth (SSOT) para Tipos:** Um módulo nunca re-exporta tipos de outro módulo. Cada tipo ou interface é exportado exclusivamente do seu arquivo de origem.
3. **Co-localização de Testes:** Testes unitários e de integração residem no diretório `__tests__/` na mesma subpasta do componente que testam (ex: `components/ui/__tests__/button.test.tsx`).

---

## 2. Diretriz Anti-God Components

Um *God Component* acumula responsabilidades demais: gerencia chamadas de rede, orquestra formulários, renderiza múltiplos modais condicionais e possui centenas de linhas de JSX.

### 2.1 Limite de Densidade Lógica
- Componentes com **mais de 150 a 200 linhas** devem ser decompostos imediatamente.
- Identifique sub-responsabilidades e extraia subcomponentes focados:
  - Header/Barra de ações $\to$ `<FeatureActions />`
  - Lista de itens $\to$ `<FeatureItemList />`
  - Janela modal de confirmação $\to$ `<FeatureConfirmDialog />`

---

## 3. Diretriz Anti-God Hooks e Decomposição Headless

### 3.1 Proibição de God Hooks
- Hooks customizados que retornam 15 a 25 propriedades misturando mutações, dados remotos, estados visuais e formulários violam o SRP.
- Crie hooks especialistas e granulares (ex: `useThreadMessagesQuery`, `useDeleteThreadMutation`). Se eles precisarem se comunicar, componha-os passando parâmetros explícitos.

### 3.2 O Padrão Headless Hook (Separação Lógica vs. Visual)
Separe o estado reativo da árvore de renderização JSX:

```tsx
// features/chat/hooks/useChatController.ts — Headless (Pura lógica de controle)
export function useChatController() {
  const { data: messages, isLoading } = useMessagesQuery();
  const sendMutation = useSendMessageMutation();
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ content: inputText });
    setInputText('');
  };

  return {
    messages,
    isLoading,
    inputText,
    setInputText,
    handleSend,
    isSubmitting: sendMutation.isPending,
  };
}

// features/chat/components/ChatView.tsx — Apresentação limpa
export function ChatView() {
  const { messages, isLoading, inputText, setInputText, handleSend, isSubmitting } =
    useChatController();

  if (isLoading) return <ChatSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <MessageList messages={messages} />
      <InputBar
        value={inputText}
        onChange={setInputText}
        onSubmit={handleSend}
        disabled={isSubmitting}
      />
    </div>
  );
}
```
