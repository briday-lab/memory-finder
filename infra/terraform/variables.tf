variable "aws_region" { type = string default = "us-east-2" }
variable "s3_raw_bucket" { type = string }
variable "s3_proxies_bucket" { type = string }
variable "s3_thumbnails_bucket" { type = string }
variable "s3_analysis_bucket" { type = string }
variable "s3_exports_bucket" { type = string }

variable "vpc_subnets" { type = list(string) }
variable "vpc_security_group" { type = string }

# Lambda/Service ARNs (placeholders to wire actual functions)
variable "lambda_init_arn" { type = string }
variable "mediaconvert_lambda_arn" { type = string }
variable "lambda_thumbnails_arn" { type = string }
variable "transcribe_lambda_arn" { type = string }
variable "lambda_fetch_transcript_arn" { type = string }
variable "lambda_shotdetect_arn" { type = string }
variable "lambda_visionlabels_arn" { type = string }
variable "lambda_faces_arn" { type = string }
variable "lambda_keyframes_arn" { type = string }
variable "lambda_build_segments_arn" { type = string }
variable "batch_submit_lambda_arn" { type = string }
variable "lambda_persist_metadata_arn" { type = string }
variable "lambda_notify_arn" { type = string }
