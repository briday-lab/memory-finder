#!/bin/bash

# Setup AWS MediaConvert for Memory Finder
# This script creates the necessary IAM roles and MediaConvert queues

set -e

echo "🎬 Setting up AWS MediaConvert for Memory Finder..."

# Configuration
AWS_REGION="us-east-2"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="MemoryFinder-MediaConvertRole"
QUEUE_NAME="MemoryFinder-Queue"

echo "📋 Configuration:"
echo "  AWS Region: $AWS_REGION"
echo "  Account ID: $ACCOUNT_ID"
echo "  Role Name: $ROLE_NAME"
echo "  Queue Name: $QUEUE_NAME"

# 1. Create IAM Role for MediaConvert
echo "🔐 Creating IAM role for MediaConvert..."

cat > mediaconvert-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

cat > mediaconvert-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::memory-finder-*",
        "arn:aws:s3:::memory-finder-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file://mediaconvert-trust-policy.json \
  --description "Role for Memory Finder MediaConvert jobs"

# Attach the policy
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name MediaConvertPolicy \
  --policy-document file://mediaconvert-policy.json

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
echo "✅ Created IAM role: $ROLE_ARN"

# 2. Create MediaConvert Queue
echo "📺 Creating MediaConvert queue..."

QUEUE_ARN=$(aws mediaconvert create-queue \
  --name $QUEUE_NAME \
  --description "Memory Finder video compilation queue" \
  --pricing-plan "ON_DEMAND" \
  --region $AWS_REGION \
  --query 'Queue.Arn' \
  --output text)

echo "✅ Created MediaConvert queue: $QUEUE_ARN"

# 3. Create S3 bucket for compilations if it doesn't exist
echo "🪣 Creating S3 bucket for compilations..."

BUCKET_NAME="memory-finder-compilations-$ACCOUNT_ID-$AWS_REGION"
if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
  echo "Bucket $BUCKET_NAME already exists"
else
  aws s3 mb "s3://$BUCKET_NAME" --region $AWS_REGION
  echo "✅ Created S3 bucket: $BUCKET_NAME"
fi

# 4. Configure CORS for the compilations bucket
echo "🌐 Configuring CORS for compilations bucket..."

cat > cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration file://cors-config.json

echo "✅ Configured CORS for compilations bucket"

# 5. Generate environment variables
echo "📝 Environment variables for .env.local:"
echo ""
echo "# AWS MediaConvert Configuration"
echo "AWS_REGION=$AWS_REGION"
echo "S3_COMPILATIONS_BUCKET=$BUCKET_NAME"
echo "S3_RAW_BUCKET=memory-finder-raw"
echo "MEDIACONVERT_ROLE_ARN=$ROLE_ARN"
echo "MEDIACONVERT_QUEUE_ARN=$QUEUE_ARN"
echo ""

# 6. Clean up temporary files
rm -f mediaconvert-trust-policy.json mediaconvert-policy.json cors-config.json

echo "🎉 MediaConvert setup complete!"
echo ""
echo "Next steps:"
echo "1. Add the environment variables above to your .env.local file"
echo "2. Deploy the updated application"
echo "3. Test video compilation functionality"
echo ""
echo "MediaConvert is now ready to process video compilations! 🎬"

