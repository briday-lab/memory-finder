// AWS Resources Setup Script for Memory Finder

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Main setup function
async function setupAWSResources() {
    console.log('🚀 Setting up AWS resources for Memory Finder...');
    
    // 1. Create basic infrastructure
    try {
        console.log('📦 Creating S3 Compilations Bucket...');
        await execAsync(`aws s3 mb s3://memory-finder-compilations-${process.env.AWS_ACCOUNT_ID || '120915929747'}-us-east-2`);
        
        console.log('📚 Creating DynamoDB Tables via AWS CLI...');
        // Create projects table
        await execAsync(`aws dynamodb create-table \
            --table-name memory-finder-projects \
            --attribute-definitions AttributeName=id,AttributeType=S \
            --key-schema AttributeName=id,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region us-east-2`);
        
        console.log('✅ AWS resources setup complete!');
        console.log('🌍 Amplify URL: https://d38luherx38o9k.amplifyapp.com');
        
    } catch (error) {
        console.error('⚠️  Setup error:', error.message);
    }
}

setupAWSResources();

