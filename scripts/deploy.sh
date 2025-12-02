#!/bin/bash

# Fundability Snapshot Engine - Automated Deployment Script
# This script handles pre-flight checks, testing, and deployment to Vercel

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Fundability Snapshot Engine - Deployment Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

print_success "Running from correct directory"

# Step 1: Check Node.js version
print_step "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current: $(node -v)"
    exit 1
fi
print_success "Node.js version OK: $(node -v)"

# Step 2: Install dependencies
print_step "Installing dependencies..."
npm install --silent
print_success "Dependencies installed"

# Step 3: Run TypeScript compilation
print_step "Compiling TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Step 4: Run tests
print_step "Running test suite..."
node tests/test-runner.js
if [ $? -eq 0 ]; then
    print_success "All tests passed"
else
    print_error "Tests failed. Fix errors before deploying."
    exit 1
fi

# Step 5: Check for Vercel CLI
print_step "Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi
print_success "Vercel CLI ready"

# Step 6: Deployment confirmation
echo ""
echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Pre-flight checks complete. Ready to deploy!         ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Deployment options:"
echo "  1. Deploy to production (recommended)"
echo "  2. Deploy to preview"
echo "  3. Cancel"
echo ""
read -p "Select option [1-3]: " DEPLOY_OPTION

case $DEPLOY_OPTION in
    1)
        print_step "Deploying to production..."
        vercel --prod
        ;;
    2)
        print_step "Deploying to preview..."
        vercel
        ;;
    3)
        print_warning "Deployment cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

# Step 7: Post-deployment test
echo ""
print_step "Post-deployment validation..."
echo ""
read -p "Enter your deployed URL (e.g., https://your-app.vercel.app): " DEPLOYED_URL

if [ -z "$DEPLOYED_URL" ]; then
    print_warning "Skipping post-deployment test"
    exit 0
fi

print_step "Testing deployed endpoint..."

# Create test payload
TEST_PAYLOAD='{
  "first_name": "Test",
  "last_name": "User",
  "email": "test@example.com",
  "credit_score": 720,
  "revolving_utilization_pct": 25,
  "dti_pct": 30,
  "inquiries_6m": 1,
  "oldest_account_years": 5,
  "open_tradelines": 6,
  "recent_derogs_24m": 0,
  "bk_or_major_event": false,
  "requested_amount": 50000,
  "primary_goal": "business_funding"
}'

# Test the endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${DEPLOYED_URL}/api/fs-snapshot" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Deployment successful! Endpoint responding correctly"
    echo ""
    echo "Sample response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_error "Endpoint test failed with HTTP $HTTP_CODE"
    echo "Response: $BODY"
    exit 1
fi

# Step 8: Success summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 Deployment Complete!                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Your API is now live at:"
echo -e "${BLUE}${DEPLOYED_URL}/api/fs-snapshot${NC}"
echo ""
echo "Next steps:"
echo "  1. Test with the web interface: ${DEPLOYED_URL}/test-interface.html"
echo "  2. Integrate with HubSpot/Airtable/other platforms"
echo "  3. Monitor logs at: https://vercel.com"
echo ""
echo "Documentation:"
echo "  • API Docs: See README.md"
echo "  • Integration Examples: See examples/integrations.js"
echo "  • Deployment Guide: See DEPLOYMENT.md"
echo ""
