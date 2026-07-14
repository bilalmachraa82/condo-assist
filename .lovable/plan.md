## Bug: toast "[object Object]" ao eliminar fornecedor

### Causa raiz
O `QueryClient` global em `src/App.tsx` (linhas 56-61) tem:

```ts
mutations: {
  onError: (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    showErrorToast(errorMessage);
  },
}
```

Alguns hooks de fornecedor (`useDeactivateSupplier`, `useForceDeleteSupplier` em `src/hooks/useSupplierDependencies.ts`, e `useUpdateSupplier` em `src/hooks/useSuppliers.ts`) fazem `throw error` do objecto PostgrestError do Supabase — **não** é uma instância de `Error`. `String({...})` produz `"[object Object]"`, que aparece como toast sem título nem descrição útil (exactamente o que se vê no screenshot).

O `SafeDeleteSupplierDialog` já tem um `extractMessage` local a fazer o trabalho certo, mas o toast global do React Query dispara **primeiro** (a mutation rejeita antes do `catch` do componente atingir o toast bonito), por isso o utilizador vê `[object Object]`.

### Correcção (só frontend, mínima)

1. **`src/utils/errorHandler.ts`** — adicionar `extractErrorMessage(e)` que cobre:
   - `Error` → `e.message`
   - Supabase `PostgrestError` → `e.message || e.details || e.hint || e.code`
   - string → tal e qual
   - objecto qualquer → `JSON.stringify` (nunca `"[object Object]"`)
   
   Exportar e usar em `showErrorToast` também (aceitar `unknown`).

2. **`src/App.tsx`** (linhas 56-61) — trocar o `onError` global para usar `extractErrorMessage(error)` em vez do `String(error)` actual. Ignorar se `error?.__silent === true` (para o dialog poder silenciar quando quiser mostrar toast próprio).

3. **`src/hooks/useSupplierDependencies.ts`** — nos três hooks (`useDeactivateSupplier`, `useForceDeleteSupplier`, `useCompleteDeleteSupplier`), embrulhar os throws em `throw new Error(extractErrorMessage(err))` para que a stack traga já a mensagem limpa. Mesmo tratamento em `useDeleteSupplier` / `useUpdateSupplier` de `src/hooks/useSuppliers.ts` para o mesmo problema noutros ecrãs.

4. **`src/components/suppliers/SafeDeleteSupplierDialog.tsx`** — substituir o `extractMessage` local por `extractErrorMessage` importado (dedup) e manter a lógica de detectar `23503`.

### Sem mudanças
- Nenhuma alteração de schema, RPC, edge function, RLS.
- Nenhuma alteração das tools MCP.
- Nenhuma alteração de UI/copy fora dos toasts de erro.

### Validação
- Abrir Fornecedores → tentar eliminar um fornecedor com dependências críticas → toast mostra mensagem legível (ex.: `has_critical_dependencies` ou o erro Postgres com HINT), nunca `[object Object]`.
- Confirmar via console: `error` recebido no `onError` global passa pelo extractor.
