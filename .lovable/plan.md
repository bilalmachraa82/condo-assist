

## Análise do screenshot — 3 pedidos do cliente

### Pedido 1 — Remover (ou esconder) os cards de estatísticas no topo
> "Aqui não preciso destes estados. Podem sair"

Os 4 cards (Pendentes / Em Curso / Resolvidos / Total) ocupam espaço e o cliente não os usa nesta página.

**Solução:** remover o componente `<AssemblyStats />` da página `/assembly`. Os contadores continuam a aparecer nos chips de filtro e nos badges de cada prédio, por isso a informação não se perde.

---

### Pedido 2 — Espaço para escrever notas/informações por assunto
> "fiquei sem espaço para escrever informações. no lado direito em vez de ter aquilo (pode manter quantos assuntos) ter outro espaço para escrever só informações ou dentro de cada assunto como nas assistências."

Hoje cada linha tem: **Descrição | Categoria | Estado | Acções** — não sobra espaço para anotações inline. Já existe o campo `status_notes` na BD mas só é editável dentro do diálogo de detalhe.

**Solução — redesenho da linha de assunto:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Descrição do assunto……………………]  │  [● Estado ▾]   [✎] [🗑]            │
│ ─────────────────────────────────────────────────────────────────────  │
│ 📝 Notas/Informações: [campo de texto editável inline, multilinha]…   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Linha 1:** Descrição (mais larga, ocupa o espaço da antiga coluna Categoria), badge de Estado compacto + acções.
- **Linha 2:** Campo de notas editável **inline** (textarea com auto-save on blur, debounced) — gravado em `status_notes`.
- A coluna **Categoria** sai do header da tabela (já está visível no chip de filtros e no diálogo de detalhe). Opcionalmente: pequeno ícone colorido da categoria à esquerda da descrição (sem ocupar coluna).
- Mantém todas as funcionalidades: clicar na descrição abre o detalhe; o textarea é independente e não abre o detalhe ao clicar.
- Indicador visual subtil de "guardado" (✓ a fade-out) após auto-save.

**Header da tabela** passa a: `Assunto / Notas` | `Estado` | `Ações`.

---

### Pedido 3 — Imprimir assuntos por prédio (PDF)
> "lembrei-me dá para depois mandar imprimir estes assuntos por prédio? vamos precisar para o final de ano que imprimimos tudo para a Rita levar para as reuniões e ter tudo o que foi falado num ano e o que foi feito."

**Solução — exportação PDF:**

1. **Botão "Imprimir PDF"** no topo da página (junto a "Novo Assunto" / "Importar Excel"), com 2 modos:
   - **Por prédio individual:** botão pequeno no header de cada `AssemblyBuildingGroup` (ícone 🖨) → gera PDF só desse prédio.
   - **Geral (todos os prédios):** PDF mestre com índice + uma secção por prédio (cada prédio começa em página nova). Respeita os filtros activos (ano, categoria, estado).

2. **Estrutura do PDF** (seguindo o standard premium da app — `mem://style/premium-pdf-design-standard`):
   - Capa: logo Luvimg + "Seguimento de Actas — [Ano]" + data de emissão.
   - Por prédio: cabeçalho "**XXX — Morada**" + tabela de assuntos com colunas: `Descrição | Categoria | Estado | Notas/Seguimento`.
   - Resumo no fim de cada prédio: total / pendentes / em curso / resolvidos + barra de progresso.
   - Rodapé: nº de página, "Luvimg — geral@luvimg.com".

3. **Implementação:** novo componente `AssemblyListPDFTemplate.tsx` (espelhando `BuildingListPDFTemplate.tsx`) + botão `AssemblyPDFExportButton.tsx` usando `react-to-print` ou `html2pdf` (mesma stack já usada pela app).

---

## Resumo de ficheiros afectados

| Ficheiro | Mudança |
|---|---|
| `src/pages/Assembly.tsx` | Remover `<AssemblyStats/>` + adicionar botão "Imprimir PDF" |
| `src/components/assembly/AssemblyBuildingGroup.tsx` | Redesenhar linha (notas inline, sem coluna categoria) + ícone imprimir por prédio |
| `src/components/assembly/AssemblyStats.tsx` | Pode ser eliminado (já não usado) |
| `src/hooks/useAssemblyItems.ts` | Pequena mutation para auto-save de `status_notes` (debounced) |
| `src/components/assembly/AssemblyListPDFTemplate.tsx` | **Novo** — template do PDF agrupado por prédio |
| `src/components/assembly/AssemblyPDFExportButton.tsx` | **Novo** — botão de export (geral + por prédio) |

## Confirmação antes de avançar

Confirmas estas decisões?
1. Remover totalmente o componente de stats (em vez de só o esconder)?
2. Auto-save inline das notas (vs botão "Guardar" explícito por linha)?
3. PDF segue o mesmo design premium das assistências (logo + capa + rodapé)?

