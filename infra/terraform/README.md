# Memory Finder Infra (Terraform)

## What this provides
- S3 buckets: raw, proxies, thumbnails, analysis, exports
- EventBridge for raw uploads
- IAM roles/policies for Lambda and Step Functions
- Step Functions state machine (skeleton)
- AWS Batch compute env + job queue (Fargate)

## Prereqs
- AWS credentials with permissions (S3, IAM, Step Functions, Batch, MediaConvert)
- VPC subnet IDs and a security group ID (for Batch Fargate)
- Deployed Lambda functions (temporary: use provided handlers with ZIPs and pass ARNs to TF vars)

## Usage
```bash
cd infra/terraform
cat > terraform.tfvars <<EOV
aws_region = "us-east-2"
s3_raw_bucket        = "memory-finder-raw"
s3_proxies_bucket    = "memory-finder-proxies"
s3_thumbnails_bucket = "memory-finder-thumbnails"
s3_analysis_bucket   = "memory-finder-analysis"
s3_exports_bucket    = "memory-finder-exports"

vpc_subnets        = ["subnet-xxxxxxxx", "subnet-yyyyyyyy"]
vpc_security_group = "sg-zzzzzzzz"

lambda_init_arn                 = "arn:aws:lambda:...:function:InitJob"
mediaconvert_lambda_arn         = "arn:aws:lambda:...:function:CreateProxies"
lambda_thumbnails_arn           = "arn:aws:lambda:...:function:GenerateThumbnails"
transcribe_lambda_arn           = "arn:aws:lambda:...:function:StartTranscribe"
lambda_fetch_transcript_arn     = "arn:aws:lambda:...:function:FetchTranscript"
lambda_shotdetect_arn           = "arn:aws:lambda:...:function:ShotDetect"
lambda_visionlabels_arn         = "arn:aws:lambda:...:function:VisionLabels"
lambda_faces_arn                = "arn:aws:lambda:...:function:FaceIndex"
lambda_keyframes_arn            = "arn:aws:lambda:...:function:ExtractKeyframes"
lambda_build_segments_arn       = "arn:aws:lambda:...:function:BuildSegments"
batch_submit_lambda_arn         = "arn:aws:lambda:...:function:SubmitEmbeddingsBatch"
lambda_persist_metadata_arn     = "arn:aws:lambda:...:function:PersistMetadata"
lambda_notify_arn               = "arn:aws:lambda:...:function:NotifyComplete"
EOV

terraform init
terraform plan
terraform apply
```

## Next steps
- Package Lambda handlers in `handlers/` as ZIPs and deploy (SAM/Serverless/CDK/TF), then wire ARNs in terraform.tfvars.
- Add MediaConvert templates/presets as IaC (optional).
- Add Rekognition Collection creation for face indexing.
- Add Secrets Manager entries for DB credentials and read from there.
