#!/usr/bin/env bash
# check-email-dns.sh — Diagnóstico de SPF / DKIM / DMARC para luvimg.com
#
# Uso:
#   bash scripts/check-email-dns.sh [domain]
#
# Por defeito verifica luvimg.com. Requer `dig` instalado.

set -euo pipefail

DOMAIN="${1:-luvimg.com}"

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BOLD="\033[1m"
RESET="\033[0m"

if ! command -v dig >/dev/null 2>&1; then
  echo -e "${RED}❌ 'dig' não está instalado. Instale com: apt-get install dnsutils (Linux) ou brew install bind (macOS).${RESET}"
  exit 1
fi

echo -e "${BOLD}🔍 Diagnóstico de DNS de email para: ${DOMAIN}${RESET}\n"

# --- SPF ---
echo -e "${BOLD}1) SPF${RESET}"
SPF=$(dig +short TXT "$DOMAIN" | tr -d '"' | grep -i "v=spf1" || true)
if [[ -n "$SPF" ]]; then
  echo -e "${GREEN}✅ Encontrado:${RESET} $SPF"
  if echo "$SPF" | grep -qi "include:_spf.resend.com"; then
    echo -e "${GREEN}   → Resend está autorizado.${RESET}"
  else
    echo -e "${YELLOW}   ⚠️  Resend (_spf.resend.com) NÃO está incluído no SPF.${RESET}"
  fi
else
  echo -e "${RED}❌ Sem registo SPF. Adicione: \"v=spf1 include:_spf.resend.com ~all\"${RESET}"
fi
echo ""

# --- DKIM (Resend usa selector "resend") ---
echo -e "${BOLD}2) DKIM (selector: resend)${RESET}"
DKIM=$(dig +short CNAME "resend._domainkey.$DOMAIN" || true)
if [[ -n "$DKIM" ]]; then
  echo -e "${GREEN}✅ CNAME encontrado:${RESET} $DKIM"
else
  DKIM_TXT=$(dig +short TXT "resend._domainkey.$DOMAIN" | tr -d '"' || true)
  if [[ -n "$DKIM_TXT" ]]; then
    echo -e "${GREEN}✅ TXT encontrado:${RESET} ${DKIM_TXT:0:80}..."
  else
    echo -e "${RED}❌ Sem DKIM em resend._domainkey.${DOMAIN}.${RESET}"
    echo -e "${YELLOW}   → Verifique no painel do Resend o registo CNAME a adicionar.${RESET}"
  fi
fi
echo ""

# --- DMARC ---
echo -e "${BOLD}3) DMARC${RESET}"
DMARC=$(dig +short TXT "_dmarc.$DOMAIN" | tr -d '"' | grep -i "v=DMARC1" || true)
if [[ -n "$DMARC" ]]; then
  echo -e "${GREEN}✅ Encontrado:${RESET} $DMARC"
  if echo "$DMARC" | grep -qiE "p=(quarantine|reject)"; then
    echo -e "${GREEN}   → Política activa: emails que falham SPF/DKIM são rejeitados ou em quarentena.${RESET}"
  else
    echo -e "${YELLOW}   ⚠️  Política está em 'p=none' — só monitorização. Outlook ainda pode marcar como spam.${RESET}"
  fi
else
  echo -e "${RED}❌ Sem registo DMARC.${RESET}"
  echo -e "${YELLOW}   → Adicione TXT em _dmarc.${DOMAIN}:${RESET}"
  echo -e "      \"v=DMARC1; p=quarantine; rua=mailto:dmarc@${DOMAIN}; pct=100\""
fi
echo ""

# --- MX (informativo) ---
echo -e "${BOLD}4) MX (informativo, recepção de email)${RESET}"
MX=$(dig +short MX "$DOMAIN" || true)
if [[ -n "$MX" ]]; then
  echo "$MX" | sed 's/^/   /'
else
  echo -e "${YELLOW}   Sem MX configurados para ${DOMAIN}.${RESET}"
fi

echo ""
echo -e "${BOLD}✔ Diagnóstico concluído.${RESET}"
echo "Para um relatório detalhado de spam-score, envie um email de teste para https://www.mail-tester.com/"
