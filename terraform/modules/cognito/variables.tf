variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "environment" {
  description = "The environment for the resources."
  type        = string
}

variable "user_pool_domain" {
  description = "Domain for the Cognito User Pool hosted UI."
  type        = string
}

variable "post_confirmation_lambda_arn" {
  description = "The ARN of the Lambda function for post-confirmation triggers."
  type        = string
}

variable "post_confirmation_lambda_name" {
  description = "The name of the Lambda function for post-confirmation triggers."
  type        = string
}

variable "ui_callback_url" {
  description = "The callback URL for the production UI."
  type        = string
}

variable "authenticated_role_arn" {
  description = "The ARN of the IAM role for authenticated users."
  type        = string
}

# Custom domain variables
variable "enable_custom_domain" {
  description = "Whether to use custom domain for Cognito."
  type        = bool
  default     = false
}

variable "cognito_custom_domain" {
  description = "The custom domain for Cognito User Pool."
  type        = string
  default     = ""
}

variable "cognito_certificate_arn" {
  description = "The ARN of the ACM certificate for the Cognito custom domain."
  type        = string
  default     = ""
}

variable "cognito_certificate_validation" {
  description = "Certificate validation dependency."
  type        = any
  default     = null
}

# SES configuration for custom email
variable "ses_identity_arn" {
  description = "The ARN of the SES identity for sending emails."
  type        = string
  default     = ""
}

variable "from_email_address" {
  description = "The email address to send emails from."
  type        = string
  default     = ""
}

# Custom email templates
variable "verification_email_subject" {
  description = "Subject for verification email."
  type        = string
  default     = "Your Sparks verification code"
}

variable "verification_email_message" {
  description = "Message for verification email."
  type        = string
  default     = "Welcome to Sparks! Your verification code is {####}. Enter this code to complete your account setup and start organizing your event photos with AI-powered face recognition."
}

variable "verification_email_subject_by_link" {
  description = "Subject for verification email with link."
  type        = string
  default     = "Verify your Sparks account"
}

variable "verification_email_message_by_link" {
  description = "Message for verification email with link."
  type        = string
  default     = "Welcome to Sparks! Click the link below to verify your account and start organizing your event photos with AI-powered face recognition: {##Verify Email##}"
}

variable "ses_domain_verification" {
  description = "SES domain verification dependency (for ensuring domain is verified before use)."
  type        = any
  default     = null
}
