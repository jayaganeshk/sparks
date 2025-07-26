output "sparks_store_bucket_name" {
  description = "The name of the S3 bucket for storing images."
  value       = aws_s3_bucket.sparks_store.id
}

output "sparks_store_bucket_arn" {
  description = "The ARN of the S3 bucket for storing images."
  value       = aws_s3_bucket.sparks_store.arn
}

output "logs_bucket_name" {
  description = "The domain name of the S3 bucket for CloudFront logs."
  value       = aws_s3_bucket.logs.bucket_domain_name
}

output "sparks_store_bucket_domain_name" {
  description = "The domain name of the S3 bucket for storing images."
  value       = aws_s3_bucket.sparks_store.bucket_domain_name
}


