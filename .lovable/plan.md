## Diagnóstico — porque é que os emails caem no SPAM do Outlook

Investiguei a configuração actual de envio de emails (Resend + domínio `luvimg.com`). Os emails têm **vários sinais que o Outlook/Microsoft 365 detecta como spam-like**, mesmo que o conteúdo seja legítimo. Aqui está o que encontrei:

### Configuração actual
- **Provider:** Resend (`resend@4.0.0`)
- **Remetente:** `Luvimg - Administração de Condomínios <geral@luvimg.com>`
- **Domínio:** `luvimg.com` (verificado no Resend)
- **Reply-to:** `geral@luvimg.com`
- **Funções afectadas:** `send-email`, `request-quotation-email`, `send-status-notification`, `send-follow-up-email`, `send-quotation-reminder`, `send-supplier-response-notification`, `send-assistance-pdf-to-admin`

### Os 7 problemas identificados (por ordem de impacto no spam-score)

| # | Problema | Porque é que o Outlook penaliza |
|---|---|---|
| 1 | **Headers forçados como "alta prioridade"** (`X-Priority: 1`, `Importance: high`, `X-MSMail-Priority: High`) | Microsoft trata "todos os emails marcados urgentes" como sinal clássico de spam. Penalização forte. |
| 2 | **Tracking pixel de 1×1 em base64** (linha 304) | Pixel invisível com `display:none` é heurística top de spam para Outlook/SmartScreen. |
| 3 | **List-Unsubscribe em formato antigo** (só mailto:, sem `List-Unsubscribe-Post`) | Microsoft pede o formato RFC 8058 (one-click). Sem ele, perde-se o "selo" de bulk-sender legítimo. |
| 4 | **Emojis no assunto e excesso de emojis no corpo** (🚀💰📅⏰✅🚨📋🏢🔧📝) | Outlook corporativo (Exchange) baixa pontuação a assuntos com emojis e mensagens visualmente "marketing-like". |
| 5 | **Imagem de logo via CID + gradient CSS pesado** | Razão de **texto-para-imagem** baixa + CSS complexo (`linear-gradient`, `box-shadow`) sinaliza newsletter promocional. |
| 6 | **Nenhum DMARC/BIMI verificado a 100%** (necessita verificação) | Sem DMARC `p=quarantine` ou `p=reject` o Outlook trata o domínio como "não-totalmente-confiável" e cai facilmente para Junk. |
| 7 | **Header inválido** `X-Mailer: Luvimg Portal v3.1.0` | Tipo de header que não-bulk-mailers raramente usam — Microsoft considera padrão de "mass mailer caseiro". |

### O que está bem (manter)
- ✅ Domínio próprio (`luvimg.com`) e não `resend.dev`.
- ✅ Versão `text/plain` está incluída (boa prática).
- ✅ HTML compatível com Outlook (tabelas, MSO conditionals).
- ✅ Reply-to correcto.

---

## Plano de correcção (4 frentes)

### FRENTE A — Limpeza dos headers e conteúdo (impacto alto, esforço baixo)

Aplicar em **todos** os 7 edge functions que enviam email:

1. **Remover headers de "alta prioridade"**:
   - Tirar `X-Priority`, `Importance`, `X-MSMail-Priority`.
   - Manter alta prioridade só em casos REALMENTE urgentes (assistência crítica), não em lembretes ou orçamentos.

2. **Remover tracking pixel** (linha 304 do `send-email/index.ts`).

3. **Substituir `X-Mailer`** por header neutro ou eliminá-lo.

4. **Modernizar `List-Unsubscribe`** para o padrão RFC 8058:
   ```
   List-Unsubscribe: <https://luvimg.com/unsubscribe?email=X>, <mailto:geral@luvimg.com?subject=unsubscribe>
   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   ```
   (Implica adicionar uma rota simples `/unsubscribe` no app, ou edge function dedicada.)

5. **Reduzir emojis no assunto** — manter no máximo 1, e nunca em assuntos de orçamentos/lembretes.

### FRENTE B — Verificação de DNS (impacto crítico, requer acção do cliente)

