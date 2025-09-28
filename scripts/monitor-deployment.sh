#!/bin/bash

# Monitor CloudFormation deployment progress

echo "🔍 Monitoring Memory Finder deployment..."
echo "========================================"

while true; do
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name memory-finder-prod >/dev/null 2>&1; then
        STATUS=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].StackStatus' --output text)
        CREATION_TIME=$(aws cloudformation describe-stacks --stack-name memory-finder-prod --query 'Stacks[0].CreationTime' --output text)
        
        echo "📊 Stack Status: $STATUS"
        echo "⏰ Started: $CREATION_TIME"
        echo "🕐 Current Time: $(date)"
        
        if [ "$STATUS" = "CREATE_COMPLETE" ]; then
            echo "🎉 Deployment completed successfully!"
            break
        elif [ "$STATUS" = "CREATE_FAILED" ]; then
            echo "❌ Deployment failed!"
            aws cloudformation describe-stack-events --stack-name memory-finder-prod --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' --output table
            break
        fi
        
        echo "⏳ Still deploying... (This is normal, RDS takes 10-15 minutes)"
        echo "🔄 Checking again in 30 seconds..."
        sleep 30
    else
        echo "⏳ Stack not found yet, still being created..."
        sleep 10
    fi
done

