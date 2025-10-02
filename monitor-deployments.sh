#!/bin/bash

# Continuous Deployment Monitor for Memory Finder
# This script monitors AWS Amplify deployments and alerts on failures

APP_ID="d25s4o2tenvmk9"
BRANCH="main"
LAST_JOB_ID=""

echo "🚀 Starting continuous deployment monitoring for Memory Finder..."
echo "📍 App ID: $APP_ID"
echo "🌿 Branch: $BRANCH"
echo "⏰ Started at: $(date)"
echo "=================="

while true; do
    # Get the latest job ID
    CURRENT_JOB_ID=$(aws amplify list-jobs --app-id $APP_ID --branch-name $BRANCH --max-results 1 --query 'jobSummaries[0].jobId' --output text)
    
    # Check if there's a new deployment
    if [ "$CURRENT_JOB_ID" != "$LAST_JOB_ID" ] && [ "$CURRENT_JOB_ID" != "None" ]; then
        echo ""
        echo "🆕 NEW DEPLOYMENT DETECTED!"
        echo "📋 Job ID: $CURRENT_JOB_ID"
        echo "⏰ Time: $(date)"
        
        LAST_JOB_ID=$CURRENT_JOB_ID
        
        # Monitor this specific job
        while true; do
            STATUS=$(aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $CURRENT_JOB_ID --query 'job.summary.status' --output text)
            
            case $STATUS in
                "RUNNING")
                    echo "🔄 Job $CURRENT_JOB_ID: RUNNING..."
                    ;;
                "SUCCEED")
                    echo "✅ Job $CURRENT_JOB_ID: SUCCEEDED!"
                    echo "🎉 Deployment successful at $(date)"
                    break
                    ;;
                "FAILED")
                    echo "❌ Job $CURRENT_JOB_ID: FAILED!"
                    echo "🚨 DEPLOYMENT FAILURE DETECTED at $(date)"
                    
                    # Get the build log URL
                    LOG_URL=$(aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $CURRENT_JOB_ID --query 'job.steps[0].logUrl' --output text)
                    
                    echo "📋 Build log URL: $LOG_URL"
                    echo "📄 Last 20 lines of build log:"
                    echo "================================"
                    curl -s "$LOG_URL" | tail -20
                    echo "================================"
                    echo "🔧 MANUAL INTERVENTION REQUIRED!"
                    echo "💡 Check the logs above and fix the issue"
                    break
                    ;;
                "CANCELLED")
                    echo "⚠️ Job $CURRENT_JOB_ID: CANCELLED"
                    break
                    ;;
                *)
                    echo "❓ Job $CURRENT_JOB_ID: Unknown status: $STATUS"
                    ;;
            esac
            
            sleep 30
        done
    fi
    
    # Check every 60 seconds for new deployments
    sleep 60
done
