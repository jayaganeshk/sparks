variable "prefix" {
  description = "Prefix to be added to all resources."
  type        = string
}

variable "environment" {
  description = "The environment for the resources."
  type        = string
}

variable "aws_region" {
  description = "The AWS region for the resources."
  type        = string
}

variable "tf_state_s3_bucket" {
  description = "The S3 bucket name for storing Terraform state."
  type        = string
}

variable "default_upload_limit" {
  description = "The default upload limit for new users."
  type        = string
  default     = "500"
}

variable "tf_state_s3_key" {
  description = "The S3 key for storing Terraform state."
  type        = string
}

variable "user_pool_domain" {
  description = "Domain for the Cognito User Pool hosted UI."
  type        = string
}

variable "image_uri_for_face_recognition" {
  description = "The URI of the custom container image for the face recognition Lambda function."
  type        = string
}

variable "enable_custom_domain" {
  description = "Whether to use custom domains for all distributions (UI, API, assets)."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "The base domain name for all distributions (e.g., sparks.deonte.in)."
  type        = string
  default     = ""
}

variable "ui_custom_domain" {
  description = "The custom domain for the UI distribution. If not provided, will be constructed from domain_name and environment."
  type        = string
  default     = ""
}

variable "api_custom_domain" {
  description = "The custom domain for the API Gateway. If not provided, will be constructed from domain_name and environment."
  type        = string
  default     = ""
}

variable "assets_custom_domain" {
  description = "The custom domain for the assets distribution. If not provided, will be constructed from domain_name and environment."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "The ID of the Route 53 hosted zone for the domain."
  type        = string
  default     = ""
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
  default     = "/pinecone/sparks"
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the custom domains. Required when enable_custom_domain is true."
  type        = string
  default     = ""
}

variable "cleanup_schedule_enabled" {
  description = "Whether the cleanup schedule should be enabled (runs every 12 hours)."
  type        = bool
  default     = false
}

variable "cognito_custom_domain" {
  description = "The custom domain for the Cognito User Pool. If not provided, will be constructed from domain_name and environment."
  type        = string
  default     = ""
}

variable "from_email_address" {
  description = "The email address to send Cognito emails from when using custom domain."
  type        = string
  default     = ""
}

variable "domain_name_for_cogntio" {
  description = "The domain name to use for Cognito email sending (can be different from the main domain)."
  type        = string
  default     = ""
}


# Provisioned Concurrency (Express API)
variable "enable_provisioned_capacity" {
  description = "Enable provisioned concurrency for the Express API Lambda."
  type        = bool
  default     = false
}

variable "provisioned_capacity_value" {
  description = "Number of provisioned concurrent executions for Express API Lambda when enabled."
  type        = number
  default     = 3
}

# Face Recognition engine selection
variable "use_aws_rekognition_service" {
  description = "If true, deploy and use the AWS Rekognition-based Lambda; otherwise use the custom face recognition container."
  type        = bool
  default     = true
}
