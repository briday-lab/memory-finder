#!/bin/bash

# Memory Finder AWS Cleanup Script
# This script removes all existing AWS resources for a fresh start

set -e

echo "🧹 Starting AWS Resource Cleanup for Memory Finder..."
echo "Account: $(aws sts get-caller-identity --query Account --output text)"
echo "Region: $(aws configure get region)"
echo ""

# Function to check if resource exists
check_resource() {
    local resource_type=$1
    local resource_name=$2
    local command=$3
    
    if eval "$command" >/dev/null 2>&1; then
        echo "✅ Found $resource_type: $resource_name"
        return 0
    else
        echo "❌ $resource_type not found: $resource_name"
        return 1
    fi
}

# Function to delete S3 bucket and all contents
delete_s3_bucket() {
    local bucket_name=$1
    echo "🗑️  Deleting S3 bucket: $bucket_name"
    
    # Delete all objects in bucket
    aws s3 rm s3://$bucket_name --recursive --quiet || echo "No objects to delete"
    
    # Delete bucket
    aws s3api delete-bucket --bucket $bucket_name || echo "Bucket deletion failed"
    echo "✅ S3 bucket deleted: $bucket_name"
}

# Function to delete RDS instance
delete_rds_instance() {
    local db_instance_id=$1
    echo "🗑️  Deleting RDS instance: $db_instance_id"
    
    aws rds delete-db-instance \
        --db-instance-identifier $db_instance_id \
        --skip-final-snapshot \
        --delete-automated-backups || echo "RDS deletion failed"
    
    echo "✅ RDS instance deletion initiated: $db_instance_id"
}

# Function to delete Lambda functions
delete_lambda_functions() {
    echo "🗑️  Deleting Lambda functions..."
    
    aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `memory-finder`)].FunctionName' --output text | while read function_name; do
        if [ ! -z "$function_name" ]; then
            echo "Deleting Lambda function: $function_name"
            aws lambda delete-function --function-name $function_name || echo "Lambda deletion failed"
        fi
    done
}

# Function to delete IAM roles
delete_iam_roles() {
    echo "🗑️  Deleting IAM roles..."
    
    aws iam list-roles --query 'Roles[?starts_with(RoleName, `MemoryFinder`)].RoleName' --output text | while read role_name; do
        if [ ! -z "$role_name" ]; then
            echo "Deleting IAM role: $role_name"
            
            # Detach policies
            aws iam list-attached-role-policies --role-name $role_name --query 'AttachedPolicies[].PolicyArn' --output text | while read policy_arn; do
                if [ ! -z "$policy_arn" ]; then
                    aws iam detach-role-policy --role-name $role_name --policy-arn $policy_arn || echo "Policy detach failed"
                fi
            done
            
            # Delete role
            aws iam delete-role --role-name $role_name || echo "Role deletion failed"
        fi
    done
}

# Function to delete CloudFormation stacks
delete_cloudformation_stacks() {
    echo "🗑️  Deleting CloudFormation stacks..."
    
    aws cloudformation list-stacks --query 'StackSummaries[?StackStatus != `DELETE_COMPLETE` && contains(StackName, `memory-finder`)].StackName' --output text | while read stack_name; do
        if [ ! -z "$stack_name" ]; then
            echo "Deleting CloudFormation stack: $stack_name"
            aws cloudformation delete-stack --stack-name $stack_name || echo "Stack deletion failed"
        fi
    done
}

# Main cleanup process
echo "🔍 Checking existing resources..."

# List current resources
echo ""
echo "📋 Current S3 Buckets:"
aws s3 ls | grep memory-finder || echo "No memory-finder buckets found"

echo ""
echo "📋 Current RDS Instances:"
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `memory-finder`)].DBInstanceIdentifier' --output table || echo "No memory-finder RDS instances found"

echo ""
echo "📋 Current Lambda Functions:"
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `memory-finder`)].FunctionName' --output table || echo "No memory-finder Lambda functions found"

echo ""
echo "📋 Current IAM Roles:"
aws iam list-roles --query 'Roles[?starts_with(RoleName, `MemoryFinder`)].RoleName' --output table || echo "No MemoryFinder IAM roles found"

echo ""
echo "📋 Current CloudFormation Stacks:"
aws cloudformation list-stacks --query 'StackSummaries[?StackStatus != `DELETE_COMPLETE` && contains(StackName, `memory-finder`)].StackName' --output table || echo "No memory-finder CloudFormation stacks found"

echo ""
echo "🚨 WARNING: This will delete ALL Memory Finder resources!"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Start cleanup
echo ""
echo "🧹 Starting cleanup process..."

# Delete S3 buckets
echo ""
echo "🗑️  Deleting S3 buckets..."
aws s3 ls | grep memory-finder | awk '{print $3}' | while read bucket_name; do
    delete_s3_bucket $bucket_name
done

# Delete RDS instance
echo ""
echo "🗑️  Deleting RDS instance..."
if check_resource "RDS instance" "memory-finder-db" "aws rds describe-db-instances --db-instance-identifier memory-finder-db"; then
    delete_rds_instance "memory-finder-db"
fi

# Delete Lambda functions
echo ""
delete_lambda_functions

# Delete IAM roles
echo ""
delete_iam_roles

# Delete CloudFormation stacks
echo ""
delete_cloudformation_stacks

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "📋 Final verification:"
echo "S3 buckets:"
aws s3 ls | grep memory-finder || echo "No memory-finder buckets remaining"

echo ""
echo "RDS instances:"
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `memory-finder`)].DBInstanceIdentifier' --output table || echo "No memory-finder RDS instances remaining"

echo ""
echo "Lambda functions:"
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `memory-finder`)].FunctionName' --output table || echo "No memory-finder Lambda functions remaining"

echo ""
echo "🎉 AWS cleanup completed successfully!"
echo "Ready for fresh CloudFormation deployment!"
