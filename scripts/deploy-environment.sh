#!/bin/bash

# Memory Finder - Environment Deployment Script
# Usage: ./scripts/deploy-environment.sh [environment] [region]

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-2}
STACK_NAME="memory-finder-${ENVIRONMENT}"

echo "🚀 Memory Finder Environment Deployment"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Check which template to use
TEMPLATE_FILE=""
case $ENVIRONMENT in
    dev)
        TEMPLATE_FILE="infrastructure/memory-finder-dev.yaml"
        ;;
    staging)
        TEMPLATE_FILE="infrastructure/memory-finder-staging.yaml"
        ;;
    prod)
        TEMPLATE_FILE="infrastructure/memory-finder-core.yaml"
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Valid environments: dev, staging, prod"
        exit 1
        ;;
esac

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

echo "📋 Deployment Plan:"
echo "- Template: $TEMPLATE_FILE"
echo "- Stack Name: $STACK_NAME"
echo "- Region: $REGION"
echo ""

# Check if stack exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME >/dev/null 2>&1; then
    echo "🔄 Stack exists - updating..."
    OPERATION="update"
else
    echo "🆕 Stack does not exist - creating..."
    OPERATION="create"
fi

# Deploy the stack
echo "📦 Deploying infrastructure..."
aws cloudformation deploy \
    --template-file $TEMPLATE_FILE \
    --stack-name $STACK_NAME \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region $REGION \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo "✅ Infrastructure deployment completed successfully!"
    echo ""
    
    # Get outputs
    echo "📊 Stack Outputs:"
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    # Save environment variables
    echo ""
    echo "💾 Saving environment variables..."
    
    # Extract key values
    RAW_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`*RawVideoBucket*`].OutputValue' --output text | head -1)
    PROJECTS_TABLE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`*ProjectsTable*`].OutputValue' --output text | head -1)
    LAMBDA_ROLE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`*LambdaExecutionRole*`].OutputValue' --output text | head -1)
    
    # Save to environment file
    ENV_FILE=".env.${ENVIRONMENT}"
    cat > $ENV_FILE << EOF
# Memory Finder ${ENVIRONMENT} Environment
ENVIRONMENT=${ENVIRONMENT}
AWS_REGION=${REGION}

# Storage
RAW_VIDEO_BUCKET=${RAW_BUCKET}
PROJECTS_TABLE=${PROJECTS_TABLE}

# Compute
LAMBDA_ROLE_ARN=${LAMBDA_ROLE}

# App URLs
NEXTAUTH_URL=https://memory-finder-${ENVIRONMENT}.amplifyapp.com
EOF
    
    echo "✅ Environment configured: $ENV_FILE"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Run: source $ENV_FILE"
    echo "2. Run: npm run dev"
    echo "3. Visit: http://localhost:3000"
else
    echo "❌ Deployment failed!"
    exit 1
fi

