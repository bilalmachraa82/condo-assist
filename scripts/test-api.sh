#!/usr/bin/env bash
# test-api.sh — Smoke tests for agent-api Edge Function
# Usage: ./scripts/test-api.sh <API_URL> <API_KEY>
# Example: ./scripts/test-api.sh https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/agent-api sk-your-key

set -euo pipefail

API_URL="${1:?Usage: $0 <API_URL> <API_KEY>}"
API_KEY="${2:?Usage: $0 <API_URL> <API_KEY>}"

PASS=0
FAIL=0

check() {
  local description="$1"
  local expected_status="$2"
  local actual_status="$3"
  
  if [ "$actual_status" -eq "$expected_status" ]; then
    echo "✅ PASS: $description (HTTP $actual_status)"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL: $description (expected $expected_status, got $actual_status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔍 Testing agent-api endpoints..."
echo "   URL: $API_URL"
echo ""

# 1. Health (no auth) → 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/health")
check "GET /v1/health (no auth)" 200 "$STATUS"

# 2. Unauthorized (no token) → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/intervention-types")
check "GET /v1/intervention-types (no auth)" 401 "$STATUS"

# 3. Wrong token → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: wrong-key" "$API_URL/v1/intervention-types")
check "GET /v1/intervention-types (wrong key)" 401 "$STATUS"

# 4. Valid token via x-api-key → 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $API_KEY" "$API_URL/v1/intervention-types")
check "GET /v1/intervention-types (x-api-key)" 200 "$STATUS"

# 5. Valid token via Bearer → 200
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_URL/v1/intervention-types")
check "GET /v1/intervention-types (Bearer)" 200 "$STATUS"

# 6. Lookup non-existent email → 404
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent-test-12345@example.com"}' \
  "$API_URL/v1/lookup-building-by-email")
check "POST /v1/lookup-building-by-email (not found)" 404 "$STATUS"

# 7. Lookup missing email field → 400
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$API_URL/v1/lookup-building-by-email")
check "POST /v1/lookup-building-by-email (missing field)" 400 "$STATUS"

# 8. List assistances for non-existent building → 200 (empty list)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$API_URL/v1/buildings/00000000-0000-0000-0000-000000000000/assistances")
check "GET /v1/buildings/:id/assistances (empty)" 200 "$STATUS"

# 9. Get non-existent assistance → 404
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$API_URL/v1/assistances/00000000-0000-0000-0000-000000000000")
check "GET /v1/assistances/:id (not found)" 404 "$STATUS"

# 10. Import contacts with empty array → 400
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contacts":[]}' \
  "$API_URL/v1/import-contacts")
check "POST /v1/import-contacts (empty array)" 400 "$STATUS"

# 11. Not found route → 404
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $API_KEY" "$API_URL/v1/nonexistent")
check "GET /v1/nonexistent (404)" 404 "$STATUS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo "🎉 All smoke tests passed!"
