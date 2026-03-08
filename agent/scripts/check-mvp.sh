#!/usr/bin/env bash
set -euo pipefail

# Validates the complete u-msg MVP backend surface.
# Requires UMSG_CHECK_URL to point at the running u-msg server.
# Port 8000 is occupied by the always-on stub in this workspace, so there
# is no safe default — callers must set the variable explicitly.
# Requires: curl, node (with ws available from node_modules).

if [ -z "${UMSG_CHECK_URL:-}" ]; then
  echo "ERROR: UMSG_CHECK_URL is not set."
  echo "Port 8000 is occupied by the always-on stub; set UMSG_CHECK_URL explicitly."
  echo "Example: UMSG_CHECK_URL=http://localhost:18080 $0"
  exit 1
fi

BASE_URL="${UMSG_CHECK_URL}"
PASS=0
FAIL=0
ERRORS=""

check() {
  local label="$1"
  local expected_status="$2"
  shift 2
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$@") || actual="000"

  if [ "$actual" = "$expected_status" ]; then
    printf "  ✓ %s (HTTP %s)\n" "$label" "$actual"
    PASS=$((PASS + 1))
  else
    printf "  ✗ %s — expected %s, got %s\n" "$label" "$expected_status" "$actual"
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  - ${label}: expected ${expected_status}, got ${actual}"
  fi
}

check_json_field() {
  local label="$1"
  local url="$2"
  local field="$3"
  local expected="$4"
  local body
  body=$(curl -s "$url") || body=""
  local actual
  actual=$(printf '%s' "$body" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const o=JSON.parse(d);console.log(JSON.stringify(o['$field']??null))}
      catch{console.log('PARSE_ERROR')}
    })
  ") || actual="CURL_ERROR"

  if [ "$actual" = "$expected" ]; then
    printf "  ✓ %s (.%s = %s)\n" "$label" "$field" "$expected"
    PASS=$((PASS + 1))
  else
    printf "  ✗ %s — .%s expected %s, got %s\n" "$label" "$field" "$expected" "$actual"
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  - ${label}: .${field} expected ${expected}, got ${actual}"
  fi
}

check_ws() {
  local label="$1"
  local ws_url="$2"
  local result
  result=$(node -e "
    const WebSocket = require('ws');
    const ws = new WebSocket('$ws_url');
    const timer = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
    ws.on('open', () => {});
    ws.on('message', (data) => {
      clearTimeout(timer);
      try {
        const msg = JSON.parse(data.toString());
        console.log(msg.type || 'unknown');
      } catch { console.log('PARSE_ERROR'); }
      ws.close();
    });
    ws.on('error', (e) => {
      clearTimeout(timer);
      console.log('WS_ERROR:' + e.message);
      process.exit(1);
    });
  " 2>/dev/null) || result="EXEC_ERROR"

  if [ "$result" = "connected" ]; then
    printf "  ✓ %s (got 'connected' event)\n" "$label"
    PASS=$((PASS + 1))
  else
    printf "  ✗ %s — expected 'connected', got '%s'\n" "$label" "$result"
    FAIL=$((FAIL + 1))
    ERRORS="${ERRORS}\n  - ${label}: expected 'connected', got '${result}'"
  fi
}

echo ""
echo "u-msg MVP surface check — ${BASE_URL}"
echo "============================================"

echo ""
echo "[Health]"
check "GET /healthz" "200" "${BASE_URL}/healthz"

echo ""
echo "[Search — temporary surface]"
check "GET /api/search?q=test" "200" "${BASE_URL}/api/search?q=test"
check_json_field "GET /api/search status field" "${BASE_URL}/api/search?q=test" "status" '"not_wired"'
check "GET /api/search (missing q)" "400" "${BASE_URL}/api/search"

echo ""
echo "[Sessions — temporary surface]"
check "GET /api/sessions" "200" "${BASE_URL}/api/sessions"
check_json_field "GET /api/sessions status field" "${BASE_URL}/api/sessions" "status" '"not_wired"'

echo ""
echo "[Chains — requires u-db]"
check "GET /api/chains (missing participant)" "400" "${BASE_URL}/api/chains"
check "POST /api/chains (missing header)" "400" \
  -X POST -H "Content-Type: application/json" -d '{}' "${BASE_URL}/api/chains"

echo ""
echo "[Inbox — requires u-db]"
check "GET /api/inbox (missing for)" "400" "${BASE_URL}/api/inbox"

echo ""
echo "[WebSocket]"
WS_BASE="${BASE_URL/http:/ws:}"
WS_BASE="${WS_BASE/https:/wss:}"
check_ws "WS /ws/stream?participant=check-mvp" "${WS_BASE}/ws/stream?participant=check-mvp"

echo ""
echo "============================================"
echo "Results: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  printf "\nFailures:%b\n" "$ERRORS"
  exit 1
fi

echo "All checks passed."
