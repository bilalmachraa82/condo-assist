## Diagnóstico

Pelo screenshot e pelo código, há dois problemas diferentes:

1. **Não dá para eliminar permanentemente porque o edifício tem histórico ligado**
   - Isto está correto do ponto de vista de dados: existem assistências/assuntos de actas ligados ao edifício, e a base de dados bloqueia a eliminação para não perder histórico.
   - O fluxo correto deve ser **Desativar**, não eliminar permanentemente.

2. **O diálogo está desformatado**
   - O botão “Eliminar permanentemente” aparece visualmente ativo mesmo quando está `disabled`, porque a classe destrutiva força o vermelho apesar do estado desativado.
   - O rodapé usa 3 botões em linha, e no tamanho atual do ecrã o layout fica apertado/fora da caixa.
   - A área de aviso está larga demais visualmente e encosta/parece transbordar.

## Plano de resolução

### 1. Corrigir o layout do diálogo
- Aumentar ligeiramente a largura máxima do diálogo e garantir `overflow-hidden`/`max-w` correto.
- Trocar o rodapé para layout responsivo:
  - em desktop: botões alinhados sem sobrepor;
  - em mobile/tablet: botões empilhados ou em grelha para não partir o modal.
- Fazer o botão recomendado (“Desativar”) ocupar destaque claro.

### 2. Corrigir o botão “Eliminar permanentemente”
- Quando existirem dependências fortes, manter o botão desativado mas com aparência realmente desativada (`opacity`, `cursor-not-allowed`, sem vermelho forte).
- Alterar o texto/tooltip/mensagem para deixar claro: “Bloqueado por histórico”.
- Evitar confusão entre “não funciona” e “está bloqueado por segurança”.

### 3. Tornar “Desativar” o fluxo principal
- Quando houver assistências ou actas, mostrar uma mensagem direta:
  - “Este edifício não pode ser eliminado porque tem histórico. Use Desativar.”
- Ao clicar **Desativar**, fechar o modal e remover o edifício das listas ativas.
- Ajustar a listagem de edifícios para, por defeito, mostrar apenas edifícios ativos. Assim, quando desativa, o edifício desaparece da lista principal como esperado.

### 4. Manter acesso a edifícios inativos para gestão
- Adicionar filtro simples na página de Edifícios:
  - “Ativos”
  - “Inativos”
  - “Todos”
- Mostrar badge “Inativo” nos cartões quando aplicável.
- Permitir reativar via edição, mantendo o histórico.

### 5. Melhorar robustez técnica
- Invalidar também a query de dependências após eliminar/desativar.
- Garantir que erros de Supabase aparecem como texto legível e nunca como `[object Object]`.
- Remover `console.log` desnecessários do hook de edifícios.

## Resultado esperado

Depois da correção:

- Edifícios com assistências/actas **não serão eliminados permanentemente** por segurança.
- O utilizador conseguirá clicar em **Desativar (preservar histórico)**.
- O edifício desativado deixará de aparecer na lista ativa.
- O modal ficará visualmente alinhado e sem botões sobrepostos.
- Se um edifício não tiver histórico, aí sim poderá ser eliminado permanentemente.

## Ficheiros a alterar

- `src/pages/Edificios.tsx`
- `src/hooks/useBuildings.ts`
- possivelmente `src/hooks/useBuildingDependencies.ts` para invalidação/ajuste fino

## Nota importante

Para o caso do edifício mostrado no screenshot, o comportamento correto não é “eliminar”; é **desativar**, porque há registos associados. A correção principal é tornar isto claro e garantir que o botão de desativar funciona e que a UI não fica desformatada.