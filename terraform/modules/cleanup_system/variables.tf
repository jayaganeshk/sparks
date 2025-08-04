variable "prefix" {
  description = "Prefix to be added to all resources"
  type        = string
}

variable "environment" {
  description = "The environment for the resources"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "The AWS region for the resources"
  type        = string
}

variable "cleanup_schedule_enabled" {
  description = "Whether the cleanup schedule should be enabled"
  type        = bool
  default     = false
}

variable "lambda_exec_role_arn" {
  description = "ARN of the Lambda execution role"
  type        = string
}

variable "lambda_exec_role_name" {
  description = "Name of the Lambda execution role"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  type        = string
}

variable "pinecone_index_name" {
  description = "Name of the Pinecone index"
  type        = string
}

variable "pinecone_ssm_parameter_name" {
  description = "Name of the SSM parameter storing the Pinecone API key"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for asset invalidation"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution for asset invalidation"
  type        = string
}
