variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "amplify_app_default_domain" {
  description = "The default domain of the Amplify App."
  type        = string
}

variable "amplify_branch_domain" {
  description = "The domain of the specific Amplify branch (e.g., prod.d1234567890.amplifyapp.com)."
  type        = string
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket for images."
  type        = string
}

variable "s3_bucket_arn" {
  description = "The ARN of the S3 bucket for images."
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "The domain name of the S3 bucket for images."
  type        = string
}

variable "logs_bucket_domain_name" {
  description = "The domain name of the S3 bucket for logs."
  type        = string
}

variable "enable_custom_domain" {
  description = "Whether to use custom domains for all distributions."
  type        = bool
  default     = false
}

variable "ui_custom_domain" {
  description = "The custom domain for the UI distribution."
  type        = string
  default     = ""
}

variable "assets_custom_domain" {
  description = "The custom domain for the assets (image) distribution."
  type        = string
  default     = ""
}

variable "ui_certificate_arn" {
  description = "The ARN of the ACM certificate for the UI custom domain."
  type        = string
  default     = ""
}

variable "assets_certificate_arn" {
  description = "The ARN of the ACM certificate for the assets custom domain."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for custom domains (legacy variable)."
  type        = string
  default     = ""
}
