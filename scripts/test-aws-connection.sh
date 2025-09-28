#!/bin/bash

# Memory Finder - AWS Connection Test Script

echo "🔍 Testing AWS CLI Connection"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test 1: Check if AWS CLI is installed
print_status "Testing AWS CLI installation..."
if command -v aws &> /dev/null; then
    print_success "AWS CLI is installed: $(aws --version)"
else
    print_error "AWS CLI is not installed"
    exit 1
fi

# Test 2: Check AWS configuration
print_status "Testing AWS configuration..."
aws configure list

# Test 3: Test AWS credentials
print_status "Testing AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    print_success "AWS credentials are valid"
    
    # Get account info
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    
    echo "  Account ID: $ACCOUNT_ID"
    echo "  User ARN: $USER_ARN"
else
    print_error "AWS credentials are invalid or expired"
    print_status "Please run 'aws configure' to set up your credentials"
    exit 1
fi

# Test 4: Test AWS services access
print_status "Testing AWS services access..."

# Test S3
if aws s3 ls > /dev/null 2>&1; then
    print_success "S3 access: OK"
else
    print_warning "S3 access: Failed"
fi

# Test CloudFormation
if aws cloudformation list-stacks --max-items 1 > /dev/null 2>&1; then
    print_success "CloudFormation access: OK"
else
    print_warning "CloudFormation access: Failed"
fi

# Test Amplify
if aws amplify list-apps --max-items 1 > /dev/null 2>&1; then
    print_success "Amplify access: OK"
else
    print_warning "Amplify access: Failed"
fi

# Test Lambda
if aws lambda list-functions --max-items 1 > /dev/null 2>&1; then
    print_success "Lambda access: OK"
else
    print_warning "Lambda access: Failed"
fi

echo ""
print_success "AWS connection test completed!"
echo ""
echo "If all tests passed, you can run the deployment script:"
echo "  ./scripts/deploy-aws-production.sh"

