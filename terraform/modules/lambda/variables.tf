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

variable "face_recognition_queue_arn" {
  description = "The ARN of the SQS queue for face recognition."
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

variable "enable_custom_domain" {
  description = "Whether to use custom domains for all distributions."
  type        = bool
  default     = false
}

variable "assets_custom_domain" {
  description = "The custom domain for the assets distribution."
  type        = string
  default     = ""
}

variable "ui_custom_domain" {
  description = "The custom domain for the UI distribution."
  type        = string
  default     = ""
}

variable "face_recognition_image_uri" {
  description = "The URI of the container image for the face recognition Lambda."
  type        = string
}

variable "face_recognition_source_path" {
  description = "The source path for the face recognition Lambda (for packaging)."
  type        = string
}

variable "thumbnail_generation_queue_arn" {
  description = "The ARN of the SQS queue for thumbnail generation."
  type        = string
}

variable "pinecone_api_env" {
  description = "Environment for Pinecone."
  type        = string
}

variable "pinecone_index_name" {
  description = "Index name for Pinecone."
  type        = string
}

variable "pinecone_ssm_parameter_name" {
  description = "The name of the SSM parameter storing the Pinecone API key."
  type        = string
}

variable "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool."
  type        = string
}

variable "cognito_client_id" {
  description = "The ID of the Cognito User Pool Client."
  type        = string
}

variable "aws_region" {
  description = "The AWS region where resources are deployed."
  type        = string
}

variable "thumbnail_completion_topic_arn" {
  description = "The ARN of the SNS topic for thumbnail completion events."
  type        = string
}

variable "cloudfront_key_pair_id" {
  description = "The ID of the CloudFront key pair used for URL signing."
  type        = string
}

variable "cloudfront_private_key_param" {
  description = "The name of the SSM parameter storing the CloudFront private key."
  type        = string

}

variable "default_upload_limit" {
  description = "The default upload limit for new users."
  type        = string
  default     = "500"
}
