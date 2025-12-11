#!/bin/bash

# Multi-Channel AI Agent API - Cache Management Examples
# This script demonstrates cache management API endpoints

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-your_api_key_here}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Multi-Channel AI Agent API - Cache Management ===${NC}\n"

# 1. Invalidate Session Cache
echo -e "${GREEN}1. Invalidate Session Cache${NC}"
PHONE_NUMBER_ID="${PHONE_NUMBER_ID:-phone_123}"
CUSTOMER_PHONE="${CUSTOMER_PHONE:-+1234567890}"
curl -X POST "${BASE_URL}/api/cache/invalidate/session" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumberId\": \"${PHONE_NUMBER_ID}\",
    \"customerPhone\": \"${CUSTOMER_PHONE}\"
  }"
echo -e "\n"

# 2. Invalidate Phone Number Cache
echo -e "${GREEN}2. Invalidate Phone Number Cache${NC}"
curl -X POST "${BASE_URL}/api/cache/invalidate/phone-number" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumberId\": \"${PHONE_NUMBER_ID}\"
  }"
echo -e "\n"

# 3. Invalidate Agent Cache
echo -e "${GREEN}3. Invalidate Agent Cache${NC}"
AGENT_ID="${AGENT_ID:-agent_123}"
curl -X POST "${BASE_URL}/api/cache/invalidate/agent" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"${AGENT_ID}\"
  }"
echo -e "\n"

# 4. Invalidate Credits Cache
echo -e "${GREEN}4. Invalidate Credits Cache${NC}"
USER_ID="${USER_ID:-user_123}"
curl -X POST "${BASE_URL}/api/cache/invalidate/credits" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"${USER_ID}\"
  }"
echo -e "\n"

# 5. Get Cache Statistics
echo -e "${GREEN}5. Get Cache Statistics${NC}"
curl -X GET "${BASE_URL}/api/cache/stats" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 6. Clear All Cache (Disabled)
echo -e "${YELLOW}6. Clear All Cache (Feature Disabled)${NC}"
curl -X POST "${BASE_URL}/api/cache/clear-all" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

echo -e "${BLUE}=== Cache Management Use Cases ===${NC}\n"

echo -e "${YELLOW}When to Invalidate Cache:${NC}"
echo -e "  • Session Cache: After updating agent configuration"
echo -e "  • Phone Number Cache: After changing phone number settings"
echo -e "  • Agent Cache: After updating agent prompt or name"
echo -e "  • Credits Cache: After manual credit adjustment"
echo -e "\n"

echo -e "${YELLOW}Performance Note:${NC}"
echo -e "  • Cache operations are optimized for Upstash free tier"
echo -e "  • Clear-all and stats endpoints are disabled to conserve resources"
echo -e "  • Use specific cache invalidation endpoints instead"
echo -e "\n"

echo -e "${BLUE}=== Examples Complete ===${NC}"
echo -e "${YELLOW}Note: Replace API_KEY, USER_ID, PHONE_NUMBER_ID, AGENT_ID, and CUSTOMER_PHONE with actual values${NC}"
