## Objetivo
Permitir pré-visualizar PDFs (e imagens) dos anexos de pendências dentro da app, sem ter de os descarregar.

## Abordagem
Criar um diálogo de pré-visualização (`AttachmentPreviewDialog`) que mostra o ficheiro inline, usando o mesmo truque de `blob:` URL que já contorna os bloqueadores tipo Comet/uBlock.

### Comportamento
- Clicar no ícone do "olho" passa a abrir um modal em vez de uma nova janela.
- O modal busca o ficheiro via `getPendencyFileSignedUrl` + `fetch` → `blob` → `URL.createObjectURL`.
- Renderização conforme tipo MIME:
  - **PDF** (`application/pdf`): `<iframe>` que ocupa ~80vh, com `title` acessível.
  - **Imagens** (`image/*`): `<img>` centrada, com zoom-to-fit.
  - **Email `.eml`** ou outros: mostra mensagem "Pré-visualização não disponível" + botão "Abrir/Descarregar".
- Header do modal: nome do ficheiro + botões:
  - **Abrir em nova janela** (usa o `blob:` URL — fallback para quem prefere).
  - **Descarregar** (link `<a download>`).
- Estados: loading spinner enquanto faz fetch; toast de erro se falhar.
- Limpeza: `URL.revokeObjectURL` ao fechar o modal para não vazar memória.

## Ficheiros
- **Novo** `src/components/pendencies/AttachmentPreviewDialog.tsx` — componente do modal.
- **Editar** `src/components/pendencies/PendencyDetail.tsx`:
  - Substituir `onPreview` (que abre `window.open`) por estado `previewAttachment` que abre o `AttachmentPreviewDialog`.
  - Passar `file_path`, `file_name` e `mime_type` (já existe na tabela `email_pendency_attachments`) ao diálogo.

## Notas técnicas
- Reaproveita `getPendencyFileSignedUrl` existente — não é preciso nova edge function.
- O `iframe` carrega um `blob:` URL local, portanto nunca é bloqueado por extensões que filtram `supabase.co`.
- Sem alterações de schema nem novas dependências.
