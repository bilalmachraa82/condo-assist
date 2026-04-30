## Auditoria do menu Follow-up

Após rever `FollowUpDashboard.tsx`, `PendencyRemindersTab.tsx`, `FollowUps.tsx` e os hooks associados, identifiquei pontos de fricção concretos. Abaixo está o que está a confundir o admin, o que vou remover e o que vou melhorar.

### Problemas detectados (estado atual)

**Header e ações duplicadas**
- 3 botões no topo (`Disparar lembretes manuais`, `Processar Devidos`, `Processar Todos Agora`) sem hierarquia clara — o admin não sabe qual carregar.
- "Processar Todos Agora" é perigoso (envia tudo, ignorando agendamento) e está como botão secundário sem confirmação.
- Aba `Pendências email` tem um botão `Processar agora` separado, com lógica idêntica mas UI diferente.

**Cards de estatísticas pouco accionáveis**
- 4 cards estáticos (Total, Pendentes, Enviados, Falhados) sem possibilidade de clicar para filtrar.
- "Devidos agora" só existe na aba pendências — falta em assistências, embora o dado já exista (`stats.due_now`).

**Filtros e listas**
- Filtro de Tipo está dentro de um `<Card>` separado dos status tabs — duas zonas de filtragem desligadas.
- Não há barra de pesquisa por nº de assistência / fornecedor / edifício.
- Não há ordenação (mais antigos primeiro vs. mais urgentes).
- Sem paginação ou "carregar mais" — listas longas tornam-se ilegíveis.

**Cards de follow-up**
- Tentativa "1 de 3" aparece sempre, mesmo em itens enviados/cancelados (ruído).
- Em itens `sent`/`cancelled`/`failed` os botões Reagendar/Cancelar somem mas não aparece nenhuma alternativa (ex.: "Ver email enviado", "Reenviar").
- "Em atraso" e "Pendente" mostram-se em paralelo — visualmente redundante.
- Em assistências, falta link "Abrir assistência" (na aba pendências já existe "Abrir pendência").

**Cards "Por Tipo" / "Por Prioridade"**
- Apenas mostram contagem — não são filtros. Ocupam espaço sem ação.

**Inconsistências entre as duas abas**
- Aba "Assistências" tem cards de "Por Tipo / Por Prioridade", a aba "Pendências" não.
- Ações primárias usam estilos diferentes (variant `secondary` vs `default`).
- "Encaminhar a fornecedor" só aparece em manuais — bom, mas sem tooltip a explicar.

**Empty states fracos**
- "Nenhum follow-up encontrado" sem CTA. Não orienta o admin.

---

### Plano de melhorias

**1. Header unificado (em ambas as abas)**
- Título único: "Follow-ups e Lembretes" + subtítulo curto que muda por aba.
- Ação primária única: **`Processar agora`** (= modo `due`, o seguro) — mesmo botão nas duas abas.
- Mover `Processar Todos Agora` e `Disparar lembretes manuais` para um menu `…` (DropdownMenu) com:
  - "Forçar envio de todos (ignora agendamento)" + `AlertDialog` de confirmação a explicar consequências.
  - "Disparar varredura de lembretes manuais".

**2. Stat cards interactivos**
- Adicionar card "Devidos agora" também na aba assistências (dado já existe).
- Cards passam a ser **clicáveis** → aplicam o filtro de status correspondente (Pendentes → tab `pending`, Falhados → tab `failed`, etc.).
- Card activo ganha `ring-2 ring-primary` para feedback visual.
- "Em atraso" passa a contador destacado dentro do card "Pendentes" (badge vermelho), não card próprio.

**3. Remover cards "Por Tipo" / "Por Prioridade"**
- Substituir por **chips de filtro rápido** acima da lista (ex.: `Todos | Orçamento (3) | Confirmação (1) | Trabalho (5)`), que funcionam como filtros + mostram a contagem. Resolve dois problemas (espaço + acionabilidade).

**4. Barra de filtros consolidada**
- Linha única acima da lista: `[🔎 Pesquisar nº/edifício/fornecedor]  [Tipo ▾]  [Ordenar ▾: Mais urgentes / Mais antigos / Recentes]`.
- Status tabs ficam logo abaixo (mantém o padrão atual).
- Pesquisa local (client-side) sobre o array já carregado — sem alterar hooks.

**5. Cards de follow-up melhorados**
- Esconder "Tentativa X de Y" em itens `sent`/`cancelled` (só relevante para `pending`/`failed`).
- Substituir badge dupla "Pendente + Em atraso" por **"Em atraso"** sozinha quando aplicável (vermelha) — mais legível.
- Adicionar botão **"Abrir assistência"** (link para `/assistencias/:id`) em todos os cards da aba assistências, espelhando "Abrir pendência".
- Em itens `failed`: botão **"Tentar novamente"** (reusa `processFollowUps` com filtro por id; se hook não suporta, usar `rescheduleFollowUp` para `now()`).
- Tooltips nos botões de ícone (Reagendar, Cancelar, Encaminhar) com `<TooltipProvider>` já existente no projeto.

**6. Empty state com CTA**
- Quando não há resultados:
  - Se filtros ativos → "Sem resultados para estes filtros" + botão **"Limpar filtros"**.
  - Se realmente vazio → "Tudo em dia ✅. Não há follow-ups pendentes." + link "Criar pendência email" / "Ver assistências".

**7. Feedback visual durante ações**
- Botão `Processar agora`: ao terminar, mostrar `toast` com resumo ("3 enviados, 1 falhado") em vez do toast genérico atual.
- Card alvo de uma ação (cancelar, reagendar) recebe transição visual breve (fade) para confirmar.
- Loading skeletons em vez do spinner único — substitui o "A carregar follow-ups..." por 3 `Skeleton` com formato de card.

**8. Navegação entre abas com contadores no badge da sidebar**
- A sidebar (`AppSidebar.tsx`) recebe um badge total `(stats.due_now + pendencyStats.due_now)` no item "Follow-up" — admin vê de imediato se há trabalho sem entrar.

---

### Ficheiros a alterar

- `src/components/followups/FollowUpDashboard.tsx` — header, stat cards interactivos, chips de tipo, barra de filtros, empty state, card melhorado.
- `src/components/followups/PendencyRemindersTab.tsx` — espelhar mesma estrutura para consistência total entre abas.
- `src/components/layout/AppSidebar.tsx` — badge com contador "devidos agora" no item Follow-up.
- (Opcional) extrair um `<FollowUpStatsCards>` partilhado pelas duas abas para garantir consistência futura.

### Fora do âmbito (não tocar agora)

- Hooks (`useFollowUpSchedules`, `usePendencyReminders`) e edge functions — mantêm-se. Toda a melhoria é UI/UX sobre dados que já existem.
- Lógica de envio, cron, RLS — sem alterações.
- Esquema da BD — sem alterações.

### Resultado esperado

O admin abre `/follow-ups`, vê de imediato quantos itens precisam de atenção (cards + badge na sidebar), tem **um** botão claro para processar, pode pesquisar/filtrar/ordenar numa barra única, e cada card mostra apenas a informação e ações relevantes ao seu estado.
