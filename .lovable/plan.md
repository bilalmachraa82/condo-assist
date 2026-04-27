# Bugs reportados no WhatsApp — Plano de resolução

## O que o cliente disse

A imagem mostra **dois problemas**:

1. **Impressão de actas** — *"Cada prédio teria que sair numa folha apenas"* (atualmente vários prédios partilham a mesma folha A4).
2. **Eliminar prédio** — botão devolve um toast de erro e o cliente vê algo como `[object Object]` em vez de uma mensagem útil.

---

## Diagnóstico (já confirmado)

### Bug 1 — PDF de actas

Em `AssemblyPDFExportButton.tsx`, cada bloco de prédio tem `page-break-inside: avoid` mas **não tem `page-break-before`**. O browser empilha vários prédios na mesma folha sempre que cabem.

### Bug 2 — Eliminar prédio

Inspecionei a base de dados:

- O edifício **121 (Cond. Rua Beatriz Ângelo, Nº 10)** tem **7 assistências** + **1 acta** ligadas.
- As FKs `assistances.building_id` e `assembly_items.building_id` **não têm `ON DELETE CASCADE`** → PostgreSQL devolve erro `23503 foreign_key_violation`.
- O `catch` em `Edificios.tsx` mostra "Erro ao eliminar edifício. Tente novamente." mas **algures** o objeto de erro está a ser convertido em string e aparece `[object Object]` (provavelmente toast duplicado, ou o `useDeleteBuilding` faz `throw error` sem `.message`).
- UX: o card "7 Total / 0 Abertas" leva o cliente a achar que pode eliminar, e o sistema bloqueia sem explicar porquê. Não devemos eliminar registos críticos em cascade — o histórico de assistências tem de ser preservado.

---

## Resolução

### Fix 1 — 1 prédio = 1 folha A4

Ficheiro: `src/components/assembly/AssemblyPDFExportButton.tsx`

CSS:

```css
.building-section {
  page-break-before: always;   /* nova folha por prédio */
  break-before: page;
  page-break-inside: avoid;
  break-inside: avoid;
}
.building-section:first-of-type {
  page-break-before: auto;     /* primeiro prédio segue a capa */
  break-before: auto;
}
```

### Fix 2 — Eliminação segura, com mensagens claras

**2a. Mensagem de erro real no toast** (`Edificios.tsx`):

```ts
catch (error: any) {
  const msg = error?.code === '23503'
    ? 'Não é possível eliminar: o prédio tem assistências ou actas associadas. Use "Desativar" para preservar o histórico.'
    : (error?.message ?? 'Erro desconhecido ao eliminar.');
  toast({ title: 'Erro', description: msg, variant: 'destructive' });
}
```

**2b. Pré-validação antes do diálogo de confirmação**:

Criar `useBuildingDependencies(buildingId)` que conta `assistances` + `assembly_items` + `condominium_contacts` ligados.

No `AlertDialog` de confirmação, mostrar:
- Lista das dependências encontradas.
- Botão **"Desativar prédio"** (set `is_active=false`) — sempre disponível, recomendado.
- Botão **"Eliminar permanentemente"** — só ativo se 0 assistências e 0 actas.

**2c. NÃO mexer nas FKs** (não introduzir CASCADE em `assistances`/`assembly_items` — perda de histórico).

---

## Esforço

| Fix | Esforço | Risco |
|---|---|---|
| 1 — CSS PDF | 5 min | nenhum |
| 2a — toast com mensagem real | 10 min | nenhum |
| 2b — diálogo seguro com dependências | 30 min | baixo |

**Total: ~45 min.** Resolve os dois pontos do WhatsApp e melhora a gestão de prédios sem risco de perder histórico.

---

Aprova para eu implementar?