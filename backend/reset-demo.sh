#!/bin/bash
# Reset demo stock + clear orders without opening the Supabase dashboard.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

echo "🔄 Resetting DukaanPilot demo state…"

STORE='00000000-0000-0000-0000-000000000001'
H_KEY="apikey: $SUPABASE_SECRET_KEY"
H_AUTH="Authorization: Bearer $SUPABASE_SECRET_KEY"

# Clear this store's orders (order_items cascade) and logs.
for t in orders activity_logs; do
  curl -s -X DELETE "$SUPABASE_URL/rest/v1/$t?store_id=eq.$STORE" -H "$H_KEY" -H "$H_AUTH" > /dev/null
done

# Restore known stock levels.
declare -a SKUS=(MAG001:37 AMU001:18 AMU002:7 BRI001:4 AMU003:13 PAR001:26 \
                 COK001:11 LAY001:19 SUR001:6 AAS001:3 TAT001:45 FOR001:8 \
                 COL001:12 LUX001:22 RED001:9)
for pair in "${SKUS[@]}"; do
  sku="${pair%%:*}"; qty="${pair##*:}"
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/products?sku=eq.$sku&store_id=eq.$STORE" \
    -H "$H_KEY" -H "$H_AUTH" -H 'Content-Type: application/json' \
    -d "{\"stock_quantity\": $qty}" > /dev/null
done

echo "✅ Stock restored. Key demo values:"
curl -s "$SUPABASE_URL/rest/v1/products?select=name,stock_quantity&sku=in.(MAG001,AMU001,AMU002,BRI001)" \
  -H "$H_KEY" -H "$H_AUTH"
echo
