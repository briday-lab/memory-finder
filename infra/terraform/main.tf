terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Buckets
resource "aws_s3_bucket" "raw" { bucket = var.s3_raw_bucket }
resource "aws_s3_bucket" "proxies" { bucket = var.s3_proxies_bucket }
resource "aws_s3_bucket" "thumbnails" { bucket = var.s3_thumbnails_bucket }
resource "aws_s3_bucket" "analysis" { bucket = var.s3_analysis_bucket }
resource "aws_s3_bucket" "exports" { bucket = var.s3_exports_bucket }

# EventBridge rule for raw uploads
resource "aws_s3_bucket_notification" "raw_events" {
  bucket = aws_s3_bucket.raw.id
  eventbridge = true
}

resource "aws_iam_role" "lambda_exec" {
  name = "memory-finder-lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "memory-finder-lambda-policy"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"], Resource = "*" },
      { Effect = "Allow", Action = ["s3:*"], Resource = [
          aws_s3_bucket.raw.arn, "${aws_s3_bucket.raw.arn}/*",
          aws_s3_bucket.proxies.arn, "${aws_s3_bucket.proxies.arn}/*",
          aws_s3_bucket.thumbnails.arn, "${aws_s3_bucket.thumbnails.arn}/*",
          aws_s3_bucket.analysis.arn, "${aws_s3_bucket.analysis.arn}/*",
          aws_s3_bucket.exports.arn, "${aws_s3_bucket.exports.arn}/*"
      ]},
      { Effect = "Allow", Action = ["states:StartExecution","states:SendTaskSuccess","states:SendTaskFailure"], Resource = "*" },
      { Effect = "Allow", Action = ["mediaconvert:*","transcribe:*","rekognition:*","batch:SubmitJob"], Resource = "*" }
    ]
  })
}

# Step Functions state machine (skeleton)
resource "aws_iam_role" "sfn_role" {
  name = "memory-finder-sfn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Effect = "Allow", Principal = { Service = "states.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "sfn_policy" {
  name = "memory-finder-sfn-policy"
  role = aws_iam_role.sfn_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = ["lambda:InvokeFunction"], Resource = "*" },
      { Effect = "Allow", Action = ["mediaconvert:*","transcribe:*","rekognition:*","batch:SubmitJob","events:PutTargets","events:PutRule","events:DescribeRule"], Resource = "*" },
      { Effect = "Allow", Action = ["s3:*"], Resource = "*" }
    ]
  })
}

locals {
  sfn_definition = jsonencode({
    Comment = "Memory Finder - Ingest and Analysis",
    StartAt = "Initialize",
    States = {
      Initialize = { Type = "Task", Resource = var.lambda_init_arn, Next = "FanOut" },
      FanOut = {
        Type = "Parallel",
        Branches = [
          { StartAt = "CreateProxies", States = { CreateProxies = { Type = "Task", Resource = var.mediaconvert_lambda_arn, Next = "Thumbnails" }, Thumbnails = { Type = "Task", Resource = var.lambda_thumbnails_arn, End = true } } },
          { StartAt = "Transcribe", States = { Transcribe = { Type = "Task", Resource = var.transcribe_lambda_arn, Next = "Wait1" }, Wait1 = { Type = "Wait", Seconds = 30, Next = "FetchTranscript" }, FetchTranscript = { Type = "Task", Resource = var.lambda_fetch_transcript_arn, End = true } } },
          { StartAt = "ShotDetect", States = { ShotDetect = { Type = "Task", Resource = var.lambda_shotdetect_arn, Next = "VisionLabels" }, VisionLabels = { Type = "Task", Resource = var.lambda_visionlabels_arn, Next = "Faces" }, Faces = { Type = "Task", Resource = var.lambda_faces_arn, Next = "Keyframes" }, Keyframes = { Type = "Task", Resource = var.lambda_keyframes_arn, End = true } } }
        ],
        Next = "BuildSegments"
      },
      BuildSegments = { Type = "Task", Resource = var.lambda_build_segments_arn, Next = "EmbedSegments" },
      EmbedSegments = { Type = "Task", Resource = var.batch_submit_lambda_arn, Next = "PersistMetadata" },
      PersistMetadata = { Type = "Task", Resource = var.lambda_persist_metadata_arn, Next = "NotifyComplete" },
      NotifyComplete = { Type = "Task", Resource = var.lambda_notify_arn, End = true }
    }
  })
}

resource "aws_sfn_state_machine" "ingest" {
  name       = "memory-finder-ingest"
  role_arn   = aws_iam_role.sfn_role.arn
  definition = local.sfn_definition
}

# AWS Batch minimal skeleton
resource "aws_iam_role" "batch_service" {
  name = "memory-finder-batch-service"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Effect = "Allow", Principal = { Service = "batch.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_batch_compute_environment" "cpu_env" {
  compute_environment_name = "memory-finder-cpu"
  type                     = "MANAGED"
  compute_resources {
    max_vcpus          = 16
    type               = "FARGATE"
    subnets            = var.vpc_subnets
    security_group_ids = [var.vpc_security_group]
  }
  service_role = aws_iam_role.batch_service.arn
}

resource "aws_batch_job_queue" "q" {
  name                 = "memory-finder-queue"
  state                = "ENABLED"
  priority             = 1
  compute_environments = [aws_batch_compute_environment.cpu_env.arn]
}

output "state_machine_arn" { value = aws_sfn_state_machine.ingest.arn }
