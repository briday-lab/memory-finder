#!/bin/bash

# Fix Production Credentials for Memory Finder
# This script creates proper IAM roles and policies for production S3 access

set -e

echo "🔧 Fixing Production Credentials"
echo "================================"

# Create IAM policy for S3 access
echo "📝 Creating S3 access policy..."
aws iam create-policy \
  --policy-name MemoryFinderS3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetObjectVersion"
        ],
        "Resource": [
          "arn:aws:s3:::memory-finder-raw-120915929747-us-east-2",
          "arn:aws:s3:::memory-finder-raw-120915929747-us-east-2/*",
          "arn:aws:s3:::memory-finder-processed-120915929747-us-east-2",
          "arn:aws:s3:::memory-finder-processed-120915929747-us-east-2/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetBucketLocation",
          "s3:ListAllMyBuckets"
        ],
        "Resource": "*"
      }
    ]
  }' \
  --description "S3 access policy for Memory Finder application" \
  || echo "Policy already exists"

# Attach policy to Amplify backend role
echo "🔗 Attaching policy to Amplify backend role..."
aws iam attach-role-policy \
  --role-name amplifyconsole-backend-role \
  --policy-arn "arn:aws:iam::120915929747:policy/MemoryFinderS3Access" \
  || echo "Policy already attached"

# Create Lambda execution role for API functions
echo "🚀 Creating Lambda execution role..."
aws iam create-role \
  --role-name MemoryFinderLambdaExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --description "Lambda execution role for Memory Finder API functions" \
  || echo "Role already exists"

# Attach AWS managed policies to Lambda role
echo "📎 Attaching managed policies..."
aws iam attach-role-policy \
  --role-name MemoryFinderLambdaExecutionRole \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  || echo "Basic execution policy already attached"

aws iam attach-role-policy \
  --role-name MemoryFinderLambdaExecutionRole \
  --policy-arn "arn:aws:iam::120915929747:policy/MemoryFinderS3Access" \
  || echo "S3 access policy already attached"

# Update Amplify app to use the new environment variables
echo "🔧 Updating Amplify environment variables..."
aws amplify update-app \
  --app-id d25s4o2tenvmk9 \
  --environment-variables \
    "AWS_REGION=us-east-2" \
    "S3_RAW_BUCKET=memory-finder-raw-120915929747-us-east-2" \
    "S3_PROCESSED_BUCKET=memory-finder-processed-120915929747-us-east-2" \
    "NODE_ENV=production"

echo ""
echo "✅ Production credentials configuration complete!"
echo ""
echo "📋 Summary:"
echo "- Created MemoryFinderS3Access IAM policy"
echo "- Attached policy to amplifyconsole-backend-role"
echo "- Created MemoryFinderLambdaExecutionRole"
echo "- Updated Amplify environment variables"
echo ""
echo "🔄 Next: Trigger a new deployment to apply changes"
