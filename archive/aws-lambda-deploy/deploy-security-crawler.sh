#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  AiVedha Guard - Security Crawler Lambda Deployment Script                   ║
# ║  Version: 5.1.0 "QUANTUM FORTRESS PRO"                                       ║
# ║                                                                              ║
# ║  This script packages and deploys the enhanced security crawler Lambda       ║
# ║  with all new modules:                                                       ║
# ║  - progress_tracker.py                                                       ║
# ║  - error_handling.py                                                         ║
# ║  - advanced_security_checks.py                                               ║
# ║  - performance.py                                                            ║
# ║  - structured_logging.py                                                     ║
# ║  - module_integration.py                                                     ║
# ║  - enhanced_handler.py                                                       ║
# ║                                                                              ║
# ║  Owner: Aravind Jayamohan                                                    ║
# ║  Company: AiVibe Software Services Pvt Ltd                                   ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LAMBDA_FUNCTION_NAME="aivedha-security-crawler"
AUDIT_STATUS_FUNCTION_NAME="aivedha-audit-status"
AWS_REGION="us-east-1"
S3_BUCKET="aivedha-lambda-deployments"

# Directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_CRAWLER_DIR="$SCRIPT_DIR/security-crawler"
AUDIT_STATUS_DIR="$SCRIPT_DIR/audit-status"
BUILD_DIR="$SCRIPT_DIR/build"
PACKAGE_DIR="$BUILD_DIR/package"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  AiVedha Guard - Lambda Deployment v5.1.0${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"

# Step 1: Create build directory
echo -e "\n${YELLOW}[1/8] Creating build directory...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$PACKAGE_DIR"

# Step 2: Copy all Python files for security crawler
echo -e "${YELLOW}[2/8] Copying security crawler files...${NC}"
cp "$SECURITY_CRAWLER_DIR"/*.py "$PACKAGE_DIR/"

# List of all modules to include
MODULES=(
    "lambda_function.py"
    "enhanced_handler.py"
    "progress_tracker.py"
    "error_handling.py"
    "advanced_security_checks.py"
    "performance.py"
    "structured_logging.py"
    "module_integration.py"
    "security-audit-crawler.py"
    "url_validator.py"
    "pdf_generator.py"
    "email_templates.py"
)

echo -e "${GREEN}  ✓ Copied ${#MODULES[@]} Python modules${NC}"

# Step 3: Install dependencies
echo -e "${YELLOW}[3/8] Installing Python dependencies...${NC}"
cd "$PACKAGE_DIR"

# Create a clean pip install
pip install \
    --target . \
    --upgrade \
    --platform manylinux2014_x86_64 \
    --only-binary=:all: \
    -r "$SECURITY_CRAWLER_DIR/requirements.txt" 2>/dev/null || {
        echo -e "${YELLOW}  ⚠ Some packages may need alternative installation${NC}"
        pip install --target . -r "$SECURITY_CRAWLER_DIR/requirements.txt"
    }

echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# Step 4: Remove unnecessary files to reduce package size
echo -e "${YELLOW}[4/8] Optimizing package size...${NC}"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true

# Remove large unnecessary packages
rm -rf botocore boto3 2>/dev/null || true  # Available in Lambda runtime

PACKAGE_SIZE=$(du -sh . | cut -f1)
echo -e "${GREEN}  ✓ Package size: ${PACKAGE_SIZE}${NC}"

# Step 5: Create ZIP package for security crawler
echo -e "${YELLOW}[5/8] Creating deployment ZIP for security crawler...${NC}"
cd "$PACKAGE_DIR"
zip -r9 "$BUILD_DIR/security-crawler.zip" . -x "*.git*" > /dev/null

CRAWLER_ZIP_SIZE=$(ls -lh "$BUILD_DIR/security-crawler.zip" | awk '{print $5}')
echo -e "${GREEN}  ✓ security-crawler.zip created (${CRAWLER_ZIP_SIZE})${NC}"

# Step 6: Package audit-status Lambda
echo -e "${YELLOW}[6/8] Packaging audit-status Lambda...${NC}"
cd "$AUDIT_STATUS_DIR"
zip -r9 "$BUILD_DIR/audit-status.zip" lambda_function.py > /dev/null

STATUS_ZIP_SIZE=$(ls -lh "$BUILD_DIR/audit-status.zip" | awk '{print $5}')
echo -e "${GREEN}  ✓ audit-status.zip created (${STATUS_ZIP_SIZE})${NC}"

# Step 7: Deploy to AWS (optional - requires AWS CLI configured)
echo -e "${YELLOW}[7/8] Deploying to AWS Lambda...${NC}"

# Check if AWS CLI is available
if command -v aws &> /dev/null; then
    # Check if we have valid credentials
    if aws sts get-caller-identity &> /dev/null; then
        
        # Deploy security crawler
        echo -e "  Deploying security crawler Lambda..."
        aws lambda update-function-code \
            --function-name "$LAMBDA_FUNCTION_NAME" \
            --zip-file "fileb://$BUILD_DIR/security-crawler.zip" \
            --region "$AWS_REGION" > /dev/null 2>&1 && \
        echo -e "${GREEN}  ✓ Security crawler deployed${NC}" || \
        echo -e "${RED}  ✗ Failed to deploy security crawler${NC}"
        
        # Update Lambda configuration
        echo -e "  Updating Lambda configuration..."
        aws lambda update-function-configuration \
            --function-name "$LAMBDA_FUNCTION_NAME" \
            --handler "enhanced_handler.lambda_handler" \
            --timeout 900 \
            --memory-size 1024 \
            --region "$AWS_REGION" > /dev/null 2>&1 && \
        echo -e "${GREEN}  ✓ Configuration updated (handler: enhanced_handler.lambda_handler)${NC}" || \
        echo -e "${YELLOW}  ⚠ Configuration update skipped (function may not exist)${NC}"
        
        # Deploy audit-status
        echo -e "  Deploying audit-status Lambda..."
        aws lambda update-function-code \
            --function-name "$AUDIT_STATUS_FUNCTION_NAME" \
            --zip-file "fileb://$BUILD_DIR/audit-status.zip" \
            --region "$AWS_REGION" > /dev/null 2>&1 && \
        echo -e "${GREEN}  ✓ Audit status Lambda deployed${NC}" || \
        echo -e "${RED}  ✗ Failed to deploy audit status Lambda${NC}"
        
    else
        echo -e "${YELLOW}  ⚠ AWS credentials not configured - skipping deployment${NC}"
        echo -e "  Run 'aws configure' to set up credentials"
    fi
else
    echo -e "${YELLOW}  ⚠ AWS CLI not installed - skipping deployment${NC}"
    echo -e "  Install with: brew install awscli"
fi

# Step 8: Summary
echo -e "\n${YELLOW}[8/8] Deployment Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}✓${NC} Build artifacts created in: $BUILD_DIR"
echo -e "  ${GREEN}✓${NC} security-crawler.zip: ${CRAWLER_ZIP_SIZE}"
echo -e "  ${GREEN}✓${NC} audit-status.zip: ${STATUS_ZIP_SIZE}"
echo -e ""
echo -e "  ${BLUE}New modules included:${NC}"
echo -e "    • progress_tracker.py    - Real-time scan progress"
echo -e "    • error_handling.py      - Circuit breakers & retry logic"
echo -e "    • advanced_security_checks.py - HTTP/2, HSTS, SRI analysis"
echo -e "    • performance.py         - Connection pooling & caching"
echo -e "    • structured_logging.py  - CloudWatch-optimized logging"
echo -e "    • module_integration.py  - Unified integration layer"
echo -e "    • enhanced_handler.py    - New Lambda entry point"
echo -e ""
echo -e "  ${BLUE}Manual deployment commands:${NC}"
echo -e "    aws lambda update-function-code \\"
echo -e "      --function-name $LAMBDA_FUNCTION_NAME \\"
echo -e "      --zip-file fileb://$BUILD_DIR/security-crawler.zip \\"
echo -e "      --region $AWS_REGION"
echo -e ""
echo -e "    aws lambda update-function-configuration \\"
echo -e "      --function-name $LAMBDA_FUNCTION_NAME \\"
echo -e "      --handler enhanced_handler.lambda_handler \\"
echo -e "      --region $AWS_REGION"
echo -e ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Deployment preparation complete!${NC}"
