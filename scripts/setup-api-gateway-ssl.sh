#!/bin/bash
# =============================================================================
# AiVedha Guardian - API Gateway SSL Configuration Script
# Phase 2: Configure single SSL certificate for both regions
# =============================================================================
#
# IMPORTANT: Review and execute these commands manually in production
# This script serves as documentation and automation reference
#
# SSL Strategy: Use us-east-1 certificate globally via edge-optimized API Gateway
# =============================================================================

set -e

# Configuration
SSL_CERT_ARN="arn:aws:acm:us-east-1:783764610283:certificate/0c0d9965-e4ee-4f2f-8ea0-6123fd78e8a0"
DOMAIN_PRIMARY="api.aivedha.ai"
DOMAIN_INDIA="api-india.aivedha.ai"
REGION_US="us-east-1"
REGION_INDIA="ap-south-1"

# Current API IDs
API_ID_US="btxmpjub05"
API_ID_INDIA="frxi92ysq0"

echo "=========================================="
echo "Phase 2: API Gateway SSL Configuration"
echo "=========================================="
echo ""
echo "SSL Certificate: $SSL_CERT_ARN"
echo "Primary Domain: $DOMAIN_PRIMARY"
echo "India Domain: $DOMAIN_INDIA"
echo ""

# -----------------------------------------------------------------------------
# Step 2.1: Verify Existing US API Gateway Configuration
# -----------------------------------------------------------------------------
echo "Step 2.1: Verifying US API Gateway configuration..."

# Check if custom domain exists for US
us_domain_check=$(aws apigateway get-domain-name \
  --domain-name "$DOMAIN_PRIMARY" \
  --region "$REGION_US" 2>/dev/null || echo "not_found")

if [ "$us_domain_check" != "not_found" ]; then
  echo "  US custom domain already configured: $DOMAIN_PRIMARY"
else
  echo "  US custom domain not found. Creating..."
  aws apigateway create-domain-name \
    --domain-name "$DOMAIN_PRIMARY" \
    --regional-certificate-arn "$SSL_CERT_ARN" \
    --endpoint-configuration types=REGIONAL \
    --region "$REGION_US"

  echo "  Created US custom domain."
fi

# -----------------------------------------------------------------------------
# Step 2.2: Create Edge-Optimized Custom Domain for India
# -----------------------------------------------------------------------------
echo ""
echo "Step 2.2: Configuring India API Gateway with edge-optimized endpoint..."

# Edge-optimized domain can use us-east-1 certificate
india_domain_check=$(aws apigateway get-domain-name \
  --domain-name "$DOMAIN_INDIA" \
  --region "$REGION_INDIA" 2>/dev/null || echo "not_found")

if [ "$india_domain_check" != "not_found" ]; then
  echo "  India custom domain already configured: $DOMAIN_INDIA"
else
  echo "  Creating edge-optimized custom domain for India..."

  # NOTE: For edge-optimized, the certificate MUST be in us-east-1
  # AWS automatically uses CloudFront to distribute the API
  aws apigateway create-domain-name \
    --domain-name "$DOMAIN_INDIA" \
    --certificate-arn "$SSL_CERT_ARN" \
    --endpoint-configuration types=EDGE \
    --region "$REGION_INDIA"

  echo "  Created India edge-optimized custom domain."
fi

# -----------------------------------------------------------------------------
# Step 2.3: Create Base Path Mappings
# -----------------------------------------------------------------------------
echo ""
echo "Step 2.3: Creating base path mappings..."

# US Base Path Mapping
echo "  Creating US base path mapping..."
aws apigateway create-base-path-mapping \
  --domain-name "$DOMAIN_PRIMARY" \
  --rest-api-id "$API_ID_US" \
  --stage "api" \
  --region "$REGION_US" 2>/dev/null || echo "  US mapping may already exist"

# India Base Path Mapping
echo "  Creating India base path mapping..."
aws apigateway create-base-path-mapping \
  --domain-name "$DOMAIN_INDIA" \
  --rest-api-id "$API_ID_INDIA" \
  --stage "api" \
  --region "$REGION_INDIA" 2>/dev/null || echo "  India mapping may already exist"

# -----------------------------------------------------------------------------
# Step 2.4: Get Target Domain Names for DNS Configuration
# -----------------------------------------------------------------------------
echo ""
echo "Step 2.4: Getting target domain names for DNS..."

# US Regional Endpoint
us_target=$(aws apigateway get-domain-name \
  --domain-name "$DOMAIN_PRIMARY" \
  --region "$REGION_US" \
  --query 'regionalDomainName' \
  --output text 2>/dev/null || echo "Not configured")

# India Edge Endpoint (CloudFront distribution)
india_target=$(aws apigateway get-domain-name \
  --domain-name "$DOMAIN_INDIA" \
  --region "$REGION_INDIA" \
  --query 'distributionDomainName' \
  --output text 2>/dev/null || echo "Not configured")

echo ""
echo "=========================================="
echo "DNS Configuration Required (Cloudflare)"
echo "=========================================="
echo ""
echo "Add these CNAME records in Cloudflare:"
echo ""
echo "1. Primary API (USA):"
echo "   Name: api"
echo "   Target: $us_target"
echo "   Proxy: OFF (DNS only)"
echo ""
echo "2. India API:"
echo "   Name: api-india"
echo "   Target: $india_target"
echo "   Proxy: OFF (DNS only)"
echo ""

# -----------------------------------------------------------------------------
# Step 2.5: Verify Configuration
# -----------------------------------------------------------------------------
echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""

# Test US endpoint
echo "Testing US API..."
us_health=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_PRIMARY/health" 2>/dev/null || echo "000")
echo "  $DOMAIN_PRIMARY/health: HTTP $us_health"

# Test India endpoint (if DNS is configured)
echo "Testing India API..."
india_health=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_INDIA/health" 2>/dev/null || echo "000")
echo "  $DOMAIN_INDIA/health: HTTP $india_health"

echo ""
echo "=========================================="
echo "API Gateway Endpoint Summary"
echo "=========================================="
echo ""
echo "| Endpoint | Region     | Type     | Domain            | Certificate    |"
echo "|----------|------------|----------|-------------------|----------------|"
echo "| Primary  | us-east-1  | Regional | api.aivedha.ai    | us-east-1 cert |"
echo "| India    | ap-south-1 | Edge     | api-india.aivedha.ai | us-east-1 cert (via CF) |"
echo ""
echo "=========================================="
echo "Phase 2 Configuration Complete"
echo "=========================================="
