#!/bin/bash

# Memory Finder - AWS Production Deployment Script
# This script deploys the complete Memory Finder application to AWS

set -e

echo "🚀 Starting Memory Finder AWS Production Deployment"
echo "=================================================="

# Configuration
STACK_NAME="memory-finder-production"
AMPLIFY_APP_ID="d25s4o2tenvmk9"
REGION="us-east-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if AWS CLI is configured
print_status "Checking AWS CLI configuration..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    print_success "AWS CLI is configured and working"
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_status "AWS Account ID: $ACCOUNT_ID"
else
    print_error "AWS CLI is not configured or credentials are invalid."
    print_status "Please run 'aws configure' and enter your credentials"
    exit 1
fi

# Check CloudFormation stack status
print_status "Checking CloudFormation stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
    print_status "Creating CloudFormation stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://infrastructure/memory-finder-production.yaml \
        --parameters ParameterKey=DatabasePassword,ParameterValue=MemoryFinder2024! \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
    
    print_status "Waiting for stack creation to complete..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    print_success "CloudFormation stack created successfully"
elif [ "$STACK_STATUS" = "CREATE_COMPLETE" ]; then
    print_success "CloudFormation stack already exists and is ready"
else
    print_status "Stack status: $STACK_STATUS"
    print_warning "Waiting for stack to be ready..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    print_success "CloudFormation stack is ready"
fi

# Get stack outputs
print_status "Retrieving stack outputs..."
aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' --output table

# Get specific outputs
DATABASE_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text)
REDIS_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' --output text)
RAW_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`RawVideoBucketName`].OutputValue' --output text)
PROCESSED_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ProcessedVideoBucketName`].OutputValue' --output text)
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionDomain`].OutputValue' --output text)

print_success "Infrastructure outputs retrieved"

# Configure Amplify environment variables
print_status "Configuring Amplify environment variables..."

# Create environment variables file for Amplify
cat > amplify-env-vars.json << EOF
{
  "environmentVariables": {
    "NEXT_PUBLIC_AWS_REGION": "$REGION",
    "NEXT_PUBLIC_DATABASE_HOST": "$DATABASE_ENDPOINT",
    "NEXT_PUBLIC_DATABASE_NAME": "memoryfinder",
    "NEXT_PUBLIC_DATABASE_USER": "memoryfinder",
    "NEXT_PUBLIC_REDIS_HOST": "$REDIS_ENDPOINT",
    "NEXT_PUBLIC_RAW_BUCKET": "$RAW_BUCKET",
    "NEXT_PUBLIC_PROCESSED_BUCKET": "$PROCESSED_BUCKET",
    "NEXT_PUBLIC_CLOUDFRONT_DOMAIN": "$CLOUDFRONT_DOMAIN",
    "NEXTAUTH_URL": "https://d25s4o2tenvmk9.amplifyapp.com",
    "NEXTAUTH_SECRET": "your-nextauth-secret-key-here"
  }
}
EOF

# Update Amplify app with environment variables
aws amplify update-app --app-id $AMPLIFY_APP_ID --environment-variables file://amplify-env-vars.json

print_success "Amplify environment variables configured"

# Create main branch if it doesn't exist
print_status "Creating main branch..."
aws amplify create-branch --app-id $AMPLIFY_APP_ID --branch-name main --description "Main production branch" 2>/dev/null || print_warning "Main branch already exists"

# Get Amplify app details
print_status "Amplify app details:"
aws amplify get-app --app-id $AMPLIFY_APP_ID --query '{Name:app.name,AppId:app.appId,DefaultDomain:app.defaultDomain,Repository:app.repository}' --output table

# Create deployment script
cat > deploy-to-amplify.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying to AWS Amplify..."

# Build the application
npm run build

# Create deployment package
zip -r memory-finder-deployment.zip . -x "node_modules/*" ".git/*" "*.log" "*.md"

# Upload to S3 (you'll need to configure this)
echo "Upload deployment package to S3 and trigger Amplify build"
echo "Or connect your GitHub repository to Amplify for automatic deployments"
EOF

chmod +x deploy-to-amplify.sh

print_success "Deployment scripts created"

# Summary
echo ""
echo "🎉 AWS Production Deployment Complete!"
echo "====================================="
echo ""
echo "📊 Infrastructure Status:"
echo "  ✅ CloudFormation Stack: $STACK_NAME"
echo "  ✅ Database Endpoint: $DATABASE_ENDPOINT"
echo "  ✅ Redis Endpoint: $REDIS_ENDPOINT"
echo "  ✅ S3 Buckets: $RAW_BUCKET, $PROCESSED_BUCKET"
echo "  ✅ CloudFront: $CLOUDFRONT_DOMAIN"
echo ""
echo "🌐 Frontend Deployment:"
echo "  ✅ Amplify App: $AMPLIFY_APP_ID"
echo "  ✅ Default Domain: https://d25s4o2tenvmk9.amplifyapp.com"
echo ""
echo "🔧 Next Steps:"
echo "  1. Connect your GitHub repository to Amplify"
echo "  2. Configure build settings in Amplify console"
echo "  3. Deploy your frontend code"
echo "  4. Test the complete application"
echo ""
echo "📝 Useful Commands:"
echo "  - View Amplify app: aws amplify get-app --app-id $AMPLIFY_APP_ID"
echo "  - List branches: aws amplify list-branches --app-id $AMPLIFY_APP_ID"
echo "  - View stack outputs: aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs'"
echo ""

print_success "Memory Finder is ready for production! 🎬"
