# Reference: Feature-Driven Architecture (Vertical Slices), Anti-God Components, and Headless Hooks

This guide defines architectural boundaries, directory organization, and the Single Responsibility Principle (SRP) for components and hooks in React 19 and TypeScript.

---

## 1. Feature-Driven Architecture (Vertical Slices)

### 1.1 Semantic Directory Organization
Avoid unorganized horizontal folders (`components/`, `hooks/`, `utils/` containing dozens of unrelated files). Group code by feature or business domain:

```text
src/
├── features/
│   ├── chat/
│   │   ├── components/         # Subdivided by role: feed/, forms/, layout/, renderers/
│   │   │   ├── ChatFeed.tsx
│   │   │   ├── ChatMessageItem.tsx
│   │   │   └── ChatInputForm.tsx
│   │   ├── hooks/              # useChatStreamQuery, useSendMessageMutation
│   │   ├── types/              # DTOs and contracts exclusive to chat
│   │   └── utils/              # Feature-specific parsers or helpers
│   └── settings/
│       ├── components/
│       └── hooks/
└── components/                 # Reusable cross-cutting primitives
    ├── ui/                     # Design System (button, dialog, input, tooltip-card)
    └── animations/             # Declarative motion wrappers
```

### 1.2 Fundamental Rules for Imports and Types
1. **No Barrel Files (`index.ts`):** Creating `index.ts` files that merely aggregate and re-export components from a folder is strictly prohibited. They introduce hidden coupling, circular dependency cycles (`circular imports`), and hinder efficient tree-shaking in Vite. Import component files directly (e.g., `import { ChatFeed } from '@/features/chat/components/ChatFeed'`).
2. **Single Source of Truth (SSOT) for Types:** A module must never re-export types from another module. Each type or interface is exported exclusively from its source file.
3. **Co-location of Tests:** Unit and integration tests reside in the `__tests__/` directory within the same subfolder as the component they test (e.g., `components/ui/__tests__/button.test.tsx`).

---

## 2. Anti-God Components Guideline

A *God Component* takes on too many responsibilities: it manages network requests, orchestrates forms, renders multiple conditional modals, and spans hundreds of lines of JSX.

### 2.1 Logical Density Limit
- Components exceeding **150 to 200 lines** must be decomposed immediately.
- Identify sub-responsibilities and extract focused subcomponents:
  - Header/Action bar $\to$ `<FeatureActions />`
  - Item list $\to$ `<FeatureItemList />`
  - Confirmation modal window $\to$ `<FeatureConfirmDialog />`

---

## 3. Anti-God Hooks Guideline and Headless Decomposition

### 3.1 Prohibition of God Hooks
- Custom hooks that return 15 to 25 properties mixing mutations, remote data, visual states, and forms violate the SRP.
- Create specialized, granular hooks (e.g., `useThreadMessagesQuery`, `useDeleteThreadMutation`). If they need to communicate, compose them by passing explicit parameters.

### 3.2 The Headless Hook Pattern (Separating Logic vs. Visuals)
Decouple reactive state from the JSX render tree:

```tsx
// features/chat/hooks/useChatController.ts — Headless (Pure controller logic)
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

// features/chat/components/ChatView.tsx — Clean presentation
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
