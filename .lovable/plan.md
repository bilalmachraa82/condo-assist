

## Objectivo
Validação cruzada (Fase B) usando os 2 ficheiros Excel originais que o utilizador acabou de enviar, para confirmar 100% de certeza nas correcções de datas já aplicadas.

## O que vou fazer

### 1. Parsing fiável dos Excel originais
- Copiar `Assuntos_actas_a_resolver-2.xlsx` e `Listagem_Geral_de_Manutenção-3.xlsx` para `/tmp/`.
- Ler com Python + `openpyxl` (`data_only=True`) que devolve `datetime` nativo para células de data — sem ambiguidade nenhuma.
- Extrair todas as datas + texto de cada linha → ground truth absoluta.

### 2. Comparar com o estado actual da BD
- Para cada artigo importado nos batches afectados (knowledge_articles + assembly_items), procurar as datas correspondentes no Excel original.
- Verificar 3 casos:
  - ✅ **Match**: data na BD === data no Excel → correcção OK.
  - ⚠️ **Mismatch**: data na BD ≠ Excel → erro residual, precisa correcção.
  - ❓ **Não encontrado**: linha do Excel não bate com nenhum artigo (provavelmente normal, mas reportar).

### 3. Relatório de auditoria
Gerar 2 ficheiros em `/mnt/documents/`:
- `auditoria_datas_final.csv` — linha-a-linha com: artigo_id, data_excel, data_bd, status (OK/MISMATCH).
- `auditoria_datas_resumo.pdf` — sumário executivo: total verificado, % match, lista de mismatches, conclusão de confiança final.

### 4. Correcção dos mismatches (se existirem)
- Se encontrar discrepâncias, gerar migration SQL com os UPDATEs específicos.
- Backup `_backup_dates_20260420_v3` antes de aplicar.
- Re-executar verificação até 100% match.

### 5. Conclusão para o cliente
Entregar relatório PDF com:
- Total de datas auditadas vs Excel original.
- % de correspondência exacta.
- Lista de eventuais correcções residuais aplicadas.
- Grau de confiança final (esperado: 100% após Fase B).

## Pré-requisitos técnicos
- Python `openpyxl` (já disponível no sandbox).
- Acesso `psql` à BD (já configurado).
- Backup automático antes de qualquer UPDATE adicional.

## Resultado esperado
- Confirmação de que as 182 correcções da Fase A estão alinhadas com o Excel original.
- Eventuais mismatches residuais corrigidos.
- Relatório PDF entregável ao cliente com confiança 100%.

