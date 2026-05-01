## Auditoria dos Menus Laterais

Estado atual da `AppSidebar` — 3 grupos, 17 itens visíveis.

### Inventário e diagnóstico

**Grupo "Principal" (12 itens)**

| Item | Rota | Estado | Recomendação |
|---|---|---|---|
| Dashboard | `/` | Funcional, KPIs e atalhos | Manter |
| Assistências | `/assistencias` | Core, 713 linhas | Manter |
| Orçamentos | `/orcamentos` | Funcional | Manter |
| Follow-ups | `/follow-ups` | Funcional, com badge | Manter |
| Pendências Email | `/pendencias-email` | Funcional, recém-melhorado | Manter |
| Edifícios | `/edificios` | Core | Manter |
| Fornecedores | `/fornecedores` | Core | Manter |
| Análise e Relatórios | `/analytics` | Funcional, 378 linhas | Manter |
| Base de Conhecimento | `/knowledge` | Funcional | Manter |
| Seguimento Actas | `/assembly` | Funcional | Manter |
| Inspeções | `/inspecoes` | Funcional | Manter |
| Seguros | `/seguros` | Funcional | Manter |

**Grupo "Configuração" (4 itens)**

| Item | Rota | Estado | Recomendação |
|---|---|---|---|
| Configurações | `/configuracoes` | Empresa/Sistema/Notificações/Integração | Manter |
| Tempos Follow-up | `/follow-ups/configuracao` | Recém-criado, funcional | Manter |
| Tipos Assistência | `/tipos-assistencia` | Funcional | Manter |
| Comunicações | `/comunicacoes` | Logs de email | Manter, mas mover para "Principal" (é operacional, não config) |

**Grupo "Desenvolvimento" (1 item visível)**

| Item | Rota | Estado | Recomendação |
|---|---|---|---|
| Teste Follow-ups | `/follow-up-testing` | Ferramenta dev | Ocultar para utilizadores normais |

**Páginas existentes mas SEM entrada no menu (rotas órfãs)**

| Rota | Página | Diagnóstico |
|---|---|---|
| `/seguranca` | Security (auditoria, alertas, settings) | Útil só para admin — adicionar visível só a admins |
| `/relatorios` | Aponta para `Analytics` (duplicado de `/analytics`) | Remover rota duplicada |
| `/email-testing` | EmailSystemTester (dev tool) | Adicionar ao grupo Dev (oculto a não-admin) ou remover |

### Problemas detetados no user journey

1. **"Comunicações" está em Configuração** mas é uma ferramenta operacional (consulta de logs de email). Pertence ao bloco Principal.
2. **Grupo "Desenvolvimento" sempre visível** mesmo para utilizadores finais — confunde e polui.
3. **`/relatorios` duplica `/analytics`** — duas rotas para a mesma página.
4. **`/seguranca` e `/email-testing` existem no `App.tsx` mas não estão no menu** — funcionalidade escondida.
5. **12 itens no grupo Principal** — lista longa; vale a pena criar um subgrupo "Operações" (Assistências, Orçamentos, Follow-ups, Pendências Email, Comunicações) e "Catálogo" (Edifícios, Fornecedores, Base Conhecimento, Inspeções, Seguros, Actas).

### Plano de alterações

**1. Reorganizar `src/components/layout/AppSidebar.tsx`**

Nova estrutura de grupos:

```text
Principal
  - Dashboard
  - Análise e Relatórios

Operações
  - Assistências
  - Orçamentos
  - Follow-ups            (badge)
  - Pendências Email
  - Comunicações          (movido de Configuração)

Catálogo
  - Edifícios
  - Fornecedores
  - Seguimento Actas
  - Inspeções
  - Seguros
  - Base de Conhecimento

Configuração
  - Configurações
  - Tempos Follow-up
  - Tipos Assistência
  - Segurança             (NOVO, só admin)

Desenvolvimento           (só admin / dev)
  - Teste Follow-ups
  - Teste Email           (NOVO, expõe /email-testing)
```

**2. Visibilidade por role**

- Verificar role com `has_role(user.id, 'admin')` via hook existente (já há `useAuth` + `user_roles`).
- Esconder os grupos "Configuração > Segurança" e "Desenvolvimento" inteiro para utilizadores não-admin.
- Adicionar item de menu "Segurança" → `/seguranca` apenas para admins.
- Adicionar item de menu "Teste Email" → `/email-testing` apenas para admins.

**3. Limpeza de rotas em `src/App.tsx`**

- Remover a rota duplicada `/relatorios` (mantém só `/analytics`).
- Atualizar `src/hooks/useNavigationGestures.ts` e `src/components/mobile/MobileBreadcrumbs.tsx` e `src/components/mobile/BottomNavigation.tsx` para apontar para `/analytics`.

**4. BottomNavigation mobile**

Verificar e alinhar `src/components/mobile/BottomNavigation.tsx` com a nova estrutura (manter apenas 4-5 atalhos essenciais: Dashboard, Assistências, Follow-ups, Pendências, Mais).

### Detalhes técnicos

- Usar hook `useAuth` + adicionar pequena helper `useIsAdmin()` que consulta a tabela `user_roles` (já existe `has_role` SQL function).
- Render condicional por grupo: filtrar arrays `configItems`/`devItems` antes do `.map`.
- Não eliminar nenhuma página — apenas ocultar do menu. Mantém-se acessível por URL direto se necessário.
- Sem alterações de schema/DB.

### Resultado esperado

- Sidebar mais limpa para utilizador comum (ocultas as ferramentas dev e Segurança).
- Páginas agrupadas por intenção (operação vs catálogo vs config).
- Sem rotas duplicadas.
- Funcionalidades antes escondidas (`/seguranca`, `/email-testing`) ficam acessíveis a admins via menu.
