#!/bin/bash

# Memory Finder Fresh Architecture Deployment Script
# This script cleans up existing resources and deploys the complete CloudFormation stack

set -e

echo "🚀 Memory Finder Fresh Architecture Deployment"
echo "=============================================="
echo "Account: $(aws sts get-caller-identity --query Account --output text)"
echo "Region: $(aws configure get region)"
echo "Stack Name: memory-finder-prod"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if CloudFormation template exists
if [ ! -f "infrastructure/memory-finder-infrastructure.yaml" ]; then
    echo "❌ CloudFormation template not found: infrastructure/memory-finder-infrastructure.yaml"
    exit 1
fi

# Function to wait for stack operation
wait_for_stack_operation() {
    local stack_name=$1
    local operation=$2
    
    echo "⏳ Waiting for $operation to complete..."
    aws cloudformation wait stack-$operation-complete --stack-name $stack_name
    
    if [ $? -eq 0 ]; then
        echo "✅ $operation completed successfully!"
    else
        echo "❌ $operation failed!"
        exit 1
    fi
}

# Function to check if stack exists
stack_exists() {
    local stack_name=$1
    aws cloudformation describe-stacks --stack-name $stack_name >/dev/null 2>&1
}

# Function to get stack status
get_stack_status() {
    local stack_name=$1
    aws cloudformation describe-stacks --stack-name $stack_name --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND"
}

echo "🔍 Checking current stack status..."
if stack_exists "memory-finder-prod"; then
    current_status=$(get_stack_status "memory-finder-prod")
    echo "📋 Current stack status: $current_status"
    
    if [ "$current_status" != "CREATE_COMPLETE" ] && [ "$current_status" != "UPDATE_COMPLETE" ]; then
        echo "⚠️  Stack is not in a stable state. Deleting existing stack..."
        aws cloudformation delete-stack --stack-name memory-finder-prod
        wait_for_stack_operation "memory-finder-prod" "delete"
    else
        echo "🔄 Updating existing stack..."
        aws cloudformation update-stack \
            --stack-name memory-finder-prod \
            --template-body file://infrastructure/memory-finder-infrastructure.yaml \
            --parameters ParameterKey=Environment,ParameterValue=prod \
                       ParameterKey=DomainName,ParameterValue=memory-finder.com \
                       ParameterKey=AdminEmail,ParameterValue=admin@memory-finder.com \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
        
        wait_for_stack_operation "memory-finder-prod" "update-complete"
        echo "✅ Stack updated successfully!"
        exit 0
    fi
fi

echo ""
echo "🧹 Running cleanup script..."
if [ -f "scripts/cleanup-aws-resources.sh" ]; then
    chmod +x scripts/cleanup-aws-resources.sh
    echo "⚠️  This will delete all existing Memory Finder resources!"
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read
    
    # Run cleanup script
    ./scripts/cleanup-aws-resources.sh
else
    echo "⚠️  Cleanup script not found. Proceeding with deployment..."
fi

echo ""
echo "🏗️  Deploying fresh CloudFormation stack..."

# Generate a secure database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Deploy the CloudFormation stack
aws cloudformation create-stack \
    --stack-name memory-finder-prod \
    --template-body file://infrastructure/memory-finder-infrastructure.yaml \
    --parameters ParameterKey=Environment,ParameterValue=prod \
                 ParameterKey=DomainName,ParameterValue=memory-finder.com \
                 ParameterKey=AdminEmail,ParameterValue=admin@memory-finder.com \
                 ParameterKey=DatabasePassword,ParameterValue=$DB_PASSWORD \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --tags Key=Project,Value=MemoryFinder Key=Environment,Value=prod

echo "⏳ Stack creation initiated. This may take 10-15 minutes..."

# Wait for stack creation to complete
wait_for_stack_operation "memory-finder-prod" "create-complete"

echo ""
echo "🎉 Memory Finder infrastructure deployed successfully!"
echo ""

# Display stack outputs
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name memory-finder-prod \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""
echo "🔧 Next Steps:"
echo "1. Update your .env.local with the new database credentials"
echo "2. Deploy your application code to the infrastructure"
echo "3. Configure DNS to point to the CloudFront distribution"
echo "4. Test the complete video processing pipeline"
echo ""

# Save database password to a secure file
echo "💾 Saving database password to .env.aws..."
cat > .env.aws << EOF
# Memory Finder AWS Infrastructure
AWS_REGION=$(aws configure get region)
DATABASE_HOST=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text)
DATABASE_NAME=memoryfinder
DATABASE_USER=memoryfinder
DATABASE_PASSWORD=$DB_PASSWORD
REDIS_HOST=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' --output text)
RAW_VIDEO_BUCKET=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`RawVideoBucketName`].OutputValue' --output text)
PROCESSED_VIDEO_BUCKET=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`ProcessedVideoBucketName`].OutputValue' --output text)
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionDomain`].OutputValue' --output text)
MEDIACONVERT_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`MediaConvertRoleArn`].OutputValue' --output text)
LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' --output text)
STEP_FUNCTIONS_ARN=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].Outputs[?OutputKey==`StepFunctionsStateMachineArn`].OutputValue' --output text)
EOF

echo "✅ Database password saved to .env.aws"
echo "🔒 Keep this file secure and never commit it to version control!"
echo ""
echo "🎯 Memory Finder infrastructure is ready for deployment!"
