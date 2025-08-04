variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "lambda_invoke_arn" {
  description = "The ARN of the Lambda function to invoke."
  type        = string
}

variable "lambda_function_name" {
  description = "The name of the Lambda function."
  type        = string
}

variable "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool."
  type        = string
}

variable "user_pool_client_id" {
  description = "The client ID of the Cognito User Pool."
  type        = string
}

variable "enable_custom_domain" {
  description = "Whether to use a custom domain for the API Gateway."
  type        = bool
  default     = false
}

variable "api_custom_domain" {
  description = "The custom domain for the API Gateway."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the custom domain."
  type        = string
  default     = ""
}
