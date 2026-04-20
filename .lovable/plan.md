

## Objectivo
Resolver automaticamente as 102 datas ambíguas usando análise crítica em vez de exigir revisão manual.

## Estratégias de auditoria (em cascata, da mais fiável à menos)

### 1. Comparação com o backup pré-correcção
A tabela `_backup_dates_20260420` tem o `content` original tal como veio do Excel. Para cada data ambígua:
- Comparar a posição da data no backup vs. no estado actual.
- Se o Excel já gerou `m/d/yy`, o backup tem essa pista; se gerou `d/m/yy`, idem.
- Cruzar com o **padrão dominante do mesmo artigo**: se 80% das datas não-ambíguas no mesmo artigo são `d/m/y`, assumir o mesmo para as ambíguas.

### 2. Análise do Excel original (se reenviado)
Ler o ficheiro com `cellDates: true` + `raw: true` → recebemos `Date` nativo, sem ambiguidade nenhuma. Comparar com as 102 entradas e resolver 100%.

### 3. Heurística contextual por artigo
Mesmo sem o Excel, dentro de cada artigo:
- Se o artigo tem datas `15/3/25` e `5/8/25`, a primeira força interpretação `d/m/y` → aplicar à segunda.
- Se a data ambígua aparece numa série cronológica (ex: linha de "última inspecção"), inferir pelo contexto temporal das outras datas do bloco.

### 4. Padrão temporal global
Verificar `created_at` dos artigos: importações feitas no mesmo batch usaram o mesmo Excel → mesmo locale → mesma convenção. Se 90% das datas não-ambíguas desse batch são `d/m/y`, aplicar a todas as ambíguas desse batch.

## Plano de execução

**Fase A — Auditoria automática (sem Excel):**
1. Para cada uma das 102 entradas ambíguas, extrair `article_id` e ler `content` actual + `content` do backup.
2. Calcular o "score de formato" do artigo: contar datas não-ambíguas → determinar formato dominante (`d/m/y` vs `m/d/y`).
3. Agrupar artigos por janela de importação (mesmo `created_at` ±5 min) e calcular score do batch.
4. Para cada ambígua, decidir:
   - Se score do artigo é claro (>70% num formato) → aplicar.
   - Senão, usar score do batch.
   - Senão, marcar como "verdadeiramente irresolúvel" (deve ser <10 casos).
5. Gerar relatório CSV com: data ambígua | decisão | confiança | razão.
6. Aplicar `UPDATE` em batch, com novo backup `_backup_dates_20260420_v2`.

**Fase B — Validação cruzada com Excel (recomendada):**
- Pedir ao utilizador para reenviar o Excel original como confirmação.
- Reparsear com `raw: true` e comparar com as decisões da Fase A.
- Discrepâncias → corrigir e adicionar ao relatório.

**Fase C — Atualizar UI `/admin/revisao-datas`:**
- Mostrar as decisões automáticas com badge "Auto-resolvido (confiança: alta/média)".
- Permitir override manual nos casos de baixa confiança.
- Marcar lista como concluída quando todos resolvidos.

## Pergunta antes de avançar

Para maximizar a precisão, qual destas opções preferes?

1. **Avançar já com Fase A** (auditoria automática usando backup + heurísticas, sem Excel). Resolve provavelmente 90+ casos com alta confiança; ~10 ficam para revisão manual.
2. **Reenviar o Excel original primeiro** e fazer Fase B directamente — resolve 100% com certeza absoluta.
3. **Fase A + Fase B combinadas** — máxima robustez, usa heurística como validação cruzada do Excel.

