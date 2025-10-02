#!/bin/bash

# Memory Finder Production Monitoring Script
# Monitors production deployment and health

set -e

APP_ID="d25s4o2tenvmk9"
BRANCH="main"
DOMAIN="memoryfinder.org"

echo "🔍 Memory Finder Production Monitor"
echo "=================================="

# Function to check deployment status
check_deployment() {
    local job_id=$(aws amplify list-jobs --app-id $APP_ID --branch-name $BRANCH --max-items 1 --query 'jobSummaries[0].jobId' --output text)
    local status=$(aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $job_id --query 'job.summary.status' --output text)
    
    echo "📋 Latest Job: $job_id"
    echo "📊 Status: $status"
    
    if [ "$status" = "SUCCEED" ]; then
        echo "✅ Deployment successful!"
        return 0
    elif [ "$status" = "FAILED" ]; then
        echo "❌ Deployment failed!"
        # Get build logs
        aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $job_id --query 'job.steps[?stepName==`BUILD`].logUrl' --output text
        return 1
    else
        echo "🔄 Deployment in progress..."
        return 2
    fi
}

# Function to check application health
check_health() {
    echo ""
    echo "🏥 Health Check"
    echo "==============="
    
    local health_url="https://$DOMAIN/api/health"
    
    if curl -f -s "$health_url" > /dev/null; then
        echo "✅ Application is healthy"
        curl -s "$health_url" | jq '.status, .services'
        return 0
    else
        echo "❌ Application health check failed"
        return 1
    fi
}

# Function to check domain status
check_domain() {
    echo ""
    echo "🌐 Domain Status"
    echo "==============="
    
    local domain_status=$(aws amplify get-domain-association --app-id $APP_ID --domain-name $DOMAIN --query 'domainAssociation.domainStatus' --output text)
    echo "📊 Domain Status: $domain_status"
    
    if [ "$domain_status" = "AVAILABLE" ]; then
        echo "✅ Domain is active"
        return 0
    else
        echo "⚠️ Domain is not fully active yet"
        return 1
    fi
}

# Function to run performance check
check_performance() {
    echo ""
    echo "⚡ Performance Check"
    echo "==================="
    
    # Simple response time check
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "https://$DOMAIN")
    echo "📊 Response Time: ${response_time}s"
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        echo "✅ Performance is good"
        return 0
    else
        echo "⚠️ Performance may need attention"
        return 1
    fi
}

# Main monitoring function
main() {
    echo "🕐 $(date)"
    echo ""
    
    # Check deployment
    check_deployment
    local deploy_status=$?
    
    if [ $deploy_status -eq 0 ]; then
        # If deployment is successful, run health checks
        check_health
        check_domain
        check_performance
        
        echo ""
        echo "🎉 All systems operational!"
        
    elif [ $deploy_status -eq 1 ]; then
        echo ""
        echo "🚨 Deployment failed - manual intervention required"
        exit 1
        
    else
        echo ""
        echo "⏳ Deployment in progress - will check again in 30 seconds"
        sleep 30
        main
    fi
}

# Run continuous monitoring if --watch flag is provided
if [ "$1" = "--watch" ]; then
    echo "👀 Starting continuous monitoring..."
    while true; do
        main
        echo ""
        echo "⏰ Next check in 5 minutes..."
        sleep 300
    done
else
    main
fi
