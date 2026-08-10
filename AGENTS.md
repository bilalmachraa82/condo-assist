## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `$graphify` or `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Confirmações a clientes

- Nunca confirmar a um cliente que uma alteração está concluída enquanto ela existir apenas localmente.
- Antes da confirmação, é obrigatório: criar o commit, fazer push para `main`, aplicar eventuais migrações, aguardar a publicação e verificar a funcionalidade na versão publicada.
- Se alguma destas etapas estiver pendente ou não puder ser validada, comunicar explicitamente que o trabalho ainda não está concluído e não enviar uma confirmação de conclusão.
