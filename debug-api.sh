#!/bin/bash

echo "🔍 Starting API Debug Session"
echo "================================"

# Function to test API with detailed output
test_api() {
    echo "📤 Testing API: $1"
    echo "Request: curl -X POST $1"
    echo "----------------------------------------"
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}s\n" \
        -X POST "$1" \
        -H "Content-Type: application/json" \
        -d '{"test": "debug", "timestamp": "'$(date)'"}')
    
    echo "$response"
    echo "----------------------------------------"
    echo ""
}

# Test different scenarios
echo "1. Testing API Proxy (should return mock data):"
test_api "http://localhost:3001/api/proxy-odoo"

echo "2. Testing Odoo API directly (if running):"
test_api "http://localhost:8069/api/v2/tcm/workflow/get_workflow_steps"

echo "3. Testing with different data:"
curl -s -X POST "http://localhost:3001/api/proxy-odoo" \
    -H "Content-Type: application/json" \
    -d '{"access_token": "test", "model": "test.model", "res_id": 999}' \
    -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🔍 Check Docker logs for detailed debug info:"
echo "docker compose logs -f nextjs-web | grep DEBUG"
