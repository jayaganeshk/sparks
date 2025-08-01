variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "s3_bucket_arn" {
  description = "The ARN of the S3 bucket that will publish to the SNS topic."
  type        = string
}

variable "lambda_execution_role_arn" {
  description = "The ARN of the Lambda execution role that will publish to SNS topics."
  type        = string
}
