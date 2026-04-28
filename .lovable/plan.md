## Objetivo

Permitir ao cliente apagar um prédio mesmo quando este tem histórico (assistências, atas, contactos, artigos de conhecimento), mantendo proteção contra cliques acidentais.

## Situação atual

As foreign keys que apontam para `buildings` estão configuradas assim:

| Tabela referenciadora | Regra ON DELETE | Comportamento |
|---|---|---|
| `assistances` | NO ACTION | **Bloqueia** o delete (erro 23503) |
| `assembly_items` | NO ACTION | **Bloqueia** o delete (erro 23503) |
| `condominium_contacts` | CASCADE | Apaga em conjunto |
| `knowledge_articles` | SET NULL | Mantém artigo, limpa referência |

Por isso, hoje o botão "Eliminar permanentemente" aparece desativado quando existe qualquer assistência ou item de ata. Foi uma decisão para "preservar histórico", mas o cliente quer poder forçar.

## Proposta

Dar ao utilizador uma opção explícita de **eliminação forçada** com dupla confirmação. O histórico (assistências, atas) será apagado em conjunto com o prédio.

### 1. Migração de base de dados

Alterar as FKs `assistances.building_id` e `assembly_items.building_id` para `ON DELETE CASCADE`. Assim, ao apagar o prédio, o Postgres apaga automaticamente as linhas dependentes em vez de bloquear.

```sql
ALTER TABLE assistances
  DROP CONSTRAINT assistances_building_id_fkey,
  ADD CONSTRAINT assistances_building_id_fkey
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;

ALTER TABLE assembly_items
  DROP CONSTRAINT assembly_items_building_id_fkey,
  ADD CONSTRAINT assembly_items_building_id_fkey
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;
```

Nota: outras tabelas que referenciam assistências (fotos, comunicações, cotações, etc.) já devem ter cascade próprio — vou verificar e, se necessário, ajustar para garantir que tudo desaparece de forma limpa, sem deixar órfãos.

### 2. Alterações na UI (`src/pages/Edificios.tsx`)

No diálogo de eliminação, em vez de desativar o botão de "Eliminar permanentemente", passamos a:

1. Mostrar **aviso destacado** com a contagem exata do que vai ser apagado:
   - X assistências (Y abertas, Z fechadas)
   - W itens de ata
   - N contactos
   - Artigos de conhecimento ficam preservados (referência limpa)
2. Pedir ao utilizador para **escrever o código do prédio** (ex: "GAL") para confirmar — padrão usado em ferramentas tipo GitHub para evitar enganos.
3. Só então o botão "Eliminar permanentemente e todo o histórico" fica ativo (variante destrutiva, vermelho).
4. Manter "Desativar (preservar histórico)" como ação **recomendada e em destaque**, para o caso comum.

### 3. Hook `useBuildingDependencies.ts`

Manter o cálculo de contagens (continua útil para mostrar o impacto), mas remover o flag `canDeletePermanently` — já não bloqueia, apenas informa.

### 4. Toast de sucesso

Após eliminação forçada, mostrar mensagem clara: "Prédio X eliminado, juntamente com N assistências e M itens de ata."

## Ficheiros afetados

- Migração SQL (nova)
- `src/hooks/useBuildingDependencies.ts` — remover flag de bloqueio
- `src/pages/Edificios.tsx` — novo diálogo com confirmação por digitação
- `src/hooks/useBuildings.ts` — mensagem de sucesso mais detalhada

## Riscos e mitigação

- **Risco:** perda irreversível de histórico de assistências.
  **Mitigação:** confirmação por digitação do código + opção "Desativar" continua a ser a recomendada.
- **Risco:** fotos em storage ficarem órfãs após cascade.
  **Mitigação:** verificar se existe trigger/cleanup; se não, manter como nota para o utilizador (storage pode ser limpo posteriormente).

## Pergunta antes de avançar

Confirmas que queres mesmo permitir eliminação destrutiva (apaga assistências e atas em conjunto)? A alternativa mais segura seria manter a "Desativação" como única opção e esconder o prédio das listagens — mas pelo que disseste, queres a eliminação real.
