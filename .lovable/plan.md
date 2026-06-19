## Plano: auditoria 50 pontos + plano de correções + execução em lote

Já validei os pontos críticos (bundle público alinhado, auto-IA nas pendências, código postal no PDF do admin). Falta auditar os restantes 44 pontos do email do Bilal, listar as falhas, e só depois aplicar correções em lote.

### Fase A — Auditoria ponto-a-ponto (sem alterar código)

Para cada um dos 50 pontos do email, classifico:
- **CONFIRMADO** — código existe (cito `ficheiro:linha`)
- **PARCIAL** — comportamento incompleto (descrevo o que falta)
- **NÃO CONFIRMADO** — não existe ou está contrário

Agrupado por área para minimizar leituras repetidas:

| Área | Pontos | Ficheiros principais |
|---|---|---|
| Pendências email | 3,4,5,34,35,36,38,39,40,41,42,45,47,48 | `EmailPendencies.tsx`, `pendencies/*`, `usePendencies.ts`, `parse-pendency-pdf/` |
| Atas / Assembly | 6,7,37 | `assembly/*`, `parse-assembly-minutes/` |
| Compliance | 8–21,28,29,46 | `inspections/*`, `insurances/*`, hooks |
| Chaves | 23–27,30,31,32,43,44 | `Keys.tsx`, `useKeyHandovers.ts` |
| Edifícios/Admins/KB | 1,2,22,33 | `Edificios.tsx`, `Dashboard.tsx`, `BuildingAdministratorsManager.tsx`, `useKnowledgeArticles.ts` |
| Emails assistência (CP) | 49,50 | `AssistanceEmailPDFTemplate.tsx`, `send-assistance-pdf-to-admin/`, `send-email/` |

Já pré-validado:
- ✅ Bundle público `condo-assist.lovable.app` contém âncoras novas ("Voltar a analisar", "Vencer 30 dias", "Análise automática concluída")
- ✅ Pontos 5/40/47/48 (auto-IA): `useEffect` L216-221 + guard `autoFillRanForFileKeyRef`, descarte por troca de ficheiro, respeita `touchedRef`, backend multimodal correcto
- ✅ Ponto 49 PDF admin: `send-assistance-pdf-to-admin/index.ts:721` mostra `cadastral_code || extractPostalCode(address)`
- ⚠️ Ponto 49 PDF de reencaminhamento ao fornecedor: `AssistanceEmailPDFTemplate.tsx` **não** mostra código postal (só `address`). Provável fix necessário.

### Fase B — Relatório + plano de correções R1.1

Entrego no chat:
1. Tabela `Ponto | Estado | Prova`
2. Lista de **PARCIAL/NÃO CONFIRMADO** com fix proposto por ponto (1-2 linhas cada)
3. Agrupamento dos fixes por ficheiro para edição em lote

### Fase C — Execução em lote (após aprovação)

Aplico todas as correções em paralelo (file edits em batch), depois:
- `tsc` automático via harness valida build
- Para fluxos de PDF/IA: Playwright headless contra `localhost:8080` com PDF de teste, screenshots
- Para PDF de email (ponto 49): re-render local e inspecção visual
- Reporto: o que mudou, prova de funcionamento, próximos passos para validação manual do André

### O que NÃO faço nesta plano

- Não toco no ponto 7 (IA a ler ata completa e criar deliberações) — confirmado como fase 2 pelo Bilal.
- Não publico/anuncio nada como "live" até o bundle público refletir o novo commit (verifico via âncora string nova).

Aprovas para arrancar a Fase A?
