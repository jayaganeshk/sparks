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

variable "use_custom_domain_for_ui" {
  description = "Whether to use a custom domain for the UI distribution."
  type        = bool
  default     = true
}

variable "ui_custom_domain" {
  description = "The custom domain for the UI distribution."
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
  default     = "/pinecone/sparks"
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the custom domain."
  type        = string
  default     = ""
}

