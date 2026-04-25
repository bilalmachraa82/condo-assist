/**
 * Rodapé partilhado para emails — disclaimer suave a pedir para marcar
 * como "Não é lixo" caso o email caia na pasta de spam.
 *
 * Devolve HTML pronto a injectar no fim do template.
 */
export const SAFE_SENDER_FROM = "geral@luvimg.com";

export const emailFooterDisclaimerHtml = (): string => `
  <p style="color:#9ca3af;font-size:11px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:16px 0 0;line-height:1.4;text-align:center;">
    Recebeu este email automaticamente da Luvimg. Se foi parar à pasta de Lixo/Spam,
    marque como "Não é lixo" e adicione <strong>${SAFE_SENDER_FROM}</strong> à sua lista de remetentes seguros.
  </p>
`;

export const emailFooterDisclaimerText = (): string =>
  `\n\nRecebeu este email automaticamente. Se foi parar à pasta de Lixo, marque como "Não é lixo" e adicione ${SAFE_SENDER_FROM} aos remetentes seguros.`;
