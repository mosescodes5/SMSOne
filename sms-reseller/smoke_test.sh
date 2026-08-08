#!/bin/bash
set -e
BASE=http://127.0.0.1:8811

echo "-- register --"
curl -s -X POST "$BASE/auth/register?email=test@example.com&password=pass1234"
echo -e "\n-- login --"
TOKEN=$(curl -s -X POST "$BASE/auth/login" -d "username=test@example.com&password=pass1234" -H "Content-Type: application/x-www-form-urlencoded" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
echo "token acquired: ${TOKEN:0:20}..."

echo -e "\n-- topup --"
curl -s -X POST "$BASE/wallet/topup/dev-only?amount_ngn=2000" -H "Authorization: Bearer $TOKEN"

echo -e "\n-- price preview --"
curl -s "$BASE/orders/price?service=whatsapp&country=nigeria"

echo -e "\n-- buy number --"
ORDER=$(curl -s -X POST "$BASE/orders?service=whatsapp&country=nigeria" -H "Authorization: Bearer $TOKEN")
echo "$ORDER"
ORDER_ID=$(echo "$ORDER" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo -e "\n-- poll for sms (mock delivers after 2-5 polls) --"
for i in 1 2 3 4 5 6; do
  sleep 0.3
  RESULT=$(curl -s "$BASE/orders/$ORDER_ID" -H "Authorization: Bearer $TOKEN")
  echo "poll $i: $RESULT"
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])")
  if [ "$STATUS" != "pending" ]; then break; fi
done

echo -e "\n-- final wallet balance --"
curl -s "$BASE/wallet/balance" -H "Authorization: Bearer $TOKEN"

echo -e "\n-- ledger --"
curl -s "$BASE/wallet/ledger" -H "Authorization: Bearer $TOKEN"
echo ""
