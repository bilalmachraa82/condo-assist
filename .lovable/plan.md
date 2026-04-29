## Objetivo

Remover a obrigatoriedade do campo **Código** no formulário de criação/edição de edifícios. Quando o utilizador não preencher, o sistema gera automaticamente um código sequencial.

## Alterações

### 1. `src/components/buildings/BuildingForm.tsx`
- **Schema Zod**: alterar `code: z.string().min(1, ...)` para `code: z.string().optional()`.
- **Label**: remover o asterisco — passa de `Código *` para `Código`.
- **Placeholder**: alterar para `"Auto (deixe vazio para gerar)"` para deixar claro que é opcional.
- **autoComplete**: adicionar `autoComplete="off"` ao Input do código (resolve também o dropdown de sugestões do browser visível no screenshot).
- **onSubmit**: se `data.code` vier vazio, calcular o próximo código disponível antes de criar (apenas em modo de criação; na edição mantém o existente).

### 2. Lógica de geração automática de código
- Adicionar pequeno helper dentro do `onSubmit` (ou no hook `useBuildings`) que, em modo criação sem código:
  - Busca o maior `code` numérico atual em `buildings`.
  - Gera o próximo número formatado com 3 dígitos (ex.: `011`, `027`), seguindo o padrão visível no dropdown (`006`, `008`, `010`, `26`).
  - Se houver conflito (código já existe), incrementa até encontrar um livre.

### 3. Validação na base de dados
- A coluna `buildings.code` continua `NOT NULL UNIQUE` na BD — não é alterada. A geração automática garante que nunca se envia vazio.

## Ficheiros afetados
- `src/components/buildings/BuildingForm.tsx` (schema, label, placeholder, submit, autoComplete)

## Notas
- O dropdown que aparece no screenshot (`006`, `003`, `008`, ...) é o **autofill do browser** a partir de submissões anteriores. O atributo `autoComplete="off"` no input desliga isso.
- O campo **Nome** continua obrigatório.
- Edifícios existentes não são afetados.