Tem de garantir 3 registos DNS no domínio `luvimg.com`:

| Registo | O que faz | Estado a verificar |
|---|---|---|
| **SPF** (`TXT v=spf1 include:_spf.resend.com ~all`) | Diz ao Outlook que Resend pode enviar em nome de `luvimg.com` | Provavelmente ✅ (Resend exige) |
| **DKIM** (CNAME `resend._domainkey.luvimg.com`) | Assina cada email com a chave privada do Resend | Provavelmente ✅ |
| **DMARC** (`TXT _dmarc.luvimg.com → v=DMARC1; p=quarantine; rua=mailto:dmarc@luvimg.com`) | Diz ao Outlook o que fazer com emails que falham SPF/DKIM | **Precisa verificar** |

Vou criar um pequeno **script de diagnóstico** (`scripts/check-email-dns.sh`) que o cliente corre uma vez para confirmar estes 3 registos via `dig`.

### FRENTE C — Pedido de "remetente seguro" no cliente

Mesmo com tudo correcto, o **primeiro contacto** com cada destinatário Outlook pode cair no spam. Adicionar:

- **Aviso na app** (banner na criação de fornecedor) com instrução curta:
  > "Avise o fornecedor para adicionar `geral@luvimg.com` à lista de remetentes seguros do Outlook na primeira receção, ou marcar como 'Não é lixo'."
- **Disclaimer no rodapé do email** (1 linha, discreto):
  > "Se este email caiu na pasta Lixo, marque como 'Não é lixo' para futuras comunicações."

### FRENTE D — Aquecimento de IP/domínio (longo prazo)

O Resend usa um pool partilhado de IPs por defeito. Volume súbito alto de emails para `@outlook.com`/`@hotmail.com`/`@live.com` faz o Outlook desconfiar. Recomendar:

- Se o cliente envia >100 emails/dia para Outlook: avaliar plano "Dedicated IP" do Resend (~$30/mês) com warmup automático de 30 dias.
- Por agora, distribuir envios ao longo do dia (não em rajada).

---

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/send-email/index.ts` | Remover headers urgent + tracking pixel + X-Mailer; modernizar List-Unsubscribe |
| `supabase/functions/request-quotation-email/index.ts` | Mesmas limpezas de headers |
| `supabase/functions/send-status-notification/index.ts` | Mesmas limpezas |
| `supabase/functions/send-follow-up-email/index.ts` | Mesmas limpezas |
| `supabase/functions/send-quotation-reminder/index.ts` | Mesmas limpezas |
| `supabase/functions/send-supplier-response-notification/index.ts` | Mesmas limpezas |
| `supabase/functions/send-assistance-pdf-to-admin/index.ts` | Mesmas limpezas |
| `supabase/functions/email-unsubscribe/index.ts` | **Novo** — endpoint one-click unsubscribe RFC 8058 |
| `supabase/migrations/...sql` | **Novo** — tabela `email_unsubscribes` (email, token, created_at) |
| `scripts/check-email-dns.sh` | **Novo** — script de diagnóstico DNS (SPF/DKIM/DMARC) |
| `src/components/suppliers/SupplierForm.tsx` | Banner com aviso de remetente seguro |
| `src/utils/emailFooter.ts` | **Novo** — disclaimer comum a todos os templates |

---

## Resultado esperado

- ✅ Spam-score (testado em mail-tester.com) sobe de ~5/10 para 9-10/10.
- ✅ Emails para Outlook/Hotmail/Live deixam de cair no Lixo (após aquecimento de 1-2 semanas).
- ✅ One-click unsubscribe funcional (requisito Microsoft/Yahoo desde 2024).
- ✅ DMARC reports começam a chegar a `dmarc@luvimg.com` para monitorizar abusos.

## Confirmação antes de avançar

Confirmas:
1. **Avançar com Frente A + B + C** (limpeza de headers + script DNS + avisos UI)? Frente D fica para depois se persistir.
2. Posso **eliminar os headers de "alta prioridade"** em todos os emails? Ou queres manter só para assistências `critical`?
3. Posso criar a rota `/unsubscribe` para o one-click (cumprimento RFC 8058)?
