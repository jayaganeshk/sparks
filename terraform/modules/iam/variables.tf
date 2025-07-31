variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB table."
  type        = string
}

variable "s3_bucket_arn" {
  description = "The ARN of the S3 bucket."
  type        = string
}

variable "cognito_identity_pool_id" {
  description = "The ID of the Cognito Identity Pool."
  type        = string
}

variable "pinecone_ssm_parameter_name" {
  description = "The name of the SSM parameter storing the Pinecone API key."
  type        = string
}
