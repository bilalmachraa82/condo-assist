## Auditoria

Estado actual de `inspection_categories`:

| Categoria | Registos no `building_inspections` | Artigos no KB |
|---|---|---|
| Coluna Eléctrica | 57 | sim |
| Gás | 60 | sim |
| Elevador | 25 | sim |
| Extintores | 29 | sim |
| **AVAC** | **0** | **0** |
| **Pára-raios** | **0** | **0** |
| **ITE** | **0** | **0** |

As três últimas estão vazias em ambos os sítios — só inflam o dashboard ("Sem registo" em 83 edifícios cada) e os KPIs de "missing", criando ruído. Como pediste, removo-as por completo. Se mais tarde enviares o Excel com dados de AVAC/Pára-raios/ITE, voltamos a adicionar (ou simplesmente reactivamos via `is_active = true`).

## Plano

### 1. Migration: remover categorias sem dados

```sql
DELETE FROM inspection_categories
 WHERE key IN ('avac','para_raios','ite')
   AND NOT EXISTS (
     SELECT 1 FROM building_inspections bi WHERE bi.category_id = inspection_categories.id
   );
```

Guardrail: `NOT EXISTS` impede acidente se entretanto alguém registar uma inspeção. Idempotente — se já não existirem, não acontece nada.

### 2. Impacto no dashboard `/inspecoes`

- KPI "Sem registo" desce de ~249 para ~22 (apenas os edifícios reais sem registo nas 4 categorias activas).
- Card "Cobertura por categoria" passa a mostrar 4 barras em vez de 7.
- Filtro de categorias na tabela só mostra as 4 com sentido.
- Edge function `inspection-alerts-cron` deixa de listar 249 falsos "missing" no digest diário — só alerta sobre o que realmente precisa de atenção.

Sem alterações de código necessárias: a UI e o cron lêem dinamicamente da BD.

### 3. O que NÃO toco

- Inspeções existentes (137 registos)
- `knowledge_articles`
- Lógica de alertas, view `building_inspection_status`, hooks
- Categorias activas (Gás, Coluna Eléctrica, Elevador, Extintor)

## Resultado esperado

Dashboard `/inspecoes` mais limpo e fiel ao que realmente fazemos tracking. Quando enviares o Excel ou pedires para incluir uma nova categoria, basta um `INSERT` em `inspection_categories` para a activar de novo.
