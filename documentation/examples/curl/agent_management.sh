#!/bin/bash

# Multi-Channel AI Agent API - Agent Management Examples
# This script demonstrates all agent management operations

# Configuration
API_BASE_URL="https://api.example.com/v1"
API_KEY="sk_live_..."
USER_ID="usr_abc123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Agent Management Examples ===${NC}\n"

# 1. Create Agent
echo -e "${GREEN}1. Create Agent${NC}"
curl -X POST "${API_BASE_URL}/users/${USER_ID}/agents" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_abc123",
    "prompt_id": "prompt_xyz789",
    "name": "Customer Support Agent"
  }' | jq '.'

echo -e "\n"

# 2. List All Agents
echo -e "${GREEN}2. List All Agents${NC}"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/agents" \
  -H "x-api-key: ${API_KEY}" | jq '.'

echo -e "\n"

# 3. Get Specific Agent
echo -e "${GREEN}3. Get Specific Agent${NC}"
AGENT_ID="agt_xyz789"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/agents/${AGENT_ID}" \
  -H "x-api-key: ${API_KEY}" | jq '.'

echo -e "\n"

# 4. Update Agent Name
echo -e "${GREEN}4. Update Agent Name${NC}"
curl -X PATCH "${API_BASE_URL}/users/${USER_ID}/agents/${AGENT_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Support Agent"
  }' | jq '.'

echo -e "\n"

# 5. Delete Agent
echo -e "${GREEN}5. Delete Agent${NC}"
curl -X DELETE "${API_BASE_URL}/users/${USER_ID}/agents/${AGENT_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n"

# 6. Create Multiple Agents for Different Channels
echo -e "${GREEN}6. Create WhatsApp Agent${NC}"
curl -X POST "${API_BASE_URL}/users/${USER_ID}/agents" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_whatsapp_123",
    "prompt_id": "prompt_support_v1",
    "name": "WhatsApp Support Bot"
  }' | jq '.'

echo -e "\n"

echo -e "${GREEN}7. Create Instagram Agent${NC}"
curl -X POST "${API_BASE_URL}/users/${USER_ID}/agents" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_instagram_456",
    "prompt_id": "prompt_sales_v2",
    "name": "Instagram Sales Assistant"
  }' | jq '.'

echo -e "\n${BLUE}=== Examples Complete ===${NC}"
