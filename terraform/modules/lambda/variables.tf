variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "lambda_exec_role_arn" {
  description = "The ARN of the IAM role for Lambda execution."
  type        = string
}

variable "dynamodb_table_name" {
  description = "The name of the DynamoDB table."
  type        = string
}

variable "face_recognition_queue_url" {
  description = "The URL of the SQS queue for face recognition."
  type        = string
}

variable "thumbnail_bucket_name" {
  description = "The name of the S3 bucket to store thumbnails."
  type        = string
}

variable "cloudfront_domain_name" {
  description = "The domain name of the image CloudFront distribution."
  type        = string
}

variable "ui_distribution_domain_name" {
  description = "The domain name of the UI CloudFront distribution for CORS."
  type        = string
}

variable "face_recognition_image_uri" {
  description = "The URI of the container image for the face recognition Lambda."
  type        = string
}

variable "face_recognition_source_path" {
  description = "The source path for the face recognition Lambda (for packaging)."
  type        = string
}

variable "pinecone_api_key" {
  description = "API key for Pinecone."
  type        = string
  sensitive   = true
}

variable "pinecone_api_env" {
  description = "Environment for Pinecone."
  type        = string
}

variable "pinecone_index_name" {
  description = "Index name for Pinecone."
  type        = string
}
