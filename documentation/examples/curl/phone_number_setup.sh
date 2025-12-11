#!/bin/bash

# Multi-Channel AI Agent API - Phone Number Setup Examples
# This script demonstrates phone number and Instagram account management

# Configuration
API_BASE_URL="https://api.example.com/v1"
API_KEY="sk_live_..."
USER_ID="usr_abc123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Phone Number Setup Examples ===${NC}\n"

# 1. Add WhatsApp Business Number
echo -e "${GREEN}1. Add WhatsApp Business Number${NC}"
curl -X POST "${API_BASE_URL}/users/${USER_ID}/phone_numbers" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "whatsapp",
    "meta_phone_number_id": "836990829491415",
    "access_token": "EAAxxxx...",
    "display_name": "+1 (234) 567-8900"
  }' | jq '.'

echo -e "\n"

# 2. Add Instagram Business Account
echo -e "${GREEN}2. Add Instagram Business Account${NC}"
curl -X POST "${API_BASE_URL}/users/${USER_ID}/phone_numbers" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "meta_phone_number_id": "17841234567890123",
    "access_token": "EAAxxxx...",
    "display_name": "@yourbusiness"
  }' | jq '.'

echo -e "\n"

# 3. Add Web Chat Channel
echo -e "${GREEN}3. Add Web Chat Channel${NC}"
curl -X POST "${API_BASE_URL}/users/${USER_ID}/phone_numbers" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "webchat",
    "meta_phone_number_id": "webchat_widget_001",
    "access_token": "internal_token_...",
    "display_name": "Website Chat"
  }' | jq '.'

echo -e "\n"

# 4. List All Phone Numbers
echo -e "${GREEN}4. List All Phone Numbers${NC}"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/phone_numbers" \
  -H "x-api-key: ${API_KEY}" | jq '.'

echo -e "\n"

# 5. Delete Phone Number
echo -e "${GREEN}5. Delete Phone Number${NC}"
PHONE_NUMBER_ID="pn_abc123"
curl -X DELETE "${API_BASE_URL}/users/${USER_ID}/phone_numbers/${PHONE_NUMBER_ID}" \
  -H "x-api-key: ${API_KEY}" \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n${BLUE}=== Examples Complete ===${NC}"
