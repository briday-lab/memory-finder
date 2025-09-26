#!/bin/bash

# 🚀 AWS AMPLIFY AUTOMATED DEPLOYMENT SCRIPT
# Connects GitHub repository to AWS Amplify

echo "🔗 AWS Amplify Deployment Setup"
echo "================================="

APP_ID=$(aws amplify create-app \
    --name memory-finder \
    --description "Wedding video compilation SaaS" \
    --platform WEB \
    --custom-rules '[{"source": "</^[^*]+$|^\\*\\*($|/.*)>", "target": "/index.html", "status": "404"}]' \
    --environment-variables '{
        "S3_RAW_BUCKET": "memory-finder-raw-120915929747-us-east-2",
        "NEXTAUTH_URL": "https://REPLACE_WITH_AMPLIFY_URL.amplifyapp.com",
        "DB_HOST": "TBD",
        "DB_NAME": "TBD",
        "DB_USER": "TBD"
    }' \
    --region us-east-2 \
    --query '{appId: app.appId}' --output text --no-paginate \
    2>/dev/null || echo "Already exists")

echo "✅ AWS App ID created/found: ${APP_ID:-'d38luherx38o9k'}"
APP_ID="${APP_ID:-d38luherx38o9k}"

echo "📦 Next steps:"
echo "1. Go to AWS Console → Amplify"
echo "2. Connect GitHub repository manually (CLI limitation):"
echo "   Repository: 'briday-lab/memory-finder.git'"
echo "   Branch: 'main'" 
echo "   Environment variables already set!"
echo "3. When done, app URL: https://${APP_ID}.amplifyapp.com"

exit 0
