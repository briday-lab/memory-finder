# Memory Finder - AWS AI Pipeline Infrastructure

This directory contains the Terraform infrastructure for Memory Finder's AI-powered video processing pipeline.

## Architecture Overview

The infrastructure deploys a complete AWS-based AI pipeline for wedding video processing:

### Core Components

- **S3 Buckets**: 
  - `memory-finder-raw`: Raw video uploads
  - `memory-finder-proxies`: Processed proxy videos
  - `memory-finder-thumbnails`: Video thumbnails and keyframes
  - `memory-finder-analysis`: AI analysis results
  - `memory-finder-exports`: Final processed videos

- **Lambda Functions**:
  - `memory-finder-InitJob`: Initialize processing job
  - `memory-finder-MediaConvert`: Create proxy videos via AWS MediaConvert
  - `memory-finder-Thumbnails`: Extract video thumbnails
  - `memory-finder-Transcribe`: Speech-to-text via AWS Transcribe
  - `memory-finder-FetchTranscript`: Retrieve completed transcripts
  - `memory-finder-ShotDetect`: Detect video shots/scenes
  - `memory-finder-VisionLabels`: Visual content analysis via Rekognition
  - `memory-finder-Faces`: Face detection and analysis
  - `memory-finder-Keyframes`: Extract key video frames
  - `memory-finder-BuildSegments`: Build searchable video segments
  - `memory-finder-BatchSubmit`: Submit embedding generation jobs
  - `memory-finder-PersistMetadata`: Store metadata in database
  - `memory-finder-NotifyComplete`: Send completion notifications

- **Step Functions**: `memory-finder-ingest` - Orchestrates the entire AI pipeline
- **AWS Batch**: `memory-finder-queue` - Handles compute-intensive embedding generation
- **IAM Roles**: Proper permissions for all services

### AI Pipeline Flow

1. **Initialize**: Job setup and validation
2. **Parallel Processing**:
   - **Proxy Generation**: Create optimized proxy videos
   - **Transcription**: Extract speech-to-text with speaker labels
   - **Visual Analysis**: Detect shots, faces, objects, and keyframes
3. **Segment Building**: Combine analysis results into searchable segments
4. **Embedding Generation**: Generate vector embeddings for semantic search
5. **Metadata Persistence**: Store results in PostgreSQL database
6. **Notification**: Alert completion

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0
3. **Node.js** >= 18.x (for Lambda functions)
4. **AWS Account** with permissions to create:
   - Lambda functions
   - Step Functions
   - S3 buckets
   - IAM roles and policies
   - AWS Batch
   - MediaConvert
   - Transcribe
   - Rekognition

## Deployment Steps

### 1. Configure AWS Credentials

```bash
# Set up AWS profile
export AWS_PROFILE=memory-finder
aws configure
```

### 2. Deploy Lambda Functions

```bash
# From project root
cd handlers
chmod +x ../scripts/deploy-lambdas.sh
../scripts/deploy-lambdas.sh
```

### 3. Deploy Infrastructure

```bash
cd infra/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 4. Verify Deployment

```bash
# Check Step Functions state machine
aws stepfunctions list-state-machines --query 'stateMachines[?contains(name, `memory-finder`)]'

# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `memory-finder`)]'

# Check S3 buckets
aws s3 ls | grep memory-finder
```

## Environment Variables

The Lambda functions expect these environment variables:

- `AWS_REGION`: AWS region (automatically set)
- `PROXIES_BUCKET`: S3 bucket for proxy videos
- `THUMBNAILS_BUCKET`: S3 bucket for thumbnails
- `ANALYSIS_BUCKET`: S3 bucket for analysis results
- `BATCH_JOB_QUEUE`: AWS Batch job queue ARN
- `BATCH_JOB_DEFINITION`: AWS Batch job definition ARN

## Testing the Pipeline

1. **Upload a video** to the `memory-finder-raw` bucket
2. **Trigger the Step Functions** state machine with:
   ```json
   {
     "s3Key": "uploads/projectId/filename.mp4",
     "bucket": "memory-finder-raw",
     "projectId": "test-project"
   }
   ```
3. **Monitor execution** in the Step Functions console
4. **Check results** in the respective S3 buckets

## Cost Optimization

- **S3 Lifecycle Rules**: Automatically transition old files to cheaper storage classes
- **Lambda Timeouts**: Set appropriate timeouts to avoid unnecessary charges
- **Batch Spot Instances**: Use spot instances for embedding generation
- **Step Functions**: Pay only for state transitions

## Security Considerations

- **IAM Least Privilege**: Each service has minimal required permissions
- **S3 Bucket Policies**: Restrict access to specific services
- **VPC Configuration**: Batch jobs run in private subnets
- **Encryption**: All data encrypted in transit and at rest

## Troubleshooting

### Common Issues

1. **Lambda Deployment Failures**: Check IAM permissions and function size limits
2. **Step Functions Errors**: Verify Lambda ARNs and payload formats
3. **Batch Job Failures**: Check compute environment status and job definition
4. **S3 Access Denied**: Verify bucket policies and IAM roles

### Logs and Monitoring

- **CloudWatch Logs**: Each Lambda function has its own log group
- **Step Functions**: Execution history available in console
- **Batch Jobs**: Job logs in CloudWatch Logs
- **S3 Access Logs**: Enable if needed for debugging

## Next Steps

1. **Database Integration**: Connect to PostgreSQL for metadata storage
2. **Search API**: Implement semantic search using vector embeddings
3. **Frontend Integration**: Connect to Next.js application
4. **Monitoring**: Set up CloudWatch alarms and dashboards
5. **CI/CD**: Automate deployments with GitHub Actions

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Verify AWS service limits and quotas
3. Review IAM permissions and policies
4. Check Terraform state for resource status