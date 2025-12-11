#!/bin/bash

# Multi-Channel AI Agent API - Lead Extractions Examples
# This script demonstrates extraction API endpoints

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-your_api_key_here}"
USER_ID="${USER_ID:-user_123}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Multi-Channel AI Agent API - Lead Extractions ===${NC}\n"

# 1. Get All Extractions (with history)
echo -e "${GREEN}1. Get All Extractions (with history)${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions?limit=20" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 2. Get Latest Extractions Only
echo -e "${GREEN}2. Get Latest Extractions Only${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions?latest_only=true&limit=20" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 3. Filter Extractions with Email
echo -e "${GREEN}3. Filter Extractions with Email${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions?has_email=true" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 4. Filter Extractions with Demo Booking
echo -e "${GREEN}4. Filter Extractions with Demo Booking${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions?has_demo=true" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 5. Filter by Minimum Urgency and Fit
echo -e "${GREEN}5. Filter by Minimum Urgency and Fit${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions?min_urgency=2&min_fit=2" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 6. Filter by Agent
echo -e "${GREEN}6. Filter Extractions by Agent${NC}"
AGENT_ID="${AGENT_ID:-agent_123}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions?agent_id=${AGENT_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 7. Get Extraction Statistics
echo -e "${GREEN}7. Get Extraction Statistics${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions/stats?time_range=week" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 8. Get Extraction Statistics by Agent
echo -e "${GREEN}8. Get Extraction Statistics by Agent${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions/stats?agent_id=${AGENT_ID}&time_range=month" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 9. Export Extractions as JSON
echo -e "${GREEN}9. Export Extractions as JSON${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions/export?format=json" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 10. Export Extractions as CSV
echo -e "${GREEN}10. Export Extractions as CSV${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions/export?format=csv" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -o "extractions_export.csv"
echo -e "Saved to extractions_export.csv\n"

# 11. Export Filtered Extractions
echo -e "${GREEN}11. Export Filtered Extractions (High Quality Leads)${NC}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions/export?format=csv&has_email=true&min_urgency=2&min_fit=2" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -o "high_quality_leads.csv"
echo -e "Saved to high_quality_leads.csv\n"

# 12. Get Specific Extraction
echo -e "${GREEN}12. Get Specific Extraction${NC}"
EXTRACTION_ID="${EXTRACTION_ID:-ext_123}"
curl -X GET "${BASE_URL}/users/${USER_ID}/extractions/${EXTRACTION_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 13. Get Conversation Extraction
echo -e "${GREEN}13. Get Latest Extraction for Conversation${NC}"
CONVERSATION_ID="${CONVERSATION_ID:-conv_123}"
curl -X GET "${BASE_URL}/users/${USER_ID}/conversations/${CONVERSATION_ID}/extraction" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

# 14. Trigger Manual Extraction
echo -e "${GREEN}14. Trigger Manual Extraction${NC}"
curl -X POST "${BASE_URL}/users/${USER_ID}/conversations/${CONVERSATION_ID}/extract" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
echo -e "\n"

echo -e "${BLUE}=== Examples Complete ===${NC}"
echo -e "${YELLOW}Note: Replace USER_ID, API_KEY, AGENT_ID, CONVERSATION_ID, and EXTRACTION_ID with actual values${NC}"
echo -e "${YELLOW}Tip: Use min_urgency and min_fit filters to find high-quality leads (scores 2-3)${NC}"
