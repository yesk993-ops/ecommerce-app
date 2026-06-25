#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"
PASS=0
FAIL=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local path="$3"
    local expected="$4"
    local data="${5:-}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
    fi
    
    if [ "$response" = "$expected" ]; then
        echo "  PASS: $name (HTTP $response)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name (Expected $expected, got $response)"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== E-Commerce API Integration Tests ==="
echo ""

echo "Health Checks:"
test_endpoint "API Gateway" "GET" "/health" "200"
test_endpoint "Auth Service" "GET" "/api/auth/health" "200"
test_endpoint "User Service" "GET" "/api/users/health" "200"
test_endpoint "Product Service" "GET" "/api/products/health" "200"
test_endpoint "Cart Service" "GET" "/api/cart/health" "200"
test_endpoint "Order Service" "GET" "/api/orders/health" "200"
test_endpoint "Payment Service" "GET" "/api/payments/health" "200"
test_endpoint "Inventory Service" "GET" "/api/inventory/health" "200"
test_endpoint "Notification Service" "GET" "/api/notifications/health" "200"

echo ""
echo "Auth Flow:"
test_endpoint "Register User" "POST" "/api/auth/register" "201" '{"email":"test@test.com","password":"testpass123"}'
test_endpoint "Login User" "POST" "/api/auth/login" "200" '{"email":"test@test.com","password":"testpass123"}'
test_endpoint "Login Wrong Password" "POST" "/api/auth/login" "401" '{"email":"test@test.com","password":"wrong"}'

echo ""
echo "Product Flow:"
test_endpoint "List Products" "GET" "/api/products" "200"
test_endpoint "Create Category" "POST" "/api/products/categories" "201" '{"name":"Electronics","slug":"electronics"}'

echo ""
echo "Cart Flow (needs auth token):"
# Get token first
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"testpass123"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    test_endpoint "Get Cart" "GET" "/api/cart" "200"
    test_endpoint "Add to Cart" "POST" "/api/cart/items" "201" \
        '{"productId":"00000000-0000-0000-0000-000000000001","productName":"Test","unitPrice":9.99,"quantity":1}'
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
