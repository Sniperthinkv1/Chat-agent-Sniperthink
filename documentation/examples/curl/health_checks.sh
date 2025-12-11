#!/bin/bash

# Multi-Channel AI Agent API - Health Check Examples
# This script demonstrates health check and monitoring endpoints

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Multi-Channel AI Agent API - Health Checks ===${NC}\n"

# 1. Simple Ping Check
echo -e "${GREEN}1. Simple Ping Check${NC}"
echo -e "${YELLOW}Use this for basic connectivity testing${NC}"
curl -X GET "${BASE_URL}/ping" \
  -H "Content-Type: application/json"
echo -e "\n"

# 2. Detailed Health Check
echo -e "${GREEN}2. Detailed Health Check${NC}"
echo -e "${YELLOW}Returns database and storage status${NC}"
curl -X GET "${BASE_URL}/health" \
  -H "Content-Type: application/json"
echo -e "\n"

# 3. Health Check with Pretty Print
echo -e "${GREEN}3. Health Check with Pretty Print${NC}"
curl -X GET "${BASE_URL}/health" \
  -H "Content-Type: application/json" | python -m json.tool 2>/dev/null || cat
echo -e "\n"

# 4. Health Check - Extract Status Only
echo -e "${GREEN}4. Health Check - Extract Status Only${NC}"
STATUS=$(curl -s -X GET "${BASE_URL}/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$STATUS" = "healthy" ]; then
  echo -e "${GREEN}✓ Service is healthy${NC}"
else
  echo -e "${RED}✗ Service is unhealthy${NC}"
fi
echo -e "\n"

# 5. Monitoring Script Example
echo -e "${GREEN}5. Monitoring Script Example${NC}"
echo -e "${YELLOW}Continuous health monitoring (press Ctrl+C to stop)${NC}"
echo -e "${YELLOW}Checking every 30 seconds...${NC}\n"

# Uncomment to run continuous monitoring
# while true; do
#   TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
#   RESPONSE=$(curl -s -X GET "${BASE_URL}/health")
#   STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
#   
#   if [ "$STATUS" = "healthy" ]; then
#     echo -e "${TIMESTAMP} - ${GREEN}✓ Healthy${NC}"
#   else
#     echo -e "${TIMESTAMP} - ${RED}✗ Unhealthy${NC}"
#     echo $RESPONSE | python -m json.tool 2>/dev/null || echo $RESPONSE
#   fi
#   
#   sleep 30
# done

echo -e "${BLUE}=== Health Check Use Cases ===${NC}\n"

echo -e "${YELLOW}Ping Endpoint (/ping):${NC}"
echo -e "  • Load balancer health checks"
echo -e "  • Basic connectivity testing"
echo -e "  • Uptime monitoring"
echo -e "  • Fast response (no database queries)"
echo -e "\n"

echo -e "${YELLOW}Health Endpoint (/health):${NC}"
echo -e "  • Detailed system status"
echo -e "  • Database connectivity check"
echo -e "  • Storage system status"
echo -e "  • Service version information"
echo -e "  • Deployment verification"
echo -e "\n"

echo -e "${YELLOW}Integration with Monitoring Tools:${NC}"
echo -e "  • Datadog: Use /health for service checks"
echo -e "  • New Relic: Monitor /health endpoint"
echo -e "  • Prometheus: Scrape /health metrics"
echo -e "  • AWS CloudWatch: Health check alarms"
echo -e "  • Kubernetes: Liveness and readiness probes"
echo -e "\n"

echo -e "${BLUE}=== Examples Complete ===${NC}"
echo -e "${YELLOW}Note: No authentication required for health check endpoints${NC}"
