## Objetivo
Corrigir as confusões apontadas pelo cliente nas áreas recentes: Relatório de Chaves, Base de Conhecimento e Pendências Email, mantendo o fluxo simples e mais coerente com o uso real.

## Queixas identificadas na imagem
1. **Relatório de Chaves**
   - Tornar obrigatório preencher quem devolveu a chave.
   - Mostrar totais claros: Total, Em uso e Devolvidas.
   - Evitar que o registo de chaves pareça incompleto quando há devolução sem nome.

2. **Base de Conhecimento**
   - O campo/categoria “Administrador” cria confusão com administradores de edifícios.
   - Melhor separar “administradores” reais da base de conhecimento, ou renomear a categoria para não sugerir entidade/pessoa.
   - A importação/edição deve continuar simples, mas com etiquetas mais claras.

3. **Pendências Email**
   - Permitir editar pendências de email de forma mais direta.
   - Confirmar se a ação de abrir detalhe já permite editar e, se sim, tornar isso mais evidente com botão/label “Editar”.
   - O código do prédio aparece no assunto/título, mas não aparece de forma útil no título final; o auto-preenchimento deve usar o código do prédio como parte principal do título quando vem no assunto.

## Plano de implementação

### 1. Relatório de Chaves
- Adicionar um terceiro KPI no topo: **Total**.
- Manter **Em uso** e **Devolvidas** como métricas separadas.
- No modal “Marcar como devolvida”:
  - Tornar **Quem devolveu** obrigatório.
  - Bloquear “Confirmar devolução” enquanto estiver vazio.
  - Remover fallback atual `—`, porque mascara dados em falta.
- Atualizar a impressão “Chaves em uso” apenas se necessário para manter consistência dos totais.

### 2. Base de Conhecimento
- Renomear a categoria atual `Administrador` para algo menos ambíguo, por exemplo **Procedimentos** ou **Gestão interna**.
- Manter o valor interno `procedimentos` para não quebrar dados existentes.
- Rever os textos visíveis no formulário/filtros/cartões para deixar claro que é uma categoria de conhecimento, não uma ficha de administrador.
- Não criar duplicação de administradores aqui; a gestão de administradores deve continuar na página própria.

### 3. Pendências Email
- Na lista, adicionar uma ação explícita de edição/abrir detalhe, mantendo o clique no cartão.
- No detalhe da pendência, reforçar que os campos são editáveis:
  - Título editável.
  - Estado e prioridade editáveis.
  - Descrição e data limite editáveis.
- Ajustar o auto-preenchimento com IA:
  - Melhorar o prompt para extrair `building_hint` preferindo o código do prédio quando o assunto tiver padrões tipo `088 - ...`, `074 - ...`.
  - Ao aplicar o resultado, se houver código de prédio reconhecido, preencher o edifício e criar um título limpo no formato `Código - assunto resumido`, evitando perder o código.
- Rever o texto do botão/área “Auto-preencher com IA” para ficar claro que é opcional e depende de anexar PDF/imagem/email.

### 4. Validação final
- Verificar visualmente os três fluxos no tamanho atual do cliente.
- Confirmar que:
  - O modal de devolução não deixa confirmar sem nome.
  - Os totais de chaves batem certo.
  - A Base de Conhecimento não mostra “Administrador” como categoria ambígua.
  - Uma pendência criada por email preserva o código do prédio no título/edifício quando a IA consegue identificá-lo.

## Ficheiros prováveis a alterar
- `src/pages/Keys.tsx`
- `src/utils/knowledgeCategories.ts`
- `src/components/pendencies/CreatePendencyDialog.tsx`
- `src/pages/EmailPendencies.tsx`
- `supabase/functions/parse-pendency-pdf/index.ts`

## Nota importante
Não recomendo remover a Base de Conhecimento nem as Pendências Email; o problema parece ser sobretudo de linguagem, obrigatoriedade de campos e clareza do fluxo, não da existência das funcionalidades.