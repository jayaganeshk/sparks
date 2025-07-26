variable "prefix" {
  description = "Prefix for resource names."
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
