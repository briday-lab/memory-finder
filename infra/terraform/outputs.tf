output "raw_bucket" { value = aws_s3_bucket.raw.id }
output "analysis_bucket" { value = aws_s3_bucket.analysis.id }
output "exports_bucket" { value = aws_s3_bucket.exports.id }
output "state_machine_arn" { value = aws_sfn_state_machine.ingest.arn }
output "batch_job_queue" { value = aws_batch_job_queue.q.name }
