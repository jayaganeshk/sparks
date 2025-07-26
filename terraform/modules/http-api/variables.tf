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
