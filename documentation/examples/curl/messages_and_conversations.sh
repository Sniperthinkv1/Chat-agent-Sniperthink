#!/bin/bash

# Multi-Channel AI Agent API - Messages and Conversations Examples
# This script demonstrates message and conversation API endpoints

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-your_api_key_here}"
USER_ID="${USER_ID:-user_123}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Multi-Channel AI Agent API - Messages & Conversations ===${NC}\n"

# 1. Get Messages with Filtering
echo -e "${GREEN}1. Get Messages with Filtering${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/messages?limit=10&sender=user&status=sent" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 2. Get Messages by Date Range
echo -e "${GREEN}2. Get Messages by Date Range${NC}"
START_DATE=$(date -u -d '7 days ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-7d +"%Y-%m-%dT%H:%M:%SZ")
END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
curl -X GET "${BASE_URL}/users/${USER_ID}/messages?start_date=${START_DATE}&end_date=${END_DATE}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 3. Get Messages by Conversation
echo -e "${GREEN}3. Get Messages by Conversation${NC}"
CONVERSATION_ID="${CONVERSATION_ID:-conv_123}"
curl -X GET "${BASE_URL}/users/${USER_ID}/messages?conversation_id=${CONVERSATION_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 4. Get Message Statistics
echo -e "${GREEN}4. Get Message Statistics${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/messages/stats?time_range=day" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 5. Get Message Statistics by Agent
echo -e "${GREEN}5. Get Message Statistics by Agent${NC}"
AGENT_ID="${AGENT_ID:-agent_123}"
curl -X GET "${BASE_URL}/users/${USER_ID}/messages/stats?agent_id=${AGENT_ID}&time_range=week" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 6. List Conversations
echo -e "${GREEN}6. List Conversations${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/conversations?limit=20&is_active=true" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 7. List Conversations by Agent
echo -e "${GREEN}7. List Conversations by Agent${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/conversations?agent_id=${AGENT_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 8. Get Conversation Details
echo -e "${GREEN}8. Get Conversation Details${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/conversations/${CONVERSATION_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 9. Get Conversation Messages
echo -e "${GREEN}9. Get Conversation Messages${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/conversations/${CONVERSATION_ID}/messages?limit=50" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 10. Get Conversation Messages with Pagination
echo -e "${GREEN}10. Get Conversation Messages with Pagination${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/conversations/${CONVERSATION_ID}/messages?limit=20&offset=20" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

echo -e "${BLUE}=== Examples Complete ===${NC}"
echo -e "${YELLOW}Note: Replace USER_ID, API_KEY, CONVERSATION_ID, and AGENT_ID with actual values${NC}"
