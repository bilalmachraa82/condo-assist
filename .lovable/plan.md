## Auditoria ponto-a-ponto dos 50 itens do email para o André

Objetivo: verificar no código atual (não nas mensagens de commit) se cada um dos 50 pontos está realmente implementado e funcional, e produzir um relatório com prova por ponto. Não vou alterar código nesta fase — só auditar.

### Método

Para cada ponto faço uma das três classificações, com prova ligada a ficheiros/linhas ou a uma query/execução:

- **CONFIRMADO** — existe código que implementa o comportamento descrito; cito ficheiro:linha.
- **PARCIAL** — existe parte do comportamento mas falta algo (ex.: UI ok, sem persistência; validação no cliente sem RLS; etc.).
- **NÃO CONFIRMADO** — não encontro evidência ou encontro evidência contrária; descrevo o que falta.

Para fluxos que só se validam em runtime (ex.: ponto 5/40/47/48 — IA a ler PDF e auto-preencher) corro Playwright headless contra o preview local, anexo screenshot e log de rede do `parse-pendency-pdf`. Para o bundle público de `condo-assist.lovable.app` faço `curl` ao HTML/JS publicado e procuro uma string-âncora recente (ex.: "Voltar a analisar", "Vencer 30 dias") para confirmar que o snapshot servido corresponde ao código novo — exatamente o que a nota interna do email pede.

### Agrupamento da auditoria

Faço a auditoria por área para reduzir leituras repetidas; o relatório final volta a ser ponto-a-ponto pela numeração do email.

1. **Pendências de email** (pontos 3, 4, 5, 34, 35, 36, 38, 39, 40, 41, 42, 45, 47, 48)
   `src/pages/EmailPendencies.tsx`, `src/components/pendencies/*`, `supabase/functions/parse-pendency-pdf/`, `usePendencies.ts`.
2. **Atas / Assembly** (pontos 6, 7, 37)
   `src/components/assembly/*`, `parse-assembly-minutes/`.
3. **Compliance — elevadores, gás, extintores, seguros** (pontos 8–21, 28, 29, 46)
   `src/components/inspections/*`, `src/components/insurances/*`, `useInspections.ts`, `useInsurances.ts`, schema das tabelas relevantes.
4. **Chaves** (pontos 23–27, 30, 31, 32, 43, 44)
   `src/pages/Keys.tsx`, `useKeyHandovers.ts`, schema.
5. **Edifícios / administradores / base de conhecimento** (pontos 1, 2, 22, 33)
   `src/pages/Edificios.tsx`, `Dashboard.tsx`, `BuildingAdministratorsManager.tsx`, `useKnowledgeArticles.ts`.
6. **Emails de assistência com código postal** (pontos 49, 50)
   `AssistanceEmailPDFTemplate.tsx`, `send-assistance-pdf-to-admin/`, `send-email/`, templates que montam a morada.

### Validação runtime adicional

- Playwright headless: abrir "Nova pendência de email", anexar um PDF de teste, observar que `parse-pendency-pdf` é invocado uma única vez sem clique e que os campos ficam preenchidos. Cobre 5/40/47/48.
- `curl -s https://condo-assist.lovable.app/ | rg <hash do bundle>` e depois fetch do JS para procurar a string-âncora. Reporto: bundle público está alinhado com o commit novo, ou ainda serve versão antiga.

### Entregável

Relatório no chat com:

1. Tabela: `Ponto | Estado | Prova (ficheiro:linha ou screenshot/log)`.
2. Lista separada dos pontos PARCIAL/NÃO CONFIRMADO com o que falta para fechar.
3. Estado do bundle público vs commit (âncora encontrada / não encontrada).
4. Recomendação por ponto aberto: correção a fazer já (R1) ou mover para fase 2.

Sem alterações de código nesta fase. Se a auditoria encontrar regressões, listo-as no relatório e abrimos um plano R1.1 separado.
